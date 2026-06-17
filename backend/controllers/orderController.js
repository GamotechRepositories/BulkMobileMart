import Order from "../models/order/Order.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import {
  enrichOrderForResponse,
  finalizeOrder,
  normalizeOrderMessage,
  populateOrderItems,
  prepareOrderData,
} from "../utils/orderHelpers.js";
import { buildPaginatedResponse, getPaginationParams } from "../utils/pagination.js";

const PENDING_STATUSES = ["confirm", "processing", "shipping"];
const INDIA_TZ = "Asia/Kolkata";

export const placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod } = req.body;
    const orderMessage = normalizeOrderMessage(req.body);

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

    if (paymentMethod === "online") {
      return res.status(400).json({
        success: false,
        message: "Please complete payment using Razorpay for online orders",
      });
    }

    const result = await prepareOrderData(req.user._id, addressId);
    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
        ...(result.code ? { code: result.code } : {}),
        ...(result.removedItems ? { removedItems: result.removedItems } : {}),
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
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      message: orderMessage,
    });

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
    const orders = await populateOrderItems(
      Order.find({ user: req.user._id }).sort({ createdAt: -1 })
    );

    res.status(200).json({
      success: true,
      data: orders.map((order) => enrichOrderForResponse(order)),
    });
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

    const order = await populateOrderItems(
      Order.findOne(query).populate("user", "name email phone")
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    res.status(200).json({ success: true, data: enrichOrderForResponse(order) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function applyCancelledPaymentRule(order, updates) {
  if (updates.status !== "cancelled" || !order) return;

  if (order.paymentMethod === "online" && order.paymentStatus === "paid") {
    updates.paymentStatus = "refundable";
  }
}

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.status !== "confirm") {
      return res.status(400).json({
        success: false,
        message: "Order can only be cancelled while status is Confirm",
      });
    }

    order.status = "cancelled";
    if (order.paymentMethod === "online" && order.paymentStatus === "paid") {
      order.paymentStatus = "refundable";
    }

    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const year = Number.parseInt(req.query.year, 10) || currentYear;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [todayOrders, recentTodayOrders, monthlyAgg, yearsAgg, products, categories] =
      await Promise.all([
      Order.find({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      }).select("status"),
      Order.find({
        createdAt: { $gte: startOfToday, $lte: endOfToday },
      })
        .populate("user", "name email phone")
        .sort({ createdAt: -1 })
        .limit(10)
        .select("orderNumber total status createdAt user deliveryAddress"),
      Order.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            $expr: {
              $eq: [{ $year: { date: "$createdAt", timezone: INDIA_TZ } }, year],
            },
          },
        },
        {
          $group: {
            _id: { $month: { date: "$createdAt", timezone: INDIA_TZ } },
            revenue: { $sum: "$total" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        {
          $group: {
            _id: { $year: { date: "$createdAt", timezone: INDIA_TZ } },
          },
        },
        { $sort: { _id: -1 } },
      ]),
      Product.countDocuments(),
      Category.countDocuments(),
    ]);

    const today = {
      orders: todayOrders.length,
      pending: todayOrders.filter((order) => PENDING_STATUSES.includes(order.status)).length,
      delivered: todayOrders.filter((order) => order.status === "delivered").length,
      cancelled: todayOrders.filter((order) => order.status === "cancelled").length,
    };

    const monthlySales = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const found = monthlyAgg.find((entry) => entry._id === month);
      return { month, revenue: Number(found?.revenue) || 0 };
    });

    const years = yearsAgg.map((entry) => entry._id);
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
    }

    res.status(200).json({
      success: true,
      data: {
        today,
        recentTodayOrders,
        monthlySales,
        years,
        totals: { products, categories },
      },
    });
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

    const { page, limit, skip } = getPaginationParams(req.query);

    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .populate("user", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.status(200).json(buildPaginatedResponse(orders, total, page, limit));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const updates = {};

    const allowedStatuses = ["confirm", "processing", "shipping", "delivered", "cancelled"];
    const allowedPaymentStatuses = ["unpaid", "paid", "refundable", "pending_verification"];

    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

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

    applyCancelledPaymentRule(existingOrder, updates);

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

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
