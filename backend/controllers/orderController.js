import Order from "../models/order/Order.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import User from "../models/user.js";
import {
  enrichOrderForResponse,
  finalizeOrder,
  normalizeOrderMessage,
  populateOrderItems,
  prepareCheckoutAttemptData,
  prepareOrderData,
  rebuildOrderFromItemsInput,
  upsertCheckoutAttemptOrder,
} from "../utils/orderHelpers.js";
import { buildPaginatedResponse, getPaginationParams } from "../utils/pagination.js";
import { buildOrderSearchFilter } from "../utils/adminSearch.js";
import {
  calculateAdvanceAmount,
  PAYMENT_STATUS,
} from "../utils/paymentHelpers.js";
import {
  notifyOrderCreated,
  notifyOrderStatusChange,
} from "../services/orderNotificationDispatcher.js";

const ACTIVE_PENDING_STATUSES = ["confirm", "processing", "shipping"];
const INDIA_TZ = "Asia/Kolkata";

function buildDayOrderStats(orders) {
  return {
    orders: orders.length,
    attempted: orders.filter((order) => order.status === "attempted").length,
    pending: orders.filter((order) => ACTIVE_PENDING_STATUSES.includes(order.status)).length,
    delivered: orders.filter((order) => order.status === "delivered").length,
    cancelled: orders.filter((order) => order.status === "cancelled").length,
  };
}

function buildLast7DaysTrend(orders) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  return days.map((date) => {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const dayOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= date && createdAt < nextDay;
    });

    return {
      date: date.toISOString().slice(0, 10),
      ...buildDayOrderStats(dayOrders),
    };
  });
}

function getPercentChange(current, previous) {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;

  if (prev === 0) {
    if (curr === 0) return 0;
    return 100;
  }

  return Math.round(((curr - prev) / prev) * 100);
}

function buildMonthStats(orders) {
  const nonCancelled = orders.filter((order) => order.status !== "cancelled");
  const totalSales = nonCancelled.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
  const totalOrders = orders.length;
  const delivered = orders.filter((order) => order.status === "delivered").length;

  return {
    totalOrders,
    totalSales,
    avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
    fulfillmentRate: totalOrders > 0 ? Math.round((delivered / totalOrders) * 100) : 0,
  };
}

function buildTopCategoriesChartData(categoriesAgg, yearOrderRevenue = 0) {
  const all = categoriesAgg.map((item) => ({
    name: String(item._id || "Uncategorized"),
    value: Number(item.value) || 0,
    units: Number(item.units) || 0,
  }));

  const categoryProductSales = all.reduce((sum, item) => sum + item.value, 0);
  const displayTotal =
    yearOrderRevenue > 0 ? yearOrderRevenue : categoryProductSales;
  const topThree = all.slice(0, 3);
  const rest = all.slice(3);

  const withPercent = (item) => ({
    ...item,
    percent: displayTotal > 0 ? Math.round((item.value / displayTotal) * 100) : 0,
  });

  const chartItems = topThree.map(withPercent);

  const restValue = rest.reduce((sum, item) => sum + item.value, 0);
  const restUnits = rest.reduce((sum, item) => sum + item.units, 0);
  const fees = Math.max(0, displayTotal - categoryProductSales);
  const otherValue = restValue + fees;

  if (otherValue > 0) {
    chartItems.push(
      withPercent({
        name: "Other",
        value: otherValue,
        units: restUnits,
      })
    );
  }

  return {
    categories: chartItems,
    totalSales: displayTotal,
  };
}

export const createCheckoutAttempt = async (req, res) => {
  try {
    const { addressId, checkoutItems, paymentMethod } = req.body;
    const prepared = await prepareCheckoutAttemptData(req.user._id, {
      addressId,
      checkoutItems,
    });

    if (prepared.error) {
      return res.status(prepared.status).json({
        success: false,
        message: prepared.error,
        ...(prepared.code ? { code: prepared.code } : {}),
        ...(prepared.removedItems ? { removedItems: prepared.removedItems } : {}),
      });
    }

    const order = await upsertCheckoutAttemptOrder(
      req.user._id,
      prepared,
      paymentMethod
    );

    res.status(200).json({
      success: true,
      message: "Checkout attempt recorded",
      data: enrichOrderForResponse(order),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const adminPlaceOrder = async (req, res) => {
  try {
    const {
      userId,
      addressId,
      paymentMethod = "cod",
      paymentStatus = "unpaid",
      checkoutItems,
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Customer is required",
      });
    }

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    if (!Array.isArray(checkoutItems) || checkoutItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one product to the order",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const normalizedPayment = paymentMethod === "online" ? "online" : "cod";

    const allowedPaymentStatuses = [
      PAYMENT_STATUS.UNPAID,
      PAYMENT_STATUS.PAID_10,
      PAYMENT_STATUS.PAID,
    ];
    const normalizedPaymentStatus = allowedPaymentStatuses.includes(paymentStatus)
      ? paymentStatus
      : PAYMENT_STATUS.UNPAID;

    const orderMessage = normalizeOrderMessage(req.body);

    const result = await prepareOrderData(userId, addressId, { checkoutItems });
    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
        ...(result.code ? { code: result.code } : {}),
        ...(result.removedItems ? { removedItems: result.removedItems } : {}),
      });
    }

    const codAdvanceAmount =
      normalizedPaymentStatus === PAYMENT_STATUS.PAID_10
        ? calculateAdvanceAmount(result.total)
        : 0;

    const order = await finalizeOrder({
      userId,
      orderItems: result.orderItems,
      deliveryAddress: result.deliveryAddress,
      subtotal: result.subtotal,
      deliveryCharges: result.deliveryCharges,
      gstAmount: result.gstAmount,
      total: result.total,
      cart: result.cart,
      checkoutMode: result.checkoutMode,
      paymentMethod: normalizedPayment,
      paymentStatus: normalizedPaymentStatus,
      status: "confirm",
      message: orderMessage,
      codAdvanceAmount,
      ...(normalizedPaymentStatus === PAYMENT_STATUS.PAID
        ? { paidAt: new Date() }
        : {}),
      ...(normalizedPaymentStatus === PAYMENT_STATUS.PAID_10
        ? { codAdvancePaidAt: new Date() }
        : {}),
    });

    void notifyOrderCreated(order);

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      data: enrichOrderForResponse(order),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const placeOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod, attemptedOrderId } = req.body;
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
      gstAmount: result.gstAmount,
      total: result.total,
      cart: result.cart,
      paymentMethod: "cod",
      paymentStatus: "unpaid",
      message: orderMessage,
      attemptedOrderId,
    });

    void notifyOrderCreated(order, {
      previousStatus: attemptedOrderId ? "attempted" : null,
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

    if (!["confirm", "attempted"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Order can only be cancelled while status is Confirm or Attempted",
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
    const now = new Date();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(startOfToday);
    endOfYesterday.setMilliseconds(-1);
    const start7Days = new Date(startOfToday);
    start7Days.setDate(start7Days.getDate() - 6);

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      todayOrders,
      yesterdayOrders,
      last7DayOrders,
      recentOrders,
      monthlyAgg,
      yearsAgg,
      products,
      categories,
      users,
      totalRevenueAgg,
      currentMonthOrders,
      lastMonthOrders,
      activeProducts,
      outOfStockProducts,
      lowStockProducts,
      topCategoriesAgg,
      yearOrderSummary,
    ] = await Promise.all([
      Order.find({ createdAt: { $gte: startOfToday, $lte: endOfToday } }).select("status"),
      Order.find({ createdAt: { $gte: startOfYesterday, $lte: endOfYesterday } }).select("status"),
      Order.find({ createdAt: { $gte: start7Days, $lte: endOfToday } }).select("status createdAt"),
      Order.find()
        .populate("user", "name email phone")
        .sort({ updatedAt: -1 })
        .limit(6)
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
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Order.aggregate([
        { $group: { _id: { $year: { date: "$createdAt", timezone: INDIA_TZ } } } },
        { $sort: { _id: -1 } },
      ]),
      Product.countDocuments(),
      Category.countDocuments(),
      User.countDocuments({ role: "user" }),
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.find({ createdAt: { $gte: currentMonthStart, $lte: endOfToday } }).select(
        "status total"
      ),
      Order.find({ createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } }).select(
        "status total"
      ),
      Product.countDocuments({ isActive: true, inStock: true, stock: { $gt: 0 } }),
      Product.countDocuments({
        $or: [{ inStock: false }, { stock: { $lte: 0 } }],
      }),
      Product.countDocuments({ isActive: true, inStock: true, stock: { $gt: 0, $lte: 5 } }),
      Order.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            $expr: {
              $eq: [{ $year: { date: "$createdAt", timezone: INDIA_TZ } }, year],
            },
          },
        },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "bulkmobilemartproducts",
            localField: "items.product",
            foreignField: "_id",
            as: "productDoc",
          },
        },
        { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            categoryName: {
              $ifNull: [{ $arrayElemAt: ["$productDoc.categories", 0] }, "Uncategorized"],
            },
          },
        },
        {
          $group: {
            _id: "$categoryName",
            value: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
            units: { $sum: "$items.quantity" },
          },
        },
        { $sort: { value: -1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            $expr: {
              $eq: [{ $year: { date: "$createdAt", timezone: INDIA_TZ } }, year],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            delivered: {
              $sum: { $cond: [{ $eq: ["$status", "delivered"] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const today = buildDayOrderStats(todayOrders);
    const yesterday = buildDayOrderStats(yesterdayOrders);
    const last7Days = buildLast7DaysTrend(last7DayOrders);

    const monthlySales = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const found = monthlyAgg.find((entry) => entry._id === month);
      return {
        month,
        revenue: Number(found?.revenue) || 0,
        orders: Number(found?.orders) || 0,
      };
    });

    const currentMonthStats = buildMonthStats(currentMonthOrders);
    const lastMonthStats = buildMonthStats(lastMonthOrders);

    const yearTotals = monthlySales.reduce(
      (acc, item) => ({
        totalOrders: acc.totalOrders + item.orders,
        totalSales: acc.totalSales + item.revenue,
      }),
      { totalOrders: 0, totalSales: 0 }
    );

    const topCategoriesData = buildTopCategoriesChartData(
      topCategoriesAgg,
      yearTotals.totalSales
    );

    const years = yearsAgg.map((entry) => entry._id);
    if (!years.includes(currentYear)) {
      years.unshift(currentYear);
    }

    const yearOrderCount = Number(yearOrderSummary[0]?.totalOrders) || 0;
    const yearDeliveredCount = Number(yearOrderSummary[0]?.delivered) || 0;

    res.status(200).json({
      success: true,
      data: {
        today,
        yesterday,
        last7Days,
        recentOrders,
        recentTodayOrders: recentOrders.filter(
          (order) => new Date(order.createdAt) >= startOfToday
        ),
        monthlySales,
        years,
        totals: {
          products,
          categories,
          users,
          totalRevenue: Number(totalRevenueAgg[0]?.total) || 0,
        },
        revenue: {
          currentMonth: currentMonthStats.totalSales,
          lastMonth: lastMonthStats.totalSales,
          monthlyTrend: monthlySales.map((item) => ({
            month: item.month,
            revenue: item.revenue,
          })),
        },
        storeOverview: {
          activeProducts,
          outOfStock: outOfStockProducts,
          lowStock: lowStockProducts,
          activeUsers: users,
        },
        topCategories: topCategoriesData.categories,
        topCategoriesTotal: topCategoriesData.totalSales,
        chartSummary: {
          totalOrders: yearTotals.totalOrders,
          totalSales: yearTotals.totalSales,
          avgOrderValue:
            yearTotals.totalOrders > 0 ? yearTotals.totalSales / yearTotals.totalOrders : 0,
          fulfillmentRate:
            yearOrderCount > 0 ? Math.round((yearDeliveredCount / yearOrderCount) * 100) : 0,
          ordersChange: getPercentChange(
            currentMonthStats.totalOrders,
            lastMonthStats.totalOrders
          ),
          salesChange: getPercentChange(
            currentMonthStats.totalSales,
            lastMonthStats.totalSales
          ),
          aovChange: getPercentChange(
            currentMonthStats.avgOrderValue,
            lastMonthStats.avgOrderValue
          ),
          fulfillmentChange: getPercentChange(
            currentMonthStats.fulfillmentRate,
            lastMonthStats.fulfillmentRate
          ),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrderUnreadCount = async (req, res) => {
  try {
    const { since } = req.query;
    const filter = {};

    if (since) {
      const sinceDate = new Date(since);
      if (Number.isNaN(sinceDate.getTime())) {
        return res.status(400).json({ success: false, message: "Invalid since date" });
      }
      filter.createdAt = { $gt: sinceDate };
    }

    const count = await Order.countDocuments(filter);

    return res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load unread order count",
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { startDate, endDate, status, statusGroup, paymentStatus, search } = req.query;
    const filter = {};
    const andClauses = [];

    if (statusGroup === "pending") {
      filter.status = { $in: ACTIVE_PENDING_STATUSES };
    } else if (status && status !== "all") {
      filter.status = status;
    }

    if (paymentStatus && paymentStatus !== "all") {
      if (paymentStatus === "unpaid") {
        andClauses.push({
          $or: [{ paymentStatus: "unpaid" }, { paymentStatus: { $exists: false } }],
        });
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

    const searchClause = await buildOrderSearchFilter(search);
    if (searchClause) andClauses.push(searchClause);

    if (andClauses.length) {
      const rootClauses = Object.entries(filter).map(([key, value]) => ({ [key]: value }));
      Object.keys(filter).forEach((key) => delete filter[key]);
      filter.$and = [...rootClauses, ...andClauses];
    }

    const { page, limit, skip } = getPaginationParams(req.query);

    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .populate("user", "name email phone")
        .sort({ updatedAt: -1 })
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
    const { status, paymentStatus, items, notificationStage } = req.body;
    const updates = {};

    const allowedStatuses = ["attempted", "confirm", "processing", "shipping", "delivered", "cancelled"];
    const allowedPaymentStatuses = [
      PAYMENT_STATUS.UNPAID,
      PAYMENT_STATUS.PAID_10,
      PAYMENT_STATUS.PAID,
      PAYMENT_STATUS.REFUNDABLE,
      PAYMENT_STATUS.PENDING_VERIFICATION,
    ];

    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const previousStatus = existingOrder.status;

    if (items !== undefined) {
      const lockedStatuses = ["shipping", "delivered", "cancelled"];
      if (lockedStatuses.includes(existingOrder.status)) {
        return res.status(400).json({
          success: false,
          message: "Order items cannot be changed after the order is shipped, delivered, or cancelled",
        });
      }

      const rebuilt = await rebuildOrderFromItemsInput(items);
      if (rebuilt.error) {
        return res.status(rebuilt.status || 400).json({
          success: false,
          message: rebuilt.error,
        });
      }

      updates.items = rebuilt.orderItems;
      updates.subtotal = rebuilt.subtotal;
      updates.deliveryCharges = rebuilt.deliveryCharges;
      updates.gstAmount = rebuilt.gstAmount;
      updates.total = rebuilt.total;

      if (existingOrder.paymentStatus === PAYMENT_STATUS.PAID_10) {
        updates.codAdvanceAmount = calculateAdvanceAmount(rebuilt.total);
      }
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

    await Order.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    const order = await populateOrderItems(
      Order.findById(req.params.id).populate("user", "name email phone")
    );

    void notifyOrderStatusChange(order, previousStatus, { notificationStage });

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: enrichOrderForResponse(order),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
