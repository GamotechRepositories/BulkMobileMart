import crypto from "crypto";
import razorpay, { isRazorpayConfigured } from "../config/razorpay.js";
import {
  finalizeOrder,
  normalizeOrderMessage,
  prepareOrderData,
} from "../utils/orderHelpers.js";

export const createRazorpayOrder = async (req, res) => {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(500).json({
        success: false,
        message: "Online payment is not configured. Please use Cash on Delivery.",
      });
    }

    const { addressId } = req.body;
    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    const result = await prepareOrderData(req.user._id, addressId);
    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
      });
    }

    const amountPaise = Math.round(result.total * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountPaise,
      currency: "INR",
      receipt: `bmm_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        addressId: String(addressId),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
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
    } = req.body;
    const orderMessage = normalizeOrderMessage(req.body);

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

    const expectedAmount = Math.round(result.total * 100);
    if (Number(razorpayOrder.amount) !== expectedAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match order total",
      });
    }

    const order = await finalizeOrder({
      userId: req.user._id,
      orderItems: result.orderItems,
      deliveryAddress: result.deliveryAddress,
      subtotal: result.subtotal,
      deliveryCharges: result.deliveryCharges,
      total: result.total,
      cart: result.cart,
      paymentMethod: "online",
      paymentStatus: "paid",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      paidAt: new Date(),
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
