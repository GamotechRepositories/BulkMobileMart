import Cart from "../models/Cart.js";
import Address from "../models/address/Address.js";
import Order from "../models/order/Order.js";
import User from "../models/user.js";

const FREE_DELIVERY_THRESHOLD = 999;
const DELIVERY_CHARGE = 49;

function addressToSnapshot(address) {
  const raw = typeof address.toObject === "function" ? address.toObject() : address;

  return {
    name: (raw.name || raw.fullName || "").trim(),
    number: String(raw.number || raw.phone || "").trim(),
    landmark: (raw.landmark || raw.streetArea || "").trim(),
    city: (raw.city || "").trim(),
    state: (raw.state || "").trim(),
    pincode: String(raw.pincode || "").trim(),
  };
}

const populateCart = (query) =>
  query.populate({
    path: "items.product",
    select: "name brandName discountedPrice productImages isActive",
  });

export const placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod } = req.body;

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    if (!paymentMethod || !["cod", "online"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Valid payment method is required",
      });
    }

    const address = await Address.findOne({ _id: addressId, user: req.user._id });
    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    const cart = await populateCart(Cart.findOne({ user: req.user._id }));
    if (!cart?.items?.length) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty",
      });
    }

    const orderItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        return res.status(400).json({
          success: false,
          message: "One or more products in your cart are no longer available",
        });
      }

      const price = item.product.discountedPrice;
      subtotal += price * item.quantity;

      orderItems.push({
        product: item.product._id,
        name: item.product.name,
        brandName: item.product.brandName || "",
        price,
        quantity: item.quantity,
        image: item.product.productImages?.[0] || "",
      });
    }

    const deliveryCharges = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
    const total = subtotal + deliveryCharges;

    const deliveryAddress = addressToSnapshot(address);
    if (
      !deliveryAddress.name ||
      !deliveryAddress.number ||
      !deliveryAddress.city ||
      !deliveryAddress.state ||
      !deliveryAddress.pincode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Delivery address is incomplete. Please edit or re-add your address before placing the order.",
      });
    }

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      deliveryAddress,
      paymentMethod,
      subtotal,
      deliveryCharges,
      total,
      paymentStatus: "unpaid",
    });

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { orders: order._id },
    });

    cart.items = [];
    await cart.save();

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const query =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, user: req.user._id };

    const order = await Order.findOne(query).populate("user", "name email phone");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { startDate, endDate, status, paymentStatus } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (paymentStatus && paymentStatus !== "all") {
      if (paymentStatus === "unpaid") {
        filter.$or = [{ paymentStatus: "unpaid" }, { paymentStatus: { $exists: false } }];
      } else {
        filter.paymentStatus = paymentStatus;
      }
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const orders = await Order.find(filter)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const updates = {};

    const allowedStatuses = ["confirm", "processing", "shipping", "delivered", "cancelled"];
    const allowedPaymentStatuses = ["unpaid", "paid"];

    if (status !== undefined) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid order status",
        });
      }
      updates.status = status;
    }

    if (paymentStatus !== undefined) {
      if (!allowedPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status",
        });
      }
      updates.paymentStatus = paymentStatus;
    }

    if (updates.status === "delivered") {
      updates.paymentStatus = "paid";
    }

    if (!Object.keys(updates).length) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate("user", "name email phone");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
