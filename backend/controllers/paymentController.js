import crypto from "crypto";
import razorpay, { isRazorpayConfigured } from "../config/razorpay.js";
import Order from "../models/order/Order.js";
import Payment from "../models/payment/Payment.js";
import {
  finalizeOrder,
  normalizeOrderMessage,
  prepareOrderData,
} from "../utils/orderHelpers.js";
import { resolveImageForStorage } from "../utils/imageValidation.js";
import { UPLOAD_FOLDERS } from "../utils/uploadFolders.js";

function normalizeText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export const createRazorpayOrder = async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(500).json({
        success: false,
        message: "Online payment is not configured. Please use Cash on Delivery.",
      });
    }

    const { addressId, paymentMode = "online" } = req.body;
    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    if (!["online", "cod_advance"].includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment mode",
      });
    }

    const result = await prepareOrderData(req.user._id, addressId);
    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const payableAmount =
      paymentMode === "cod_advance"
        ? Math.round(result.total * 0.1 * 100) / 100
        : result.total;
    const amountPaise = Math.round(payableAmount * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `bmm_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        addressId: String(addressId),
        paymentMode,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        paymentMode,
        payableAmount,
        orderTotal: result.total,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create payment order",
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(500).json({
        success: false,
        message: "Online payment is not configured",
      });
    }

    const {
      addressId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentMode = "online",
    } = req.body;
    const orderMessage = normalizeOrderMessage(req.body);

    if (!["online", "cod_advance"].includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment mode",
      });
    }

    if (!addressId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment details are incomplete",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Please try again.",
      });
    }

    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
    const result = await prepareOrderData(req.user._id, addressId);

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const payableAmount =
      paymentMode === "cod_advance"
        ? Math.round(result.total * 0.1 * 100) / 100
        : result.total;
    const expectedAmount = Math.round(payableAmount * 100);
    if (Number(razorpayOrder.amount) !== expectedAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match order total",
      });
    }

    const isCodAdvance = paymentMode === "cod_advance";

    const order = await finalizeOrder({
      userId: req.user._id,
      orderItems: result.orderItems,
      deliveryAddress: result.deliveryAddress,
      subtotal: result.subtotal,
      deliveryCharges: result.deliveryCharges,
      total: result.total,
      cart: result.cart,
      paymentMethod: isCodAdvance ? "cod" : "online",
      paymentStatus: isCodAdvance ? "unpaid" : "paid",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: isCodAdvance ? "" : razorpay_payment_id,
      codAdvanceAmount: isCodAdvance ? payableAmount : 0,
      codAdvanceRazorpayPaymentId: isCodAdvance ? razorpay_payment_id : "",
      paidAt: isCodAdvance ? null : new Date(),
      message: orderMessage,
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to verify payment",
    });
  }
};

export const submitUpiPaymentProof = async (req, res) => {
  try {
    const { addressId, paymentMode = "online" } = req.body;
    const orderMessage = normalizeOrderMessage(req.body);
    const screenshot = typeof req.body.screenshot === "string" ? req.body.screenshot : "";
    const screenshotName = normalizeText(req.body.screenshotName, 200);
    const upiTransactionRef = normalizeText(req.body.upiTransactionRef, 100);

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    if (!["online", "cod_advance"].includes(paymentMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment mode",
      });
    }

    if (!screenshot) {
      return res.status(400).json({
        success: false,
        message: "Payment screenshot is required",
      });
    }

    const resolvedScreenshot = await resolveImageForStorage(
      screenshot,
      UPLOAD_FOLDERS.PAYMENT_PROOFS
    );
    if (resolvedScreenshot.error) {
      return res.status(400).json({
        success: false,
        message: resolvedScreenshot.error,
      });
    }

    const result = await prepareOrderData(req.user._id, addressId);
    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const isCodAdvance = paymentMode === "cod_advance";
    const payableAmount = isCodAdvance
      ? Math.round(result.total * 0.1 * 100) / 100
      : result.total;

    const order = await finalizeOrder({
      userId: req.user._id,
      orderItems: result.orderItems,
      deliveryAddress: result.deliveryAddress,
      subtotal: result.subtotal,
      deliveryCharges: result.deliveryCharges,
      total: result.total,
      cart: result.cart,
      paymentMethod: isCodAdvance ? "cod" : "online",
      paymentStatus: "pending_verification",
      status: "confirm",
      codAdvanceAmount: isCodAdvance ? payableAmount : 0,
      message: orderMessage,
    });

    const payment = await Payment.create({
      order: order._id,
      user: req.user._id,
      orderNumber: order.orderNumber,
      paymentMethod: isCodAdvance ? "cod" : "online",
      paymentType: paymentMode,
      source: "upi_manual",
      amount: payableAmount,
      orderTotal: result.total,
      subtotal: result.subtotal,
      deliveryCharges: result.deliveryCharges,
      items: result.orderItems,
      deliveryAddress: result.deliveryAddress,
      screenshot: resolvedScreenshot.url,
      screenshotName,
      upiTransactionRef,
      customerMessage: orderMessage,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      message:
        "Order confirmed. We will verify your UPI payment screenshot shortly.",
      data: {
        order,
        paymentId: payment._id,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to submit payment proof",
    });
  }
};

export const getAdminPayments = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};

    if (status && ["pending", "verified", "rejected"].includes(status)) {
      filter.status = status;
    }

    const payments = await Payment.find(filter)
      .sort({ createdAt: -1 })
      .populate("user", "name email phone")
      .populate("order", "orderNumber status paymentStatus total")
      .lean();

    res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to load payment records",
    });
  }
};

export const getAdminPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("order", "orderNumber status paymentStatus total paymentMethod")
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to load payment record",
    });
  }
};

export const updatePaymentStatus = async (req, res) => {
  try {
    const { status, rejectionReason = "" } = req.body;

    if (!["verified", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be verified or rejected",
      });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    if (payment.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "This payment has already been reviewed",
      });
    }

    payment.status = status;
    payment.verifiedAt = new Date();
    payment.verifiedBy = req.user._id;

    if (status === "rejected") {
      payment.rejectionReason = normalizeText(rejectionReason, 300);
    } else {
      payment.rejectionReason = "";
    }

    await payment.save();

    if (status === "verified") {
      if (payment.paymentType === "online") {
        await Order.findByIdAndUpdate(payment.order, {
          status: "confirm",
          paymentStatus: "paid",
          paidAt: new Date(),
        });
      } else {
        await Order.findByIdAndUpdate(payment.order, {
          status: "confirm",
          paymentStatus: "unpaid",
          codAdvancePaidAt: new Date(),
        });
      }
    } else {
      await Order.findByIdAndUpdate(payment.order, {
        status: "cancelled",
        paymentStatus: "unpaid",
      });
    }

    res.status(200).json({
      success: true,
      message:
        status === "verified"
          ? "Payment approved successfully"
          : "Payment proof rejected and order cancelled",
      data: payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update payment status",
    });
  }
};
