import Coupon from "../models/Coupon.js";
import { buildPaginatedResponse, getPaginationParams } from "../utils/pagination.js";

function normalizeCouponCode(code) {
  return String(code || "")
    .trim()
    .toUpperCase();
}

function validateCouponPayload(body, { partial = false } = {}) {
  const errors = [];
  const discountType = body.discountType;
  const discountValue = Number(body.discountValue);
  const startDate = body.startDate ? new Date(body.startDate) : null;
  const endDate = body.endDate ? new Date(body.endDate) : null;

  if (!partial || body.code !== undefined) {
    if (!normalizeCouponCode(body.code)) {
      errors.push("Coupon code is required");
    }
  }

  if (!partial || body.discountType !== undefined) {
    if (!["percentage", "fixed"].includes(discountType)) {
      errors.push("Discount type must be percentage or fixed");
    }
  }

  if (!partial || body.discountValue !== undefined) {
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      errors.push("Discount value must be zero or greater");
    }
    if (discountType === "percentage" && discountValue > 100) {
      errors.push("Percentage discount cannot exceed 100");
    }
  }

  if (!partial || body.startDate !== undefined || body.endDate !== undefined) {
    if (!startDate || Number.isNaN(startDate.getTime())) {
      errors.push("Valid start date is required");
    }
    if (!endDate || Number.isNaN(endDate.getTime())) {
      errors.push("Valid end date is required");
    }
    if (startDate && endDate && endDate <= startDate) {
      errors.push("End date must be after start date");
    }
  }

  return errors;
}

export function getCouponStatus(coupon, now = new Date()) {
  if (!coupon?.isActive) return "inactive";
  const start = new Date(coupon.startDate);
  const end = new Date(coupon.endDate);
  if (now < start) return "scheduled";
  if (now > end) return "expired";
  return "active";
}

export function calculateCouponDiscount(coupon, subtotal) {
  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  if (!coupon || safeSubtotal <= 0) return 0;

  if (safeSubtotal < Number(coupon.minOrderAmount || 0)) return 0;

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (safeSubtotal * Number(coupon.discountValue)) / 100;
  } else {
    discount = Number(coupon.discountValue);
  }

  return Math.min(Math.max(0, Math.round(discount * 100) / 100), safeSubtotal);
}

export async function resolveCouponForCheckout(code, subtotal) {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) {
    return { error: "Coupon code is required" };
  }

  const coupon = await Coupon.findOne({ code: normalizedCode });
  if (!coupon) {
    return { error: "Invalid coupon code" };
  }

  const status = getCouponStatus(coupon);
  if (status === "inactive") {
    return { error: "This coupon is inactive" };
  }
  if (status === "scheduled") {
    return { error: "This coupon is not active yet" };
  }
  if (status === "expired") {
    return { error: "This coupon has expired" };
  }

  const safeSubtotal = Math.max(0, Number(subtotal) || 0);
  if (safeSubtotal < Number(coupon.minOrderAmount || 0)) {
    return {
      error: `Minimum order amount is ₹${coupon.minOrderAmount}`,
    };
  }

  const couponDiscount = calculateCouponDiscount(coupon, safeSubtotal);

  return {
    couponCode: coupon.code,
    couponDiscount,
    couponTitle: coupon.title || "",
  };
}

export const getAllCoupons = async (req, res) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const [total, coupons] = await Promise.all([
      Coupon.countDocuments({}),
      Coupon.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    res.status(200).json(buildPaginatedResponse(coupons, total, page, limit));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCoupon = async (req, res) => {
  try {
    const errors = validateCouponPayload(req.body);
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0] });
    }

    const coupon = await Coupon.create({
      code: normalizeCouponCode(req.body.code),
      title: req.body.title?.trim() || "",
      discountType: req.body.discountType,
      discountValue: Number(req.body.discountValue),
      startDate: new Date(req.body.startDate),
      endDate: new Date(req.body.endDate),
      isActive: req.body.isActive ?? true,
      appliesToAllProducts: true,
      minOrderAmount: Number(req.body.minOrderAmount) || 0,
    });

    res.status(201).json({ success: true, data: coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Coupon code already exists" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const errors = validateCouponPayload(req.body, { partial: true });
    if (errors.length) {
      return res.status(400).json({ success: false, message: errors[0] });
    }

    const updates = {};
    if (req.body.code !== undefined) updates.code = normalizeCouponCode(req.body.code);
    if (req.body.title !== undefined) updates.title = req.body.title?.trim() || "";
    if (req.body.discountType !== undefined) updates.discountType = req.body.discountType;
    if (req.body.discountValue !== undefined) {
      updates.discountValue = Number(req.body.discountValue);
    }
    if (req.body.startDate !== undefined) updates.startDate = new Date(req.body.startDate);
    if (req.body.endDate !== undefined) updates.endDate = new Date(req.body.endDate);
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
    if (req.body.minOrderAmount !== undefined) {
      updates.minOrderAmount = Number(req.body.minOrderAmount) || 0;
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Coupon code already exists" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found" });
    }

    res.status(200).json({ success: true, message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const code = normalizeCouponCode(req.body.code);
    const subtotal = Number(req.body.subtotal) || 0;

    if (!code) {
      return res.status(400).json({ success: false, message: "Coupon code is required" });
    }

    const coupon = await Coupon.findOne({ code });
    if (!coupon) {
      return res.status(404).json({ success: false, message: "Invalid coupon code" });
    }

    const status = getCouponStatus(coupon);
    if (status === "inactive") {
      return res.status(400).json({ success: false, message: "This coupon is inactive" });
    }
    if (status === "scheduled") {
      return res.status(400).json({ success: false, message: "This coupon is not active yet" });
    }
    if (status === "expired") {
      return res.status(400).json({ success: false, message: "This coupon has expired" });
    }

    if (subtotal < Number(coupon.minOrderAmount || 0)) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ₹${coupon.minOrderAmount}`,
      });
    }

    const discountAmount = calculateCouponDiscount(coupon, subtotal);

    res.status(200).json({
      success: true,
      data: {
        code: coupon.code,
        title: coupon.title,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        appliesToAllProducts: coupon.appliesToAllProducts,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
