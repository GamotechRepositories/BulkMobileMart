import { calculateDeliveryCharges, getOrderProductBalance, getVolumetricWeight, roundMoney } from "../../shared/shipping/deliveryCharges.js";
import Order from "../models/order/Order.js";
import Product from "../models/Product.js";
import Category from "../models/Category.js";
import User from "../models/user.js";
import Payment from "../models/payment/Payment.js";
import Coupon from "../models/Coupon.js";
import {
  enrichOrderForResponse,
  finalizeOrder,
  normalizeOrderMessage,
  normalizeOrderSource,
  populateOrderItems,
  prepareCheckoutAttemptData,
  prepareOrderData,
  rebuildOrderFromItemsInput,
  upsertCheckoutAttemptOrder,
} from "../utils/orderHelpers.js";
import { buildPaginatedResponse, getPaginationParams } from "../utils/pagination.js";
import { getOrderShipments, findOrderShipment, storeOrderShipment, getCombinedShipmentStatus, getClearedShipment, mergeOrderShipment } from "../utils/shipmentHelpers.js";
import { buildOrderSearchFilter } from "../utils/adminSearch.js";
import {
  calculateAdvanceAmount,
  PAYMENT_STATUS,
} from "../utils/paymentHelpers.js";
import {
  notifyOrderCreated,
  notifyOrderStatusChange,
  notifyShipmentLabelCreated,
} from "../services/orderNotificationDispatcher.js";
import {
  cancelEnviaShipment,
  createEnviaShipment,
  isRecoverableEnviaCancelError,
  parseShipmentOverrides,
  quoteEnviaShipmentRates,
  trackEnviaShipment,
} from "../services/enviaShippingService.js";
import { GIFT_HAMPER_STATUSES } from "../../shared/store/giftHamper.js";
import { reverseOrderReward, refundOrderRedeemedPoints } from "./walletController.js";
import {
  formatIndiaDateString,
  getIndiaDayEnd,
  getIndiaDayStart,
  getIndiaTodayRange,
  getIndiaYesterdayRange,
  INDIA_TZ,
  shiftIndiaDateString,
  buildCreatedOnIndiaDateExpr,
  buildCreatedInIndiaDateRangeExpr,
  getIndiaCurrentMonthDateRange,
  getIndiaPreviousMonthDateRange,
} from "../../shared/date/indiaDate.js";
import { resolveCouponForCheckout } from "./couponController.js";

const ACTIVE_PENDING_STATUSES = ["confirm", "processing", "shipping"];
const REVENUE_STATUSES = ["confirm", "processing", "shipping", "delivered"];
const RECENT_ORDERS_STATUSES = [
  "confirm",
  "processing",
  "shipping",
  "delivered",
  "cancelled",
  "return",
];
const LEGACY_CONFIRM_STATUSES = ["pending", "confirmed"];
const AUTO_TRACK_SYNC_MS = 20 * 60 * 1000;
const ORDER_ADDRESS_REQUIRED_FIELDS = [
  "fullName",
  "number",
  "email",
  "shopNo",
  "shopName",
  "fullAddress",
  "landmark",
  "city",
  "state",
  "pincode",
];

function normalizeOrderListStatus(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function applyAdminOrderStatusFilter(filter, { status, statusGroup }) {
  const normalizedGroup = normalizeOrderListStatus(
    Array.isArray(statusGroup) ? statusGroup[0] : statusGroup
  );
  const normalizedStatus = normalizeOrderListStatus(Array.isArray(status) ? status[0] : status);

  if (normalizedGroup === "pending" || normalizedStatus === "pending") {
    filter.status = {
      $in: [...ACTIVE_PENDING_STATUSES, ...LEGACY_CONFIRM_STATUSES],
    };
    return;
  }

  if (normalizedGroup === "revenue") {
    filter.status = { $in: [...REVENUE_STATUSES, "shipped"] };
    return;
  }

  if (!normalizedStatus || normalizedStatus === "all") {
    return;
  }

  if (normalizedStatus === "confirm") {
    filter.status = { $in: ["confirm", ...LEGACY_CONFIRM_STATUSES] };
    return;
  }

  if (normalizedStatus === "shipping") {
    filter.status = { $in: ["shipping", "shipped"] };
    return;
  }

  filter.status = normalizedStatus;
}

function buildAdminOrderBaseFilter({ startDate, endDate, paymentStatus, searchClause }) {
  const filter = {};
  const andClauses = [];

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
      const start = getIndiaDayStart(startDate);
      if (start) {
        filter.createdAt.$gte = start;
      }
    }
    if (endDate) {
      const end = getIndiaDayEnd(endDate);
      if (end) {
        filter.createdAt.$lte = end;
      }
    }
  }

  if (searchClause) {
    andClauses.push(searchClause);
  }

  if (andClauses.length) {
    const rootClauses = Object.entries(filter).map(([key, value]) => ({ [key]: value }));
    Object.keys(filter).forEach((key) => delete filter[key]);
    filter.$and = [...rootClauses, ...andClauses];
  }

  return filter;
}

function buildOrderStatusCounts(statusAgg = []) {
  const byStatus = {};
  let all = 0;

  statusAgg.forEach((entry) => {
    const key = String(entry._id || "").toLowerCase();
    const count = Number(entry.count) || 0;
    byStatus[key] = (byStatus[key] || 0) + count;
    all += count;
  });

  const confirm =
    (byStatus.confirm || 0) +
    (byStatus.pending || 0) +
    (byStatus.confirmed || 0);
  const processing = byStatus.processing || 0;
  const shipping = (byStatus.shipping || 0) + (byStatus.shipped || 0);
  const attempted = byStatus.attempted || 0;
  const delivered = byStatus.delivered || 0;
  const cancelled = byStatus.cancelled || 0;
  const returned = byStatus.return || 0;
  const pending = confirm + processing + shipping;

  return {
    all,
    attempted,
    pending,
    confirm,
    processing,
    shipping,
    delivered,
    cancelled,
    return: returned,
  };
}

function normalizeManualTrackingInput(payload = {}) {
  const enabled = Boolean(payload.enabled);
  const note = String(payload.note || "").trim().slice(0, 500);
  const evidenceUrl = String(payload.evidenceUrl || "").trim().slice(0, 500);
  const evidenceName = String(payload.evidenceName || "").trim().slice(0, 200);

  return {
    enabled,
    note: enabled ? note : "",
    evidenceUrl: enabled ? evidenceUrl : "",
    evidenceName: enabled ? evidenceName : "",
    updatedAt: enabled ? new Date() : null,
  };
}

function normalizeOrderDeliveryAddressInput(payload = {}) {
  return {
    fullName: String(payload.fullName || "").trim(),
    number: String(payload.number || "").trim(),
    email: String(payload.email || "").trim().toLowerCase(),
    shopNo: String(payload.shopNo || "").trim(),
    shopName: String(payload.shopName || "").trim(),
    fullAddress: String(payload.fullAddress || "").trim(),
    landmark: String(payload.landmark || "").trim(),
    city: String(payload.city || "").trim(),
    state: String(payload.state || "").trim(),
    pincode: String(payload.pincode || "").trim(),
  };
}

function applyShipmentOnOrder(order, shipment, metadata = {}) {
  order.shipment = mergeOrderShipment(order, {
    provider: shipment.provider || "envia",
    carrier: shipment.carrier || "",
    service: shipment.service || "",
    shipmentId: shipment.shipmentId || "",
    trackingNumber: shipment.trackingNumber || "",
    trackUrl: shipment.trackUrl || "",
    labelUrl: shipment.labelUrl || "",
    status: shipment.status || "",
    statusMessage: shipment.statusMessage || "",
    syncedAt: shipment.syncedAt || new Date(),
    events: Array.isArray(shipment.events) ? shipment.events : [],
    note: String(metadata.shipmentNote || "").trim(),
    evidenceUrl: String(metadata.evidenceUrl || "").trim(),
    evidenceName: String(metadata.evidenceName || "").trim(),
  });
}

async function applyTrackingToOrder(order, tracking = {}, { notify = false } = {}) {
  const previousStatus = order.status;

  const target = findOrderShipment(order, tracking.trackingNumber);
  const updated = mergeOrderShipment({ shipment: target }, {
    provider: "envia",
    status: tracking.status || target?.status || "",
    statusMessage: tracking.statusMessage || target?.statusMessage || "",
    trackingNumber: tracking.trackingNumber || target?.trackingNumber || "",
    trackUrl: tracking.trackUrl || target?.trackUrl || "",
    syncedAt: tracking.syncedAt || new Date(),
    events: Array.isArray(tracking.events) && tracking.events.length
      ? tracking.events
      : target?.events || [],
  });

  storeOrderShipment(order, updated, { trackingNumber: target.trackingNumber });
  order.status = getCombinedShipmentStatus(order);

  await order.save();

  if (notify && order.status !== previousStatus) {
    void notifyOrderStatusChange(order, previousStatus);
  }

  return order;
}

async function autoSyncShipmentForOrder(order) {
  const shipments = getOrderShipments(order);
  if (!shipments.length) return order;
  const mappedFromStored = getCombinedShipmentStatus(order);
  if (mappedFromStored !== order.status) {
    const previousStatus = order.status;
    order.status = mappedFromStored;
    await order.save();
    void notifyOrderStatusChange(order, previousStatus);
  }
  for (const shipment of shipments) {
    const lastSync = shipment.syncedAt ? new Date(shipment.syncedAt).getTime() : 0;
    if (Date.now() - lastSync < AUTO_TRACK_SYNC_MS) continue;
    try {
      const tracking = await trackEnviaShipment(shipment.trackingNumber);
      await applyTrackingToOrder(order, { ...tracking, trackingNumber: shipment.trackingNumber }, { notify: true });
    } catch (error) {
      console.warn(`Auto tracking sync skipped for order ${order._id}: ${error.message}`);
    }
  }
  return order;
}

function buildDayOrderStats(orders) {
  return {
    orders: orders.length,
    attempted: orders.filter((order) => order.status === "attempted").length,
    confirmed: orders.filter(
      (order) =>
        order.status === "confirm" ||
        order.status === "processing" ||
        LEGACY_CONFIRM_STATUSES.includes(order.status)
    ).length,
    pending: orders.filter((order) => ACTIVE_PENDING_STATUSES.includes(order.status)).length,
    shipping: orders.filter(
      (order) => order.status === "shipping" || order.status === "shipped"
    ).length,
    delivered: orders.filter((order) => order.status === "delivered").length,
    cancelled: orders.filter((order) => order.status === "cancelled").length,
    return: orders.filter((order) => order.status === "return").length,
  };
}

function buildLast7DaysTrend(orders) {
  const today = formatIndiaDateString();

  return Array.from({ length: 7 }, (_, index) => {
    const dateString = shiftIndiaDateString(today, index - 6);
    const dayStart = getIndiaDayStart(dateString);
    const dayEnd = getIndiaDayEnd(dateString);

    const dayOrders = orders.filter((order) => {
      const createdAt = new Date(order.createdAt);
      return createdAt >= dayStart && createdAt <= dayEnd;
    });

    return {
      date: dateString,
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
  const revenueOrders = orders.filter((order) => REVENUE_STATUSES.includes(order.status));
  const totalSales = revenueOrders.reduce((sum, order) => sum + (Number(order.total) || 0), 0);
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
    const {
      addressId,
      checkoutItems,
      paymentMethod,
      checkoutMode,
      buyNow,
      couponCode,
      attemptedOrderId,
      useWalletPoints,
      walletPoints,
    } = req.body;
    const prepared = await prepareCheckoutAttemptData(req.user._id, {
      addressId,
      checkoutItems,
      checkoutMode,
      buyNow,
      couponCode,
      attemptedOrderId,
      useWalletPoints,
      walletPoints,
      paymentMode: paymentMethod === "online" ? "online" : "cod_advance",
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
      paymentMethod,
      normalizeOrderSource(req.body.orderSource),
      attemptedOrderId || null
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

    const result = await prepareOrderData(userId, addressId, {
      checkoutItems,
      checkoutMode: "buyNow",
      paymentMode: normalizedPaymentStatus === PAYMENT_STATUS.PAID ? "online" : "cod_advance",
    });
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

    let order = await finalizeOrder({
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
      orderSource: "admin",
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
    const {
      addressId,
      paymentMethod,
      attemptedOrderId,
      checkoutMode,
      buyNow,
      couponCode,
      useWalletPoints,
      walletPoints,
    } = req.body;
    const orderMessage = normalizeOrderMessage(req.body);

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "Delivery address is required",
      });
    }

    if (!paymentMethod || !["cod", "online", "wallet"].includes(paymentMethod)) {
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

    const wantWallet =
      useWalletPoints === true ||
      useWalletPoints === "true" ||
      paymentMethod === "wallet" ||
      (walletPoints != null && Number(walletPoints) > 0);

    const result = await prepareOrderData(req.user._id, addressId, {
      checkoutMode,
      buyNow,
      couponCode,
      useWalletPoints: wantWallet,
      walletPoints,
      excludeOrderId: attemptedOrderId || undefined,
    });
    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error,
        ...(result.code ? { code: result.code } : {}),
        ...(result.removedItems ? { removedItems: result.removedItems } : {}),
      });
    }

    if (paymentMethod === "wallet" && result.total > 0) {
      return res.status(400).json({
        success: false,
        message: `Wallet points do not cover the full order amount. Remaining balance: ₹${result.total}. Please choose COD or Online payment for the balance.`,
      });
    }

    const isFullyPaidByWallet = result.total === 0 && result.walletPointsRedeemed > 0;
    const finalPaymentMethod = isFullyPaidByWallet ? "wallet" : "cod";
    const finalPaymentStatus = isFullyPaidByWallet ? "paid" : "unpaid";
    const paidAt = isFullyPaidByWallet ? new Date() : null;

    let order = await finalizeOrder({
      userId: req.user._id,
      orderItems: result.orderItems,
      deliveryAddress: result.deliveryAddress,
      subtotal: result.subtotal,
      couponCode: result.couponCode,
      couponDiscount: result.couponDiscount,
      walletDiscount: result.walletDiscount,
      walletPointsRedeemed: result.walletPointsRedeemed,
      deliveryCharges: result.deliveryCharges,
      gstAmount: result.gstAmount,
      total: result.total,
      cart: result.cart,
      checkoutMode: result.checkoutMode,
      paymentMethod: finalPaymentMethod,
      paymentStatus: finalPaymentStatus,
      paidAt,
      message: orderMessage,
      attemptedOrderId,
      orderSource: normalizeOrderSource(req.body.orderSource),
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
      Order.find({ user: req.user._id }).sort({
        createdAt: -1,
      })
    );

    res.status(200).json({
      success: true,
      data: orders.map((order) => enrichOrderForResponse(order, { customerView: true })),
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

    let order = await populateOrderItems(
      Order.findOne(query).populate("user", "name email phone")
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order = await autoSyncShipmentForOrder(order);
    const customerView = req.user.role !== "admin";
    let verifiedAdvancePayment = null;
    if (!customerView && order.paymentStatus === PAYMENT_STATUS.PAID_10) {
      verifiedAdvancePayment = await Payment.findOne({
        order: order._id,
        paymentType: "cod_advance",
        status: "verified",
      })
        .sort({ verifiedAt: -1 })
        .lean();
    }

    res.status(200).json({
      success: true,
      data: enrichOrderForResponse(order, { customerView, verifiedAdvancePayment }),
    });
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

    try {
      await reverseOrderReward(order);
    } catch (e) {
      console.error("Failed to reverse reward on cancellation:", e);
    }

    try {
      await refundOrderRedeemedPoints(order);
    } catch (e) {
      console.error("Failed to refund redeemed points on cancellation:", e);
    }

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

    const { dateString: todayDateString } = getIndiaTodayRange();
    const { dateString: yesterdayDateString } = getIndiaYesterdayRange();
    const start7DaysDateString = shiftIndiaDateString(todayDateString, -6);
    const currentMonthRange = getIndiaCurrentMonthDateRange();
    const lastMonthRange = getIndiaPreviousMonthDateRange();

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
      Order.find({ $expr: buildCreatedOnIndiaDateExpr(todayDateString) }).select("status"),
      Order.find({ $expr: buildCreatedOnIndiaDateExpr(yesterdayDateString) }).select("status"),
      Order.find({
        $expr: buildCreatedInIndiaDateRangeExpr(start7DaysDateString, todayDateString),
      }).select("status createdAt"),
      Order.find({
        status: { $in: RECENT_ORDERS_STATUSES },
        $expr: buildCreatedOnIndiaDateExpr(todayDateString),
      })
        .populate("user", "name email phone")
        .sort({ createdAt: -1 })
        .limit(6)
        .select("orderNumber total status createdAt user deliveryAddress"),
      Order.aggregate([
        {
          $match: {
            status: { $in: REVENUE_STATUSES },
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
        { $match: { status: { $in: REVENUE_STATUSES } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Order.find({
        $expr: buildCreatedInIndiaDateRangeExpr(
          currentMonthRange.startDate,
          currentMonthRange.endDate
        ),
      }).select("status total"),
      Order.find({
        $expr: buildCreatedInIndiaDateRangeExpr(lastMonthRange.startDate, lastMonthRange.endDate),
      }).select("status total"),
      Product.countDocuments({ isActive: true, inStock: true, stock: { $gt: 0 } }),
      Product.countDocuments({
        $or: [{ inStock: false }, { stock: { $lte: 0 } }],
      }),
      Product.countDocuments({ isActive: true, inStock: true, stock: { $gt: 0, $lte: 5 } }),
      Order.aggregate([
        {
          $match: {
            status: { $in: REVENUE_STATUSES },
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
        recentTodayOrders: recentOrders,
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
        monthOrders: {
          count: currentMonthStats.totalOrders,
          ...buildDayOrderStats(currentMonthOrders),
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
    const { since, statusGroup } = req.query;
    const filter = {};
    const normalizedGroup = typeof statusGroup === "string" ? statusGroup.trim().toLowerCase() : "";

    if (normalizedGroup === "attempted") {
      filter.status = "attempted";
    } else if (normalizedGroup === "placed") {
      filter.status = { $ne: "attempted" };
    }

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
    const searchClause = await buildOrderSearchFilter(search);
    const baseFilter = buildAdminOrderBaseFilter({
      startDate,
      endDate,
      paymentStatus,
      searchClause,
    });

    const filter = { ...baseFilter };
    if (filter.$and) {
      filter.$and = [...filter.$and];
    }
    applyAdminOrderStatusFilter(filter, { status, statusGroup });

    const { page, limit, skip } = getPaginationParams(req.query);

    const [total, orders, statusAgg, amountAgg] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter)
        .populate("user", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.aggregate([
        ...(Object.keys(baseFilter).length ? [{ $match: baseFilter }] : []),
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        ...(Object.keys(filter).length ? [{ $match: filter }] : []),
        { $group: { _id: null, totalAmount: { $sum: "$total" } } },
      ]),
    ]);

    const response = buildPaginatedResponse(orders, total, page, limit);
    response.statusCounts = buildOrderStatusCounts(statusAgg);
    response.amountTotal = Number(amountAgg[0]?.totalAmount) || 0;

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEligibleOrderCoupons = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).select(
      "user subtotal couponCode couponDiscount status paymentStatus"
    );
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    let reason = "";
    if (order.couponCode || Number(order.couponDiscount) > 0) {
      reason = "A coupon is already applied to this order";
    } else if (!["confirm", "processing"].includes(order.status)) {
      reason = "Coupon can only be applied before the order is shipped";
    } else if (![PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PAID_10].includes(order.paymentStatus)) {
      reason = "Coupon cannot be applied after full payment or while payment is under review";
    }

    if (reason) {
      return res.status(200).json({
        success: true,
        data: { coupons: [], canApply: false, reason },
      });
    }

    const now = new Date();
    const activeCoupons = await Coupon.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ minOrderAmount: 1, discountValue: -1, createdAt: -1 })
      .lean();

    const subtotal = Number(order.subtotal) || 0;
    const resolved = await Promise.all(
      activeCoupons.map(async (coupon) => {
        const result = await resolveCouponForCheckout(coupon.code, subtotal, {
          userId: order.user,
          excludeOrderId: order._id,
        });
        if (result.error || Number(result.couponDiscount) <= 0) return null;

        return {
          code: result.couponCode,
          title: result.couponTitle || coupon.title || "",
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          minOrderAmount: Number(coupon.minOrderAmount) || 0,
          discountAmount: result.couponDiscount,
        };
      })
    );

    const coupons = resolved
      .filter(Boolean)
      .sort((a, b) => b.discountAmount - a.discountAmount);

    res.status(200).json({
      success: true,
      data: { coupons, canApply: true, reason: "" },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to load eligible coupons",
    });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      items,
      deliveryCharges,
      codChargePercentage,
      couponCode,
      notificationStage,
      manualTracking,
      deliveryAddress,
    } = req.body;
    const updates = {};

    const allowedStatuses = [
      "attempted",
      "confirm",
      "processing",
      "shipping",
      "delivered",
      "cancelled",
      "return",
    ];
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

    if (couponCode !== undefined) {
      const normalizedCouponCode = String(couponCode || "").trim().toUpperCase();

      if (!normalizedCouponCode) {
        return res.status(400).json({
          success: false,
          message: "Select a coupon to apply",
        });
      }

      if (existingOrder.couponCode || Number(existingOrder.couponDiscount) > 0) {
        return res.status(400).json({
          success: false,
          message: "A coupon is already applied to this order",
        });
      }

      if (!["confirm", "processing"].includes(existingOrder.status)) {
        return res.status(400).json({
          success: false,
          message: "Coupon can only be applied before the order is shipped",
        });
      }

      if (![PAYMENT_STATUS.UNPAID, PAYMENT_STATUS.PAID_10].includes(existingOrder.paymentStatus)) {
        return res.status(400).json({
          success: false,
          message: "Coupon cannot be applied after full payment or while payment is under review",
        });
      }

      const subtotal = Number(existingOrder.subtotal) || 0;
      const couponResult = await resolveCouponForCheckout(normalizedCouponCode, subtotal, {
        userId: existingOrder.user,
        excludeOrderId: existingOrder._id,
      });

      if (couponResult.error) {
        return res.status(400).json({
          success: false,
          message: couponResult.error,
        });
      }

      const charge = Number(existingOrder.deliveryCharges) || 0;
      const discountedSubtotal = Math.max(0, subtotal - couponResult.couponDiscount);

      updates.couponCode = couponResult.couponCode;
      updates.couponDiscount = couponResult.couponDiscount;
      updates.gstAmount = 0;
      updates.total = Math.round((discountedSubtotal + charge) * 100) / 100;
    }

    if (items !== undefined) {
      const lockedStatuses = ["shipping", "delivered", "cancelled", "return"];
      if (lockedStatuses.includes(existingOrder.status)) {
        return res.status(400).json({
          success: false,
          message:
            "Order items cannot be changed after the order is shipped, delivered, cancelled, or returned",
        });
      }

      const rebuilt = await rebuildOrderFromItemsInput(items, { codChargePercentage: existingOrder.codChargePercentage ?? 2.5 });
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
    }

    if (deliveryCharges !== undefined) {
      const charge = Number(deliveryCharges);
      if (!Number.isFinite(charge) || charge < 0) {
        return res.status(400).json({
          success: false,
          message: "Delivery charge must be a valid number",
        });
      }

      const subtotal = Number(updates.subtotal ?? existingOrder.subtotal) || 0;
      const couponDiscount = Number(existingOrder.couponDiscount) || 0;
      const walletDiscount = Number(existingOrder.walletDiscount) || 0;
      const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
      // Points were already redeemed at checkout; preserve their discount on edits.
      const nextTotal = Math.max(
        0,
        Math.round((discountedSubtotal + charge - walletDiscount) * 100) / 100
      );

      updates.deliveryCharges = charge;
      updates.total = nextTotal;
      updates.gstAmount = 0;
    }

    if (codChargePercentage !== undefined) {
      if (typeof codChargePercentage !== "number" || !Number.isFinite(codChargePercentage) || codChargePercentage < 0 || codChargePercentage > 100) {
        return res.status(400).json({ success: false, message: "COD charge percentage must be a number between 0 and 100" });
      }
      updates.codChargePercentage = codChargePercentage;
      if (existingOrder.paymentMethod === "cod") {
        const value = getOrderProductBalance({
          subtotal: updates.subtotal ?? existingOrder.subtotal,
          couponDiscount: updates.couponDiscount ?? existingOrder.couponDiscount,
          walletDiscount: existingOrder.walletDiscount,
        });
        // Keep shipping costs and manual adjustments; replace only the COD fee.
        const advanceAmount = existingOrder.shipment?.codBalance != null
          ? Math.max(0, value - existingOrder.shipment.codBalance)
          : Number(existingOrder.codAdvanceAmount) > 0 ? existingOrder.codAdvanceAmount : undefined;
        const oldFee = calculateDeliveryCharges({ orderValue: value, advanceAmount, codChargePercentage: existingOrder.codChargePercentage ?? 2.5 }).codFee;
        const newFee = calculateDeliveryCharges({ orderValue: value, advanceAmount, codChargePercentage }).codFee;
        updates.deliveryCharges = roundMoney(Math.max(0, Number(updates.deliveryCharges ?? existingOrder.deliveryCharges ?? 0) - oldFee + newFee));
        updates.total = roundMoney(value + updates.deliveryCharges);
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
      if (previousStatus === "attempted" && status !== "attempted") {
        updates.createdAt = new Date();
      }
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

    if (deliveryAddress !== undefined) {
      if (!deliveryAddress || typeof deliveryAddress !== "object") {
        return res.status(400).json({
          success: false,
          message: "Delivery address is invalid",
        });
      }

      if (["delivered", "cancelled", "return"].includes(existingOrder.status)) {
        return res.status(400).json({
          success: false,
          message: "Delivery address cannot be changed after order is delivered, cancelled, or returned",
        });
      }

      const normalizedAddress = normalizeOrderDeliveryAddressInput(deliveryAddress);
      const missingField = ORDER_ADDRESS_REQUIRED_FIELDS.find(
        (field) => !normalizedAddress[field]
      );
      if (missingField) {
        return res.status(400).json({
          success: false,
          message: "All delivery address fields are required",
        });
      }

      updates.deliveryAddress = normalizedAddress;
    }

    if (manualTracking !== undefined) {
      if (!manualTracking || typeof manualTracking !== "object") {
        return res.status(400).json({
          success: false,
          message: "Manual tracking update is invalid",
        });
      }
      updates["shipment.manualTracking"] = normalizeManualTrackingInput(manualTracking);
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

    let order = await populateOrderItems(
      Order.findById(req.params.id).populate("user", "name email phone")
    );

    if (updates.status === "cancelled" && previousStatus !== "cancelled") {
      try {
        await reverseOrderReward(order);
      } catch (e) {
        console.error("Failed to reverse reward on updateOrder cancellation:", e);
      }
      try {
        await refundOrderRedeemedPoints(order);
      } catch (e) {
        console.error("Failed to refund redeemed points on updateOrder cancellation:", e);
      }
    }

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

export const quoteOrderShipmentRates = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot quote shipment for a cancelled order",
      });
    }

    const additional = req.body?.additionalShipment === true;
    const overrides = parseShipmentOverrides(additional ? { ...req.body, isCod: req.body.isCod === true, allowPrepaidShipment: true } : req.body || {}, order);
    const { quotes, errors, carriers } = await quoteEnviaShipmentRates(order, overrides);

    res.status(200).json({
      success: true,
      data: {
        quotes,
        errors,
        carriers,
        paymentType: {
          isCod: overrides.isCod,
          codAmount: overrides.isCod ? overrides.codAmount : null,
        },
        package: {
          weight: overrides.weight,
          length: overrides.length,
          width: overrides.width,
          height: overrides.height,
          content: overrides.content,
        },
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to fetch shipment rates",
    });
  }
};

export const createOrderShipment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot create shipment for a cancelled order",
      });
    }

    if (["cancelled", "delivered"].includes(order.status)) throw new Error("Cannot add a shipment to a cancelled or delivered order");
    const additional = req.body?.additionalShipment === true;
    if (order.shipment?.trackingNumber && !additional) {
      return res.status(400).json({
        success: false,
        message: "Shipment already created for this order",
      });
    }

    const overrides = parseShipmentOverrides(additional ? { ...req.body, isCod: req.body.isCod === true, allowPrepaidShipment: true } : req.body || {}, order);
    if (!overrides.carrier || !overrides.service) {
      return res.status(400).json({
        success: false,
        message: "Select a carrier and service from rate quotes before creating the label",
      });
    }

    if (additional && overrides.isCod) {
      const allocated = getOrderShipments(order).reduce((sum, entry) => sum + (Number(entry.codCollectAmount) || 0), 0);
      const available = Math.max(0, Math.round((Number(order.total) || 0) - (Number(order.codAdvanceAmount) || 0)) - allocated);
      if (!(Number(req.body.codAmount) > 0) || overrides.codAmount > available) {
        throw new Error(`Enter this parcel's COD amount, up to ₹${available}. Existing labels already collect ₹${allocated}.`);
      }
    }

    const productBalance = getOrderProductBalance(order);
    const advanceAmount = Number(order.codAdvanceAmount) || 0;
    const shipment = await createEnviaShipment(order, overrides);
    const charges = shipment.baseShippingCharge == null ? null : calculateDeliveryCharges({
      baseShippingCharge: shipment.baseShippingCharge,
      orderValue: additional ? overrides.codAmount : productBalance,
      advanceAmount: additional ? 0 : advanceAmount,
      isCod: overrides.isCod,
      codChargePercentage: order.codChargePercentage ?? 2.5,
    });
    if (charges) {
      order.deliveryCharges = roundMoney((additional ? Number(order.deliveryCharges) || 0 : 0) + charges.deliveryCharges);
      order.total = roundMoney(Math.max(0, (Number(order.subtotal) || 0) - (Number(order.couponDiscount) || 0) - (Number(order.walletDiscount) || 0) + order.deliveryCharges));
    }
    const previousStatus = order.status;

    const newShipment = mergeOrderShipment({ shipment: {} }, {
      baseShippingCharge: shipment.baseShippingCharge,
      codChargePercentage: order.codChargePercentage ?? 2.5,
      codFee: charges?.codFee ?? null,
      codBalance: charges?.codBalance ?? null,
      codCollectAmount: overrides.isCod ? overrides.codAmount : 0,
      volumetricWeight: getVolumetricWeight(overrides),
      provider: shipment.provider,
      carrier: shipment.carrier,
      service: shipment.service,
      shipmentId: shipment.shipmentId,
      trackingNumber: shipment.trackingNumber,
      trackUrl: shipment.trackUrl,
      labelUrl: shipment.labelUrl,
      status: shipment.status,
      statusMessage: shipment.statusMessage,
      syncedAt: shipment.syncedAt,
      events: shipment.events,
      note: overrides.shipmentNote || "",
      evidenceUrl: overrides.evidenceUrl || "",
      evidenceName: overrides.evidenceName || "",
    });
    storeOrderShipment(order, newShipment, { additional });

    if (order.status === "confirm" || order.status === "processing") {
      order.status = "shipping";
    }

    await order.save();
    const populated = await populateOrderItems(
      Order.findById(order._id).populate("user", "name email phone")
    );

    if (previousStatus !== populated.status) {
      void notifyOrderStatusChange(populated, previousStatus);
    } else {
      void notifyShipmentLabelCreated(additional ? { ...populated.toObject(), shipment: newShipment } : populated);
    }

    res.status(200).json({
      success: true,
      message: "Shipment created successfully",
      data: enrichOrderForResponse(populated),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.response?.data?.message || error.message || "Failed to create shipment",
    });
  }
};

export const linkOrderShipmentTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const trackingNumber = String(req.body?.trackingNumber || "").trim();
    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: "Tracking number is required",
      });
    }

    if (["cancelled", "delivered"].includes(order.status)) throw new Error("Cannot add a shipment to a cancelled or delivered order");
    const additional = req.body?.additionalShipment === true;
    if (getOrderShipments(order).some((entry) => entry.trackingNumber === trackingNumber)) {
      throw new Error("This tracking number is already linked to the order");
    }
    if (order.shipment?.trackingNumber && !additional) throw new Error("Use another shipment to preserve existing tracking");
    const previousStatus = order.status;
    const target = {};

    const linkedShipment = mergeOrderShipment({ shipment: target }, {
      provider: "envia",
      carrier: String(req.body?.carrier || target?.carrier || "").trim(),
      service: String(req.body?.service || target?.service || "").trim(),
      trackingNumber,
      trackUrl: String(req.body?.trackUrl || target?.trackUrl || "").trim(),
      labelUrl: String(req.body?.labelUrl || target?.labelUrl || "").trim(),
      status: String(req.body?.status || target?.status || "created").trim(),
      statusMessage:
        String(req.body?.statusMessage || target?.statusMessage || "").trim() ||
        "Linked from Envia portal",
      syncedAt: new Date(),
      events: target?.events || [],
    });

    try {
      const tracking = await trackEnviaShipment(trackingNumber);
      linkedShipment.status = tracking.status || linkedShipment.status;
      linkedShipment.statusMessage =
        tracking.statusMessage || linkedShipment.statusMessage;
      linkedShipment.trackUrl = tracking.trackUrl || linkedShipment.trackUrl;
      linkedShipment.events = tracking.events?.length
        ? tracking.events
        : linkedShipment.events;
      linkedShipment.syncedAt = tracking.syncedAt || linkedShipment.syncedAt;
    } catch {
      // Tracking lookup is optional; webhooks will update status later.
    }

    storeOrderShipment(order, linkedShipment, { additional });
    order.status = getCombinedShipmentStatus(order);
    if (["confirm", "processing"].includes(order.status)) order.status = "shipping";

    await order.save();

    if (order.status !== previousStatus) {
      void notifyOrderStatusChange(order, previousStatus);
    }

    const populated = await populateOrderItems(
      Order.findById(order._id).populate("user", "name email phone")
    );

    res.status(200).json({
      success: true,
      message: "Tracking linked to order",
      data: enrichOrderForResponse(populated),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to link tracking",
    });
  }
};

export const syncOrderShipmentTracking = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const trackingNumber = findOrderShipment(order, req.body?.trackingNumber)?.trackingNumber;
    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: "No tracking number found for this order",
      });
    }

    const tracking = await trackEnviaShipment(trackingNumber);
    await applyTrackingToOrder(order, { ...tracking, trackingNumber }, { notify: true });
    const populated = await populateOrderItems(
      Order.findById(order._id).populate("user", "name email phone")
    );

    res.status(200).json({
      success: true,
      message: "Tracking synced successfully",
      data: enrichOrderForResponse(populated),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.response?.data?.message || error.message || "Failed to sync tracking",
    });
  }
};

export const cancelOrderShipment = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const target = findOrderShipment(order, req.body?.trackingNumber);
    const trackingNumber = String(target?.trackingNumber || "").trim();
    if (!trackingNumber) {
      return res.status(400).json({
        success: false,
        message: "No shipment label found on this order",
      });
    }

    if (order.status === "delivered") {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel shipment for a delivered order",
      });
    }

    const clearOnly = Boolean(req.body?.clearOnly);
    const forceClear = Boolean(req.body?.forceClear);
    const carrier = String(target?.carrier || "").trim();
    let enviaCancelled = false;
    let enviaWarning = "";

    if (!clearOnly) {
      if (!carrier) {
        return res.status(400).json({
          success: false,
          message:
            "Carrier is missing on this shipment. Clear the shipment locally, then create a new label.",
          canForceClear: true,
        });
      }

      try {
        await cancelEnviaShipment({
          carrier,
          trackingNumber,
          folio: target?.shipmentId || order.orderNumber || "",
        });
        enviaCancelled = true;
      } catch (error) {
        const message = error.message || "Failed to cancel Envia label";
        if (isRecoverableEnviaCancelError(message) || forceClear) {
          enviaWarning = message;
        } else {
          return res.status(400).json({
            success: false,
            message,
            canForceClear: true,
          });
        }
      }
    }

    const previousStatus = order.status;
    storeOrderShipment(order, getClearedShipment(), { trackingNumber });

    if (order.status === "shipping" && !getOrderShipments(order).length) {
      order.status = "processing";
    }

    await order.save();

    const populated = await populateOrderItems(
      Order.findById(order._id).populate("user", "name email phone")
    );

    if (previousStatus !== populated.status) {
      void notifyOrderStatusChange(populated, previousStatus);
    }

    let message = "Shipment cleared. You can create a new label.";
    if (enviaCancelled) {
      message = "Envia label cancelled. You can create a new shipment label.";
    } else if (clearOnly) {
      message = "Shipment cleared from this order. Create a new label when ready.";
    } else if (enviaWarning) {
      message = `Shipment cleared from this order. Envia note: ${enviaWarning}`;
    }

    res.status(200).json({
      success: true,
      message,
      data: enrichOrderForResponse(populated),
      enviaCancelled,
      ...(enviaWarning ? { enviaWarning } : {}),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "Failed to cancel shipment",
    });
  }
};

export const getGiftHamperOrders = async (req, res) => {
  try {
    const { status = "pending", search } = req.query;
    const filter = {
      giftHamper: { $exists: true, $ne: null },
    };

    if (status && status !== "all") {
      if (!GIFT_HAMPER_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid gift hamper status filter",
        });
      }
      filter["giftHamper.status"] = status;
    } else {
      filter["giftHamper.status"] = { $in: GIFT_HAMPER_STATUSES };
    }

    const searchClause = await buildOrderSearchFilter(search);
    if (searchClause) {
      filter.$and = [searchClause];
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

export const updateGiftHamperStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!GIFT_HAMPER_STATUSES.includes(status) || status === "pending") {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (!order.giftHamper?.gift?.name) {
      return res.status(400).json({
        success: false,
        message: "This order does not have a gift hamper",
      });
    }

    order.giftHamper.status = status;
    order.giftHamper.reviewedAt = new Date();
    order.giftHamper.reviewedBy = req.user._id;
    order.giftHamper.adminNote =
      typeof adminNote === "string" ? adminNote.trim().slice(0, 500) : "";

    await order.save();

    const populated = await populateOrderItems(order);
    res.status(200).json({
      success: true,
      message: status === "approved" ? "Gift hamper approved" : "Gift hamper rejected",
      data: enrichOrderForResponse(populated),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    await Payment.deleteMany({ order: order._id });
    await order.deleteOne();

    res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
