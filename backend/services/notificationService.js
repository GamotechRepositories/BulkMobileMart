import User from "../models/user.js";
import Notification from "../models/Notification.js";
import { getFirebaseMessaging } from "../config/firebaseAdmin.js";

const ORDERS_CHANNEL_ID = "orders";

const INVALID_TOKEN_ERROR_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/invalid-argument",
]);

function isValidFcmToken(token) {
  return typeof token === "string" && token.trim().length > 20;
}

function stringifyDataPayload(data = {}) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, value == null ? "" : String(value)])
  );
}

function buildOrderData(order, extra = {}) {
  return stringifyDataPayload({
    type: extra.type || "order",
    orderId: order?._id?.toString() || "",
    orderNumber: order?.orderNumber || "",
    status: order?.status || "",
    ...extra,
  });
}

async function clearUserFcmToken(userId) {
  await User.findByIdAndUpdate(userId, {
    $set: {
      fcmToken: "",
      lastTokenUpdatedAt: new Date(),
    },
  });
  console.warn(`NotificationService: cleared invalid FCM token for user ${userId}`);
}

async function persistNotification({
  userId,
  title,
  body,
  type,
  orderId = null,
  data = {},
  fcmSent = false,
  fcmError = "",
}) {
  return Notification.create({
    user: userId,
    title,
    body,
    type,
    order: orderId,
    data,
    fcmSent,
    fcmError,
  });
}

async function handleMessagingError(error, userId) {
  const errorCode = error?.code || error?.errorInfo?.code || "";
  const message = error?.message || "FCM delivery failed";

  if (INVALID_TOKEN_ERROR_CODES.has(errorCode)) {
    await clearUserFcmToken(userId);
  }

  console.error(`NotificationService: FCM error [${errorCode || "unknown"}] — ${message}`);
  return message;
}

export async function sendToToken(token, { title, body, data = {} }) {
  if (!isValidFcmToken(token)) {
    return {
      success: false,
      error: "Invalid FCM token",
      skipped: true,
    };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return {
      success: false,
      error: "Firebase messaging is not configured",
      skipped: true,
    };
  }

  try {
    const messageId = await messaging.send({
      token: token.trim(),
      notification: {
        title,
        body,
      },
      data: stringifyDataPayload(data),
      android: {
        priority: "high",
        notification: {
          channelId: ORDERS_CHANNEL_ID,
          priority: "high",
        },
      },
    });

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error?.message || "FCM delivery failed",
      code: error?.code || error?.errorInfo?.code || "",
    };
  }
}

export async function sendToMultipleTokens(tokens, { title, body, data = {} }) {
  const validTokens = [...new Set(tokens.filter(isValidFcmToken).map((token) => token.trim()))];

  if (!validTokens.length) {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      error: "No valid FCM tokens provided",
    };
  }

  const messaging = getFirebaseMessaging();
  if (!messaging) {
    return {
      success: false,
      successCount: 0,
      failureCount: validTokens.length,
      error: "Firebase messaging is not configured",
    };
  }

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: validTokens,
      notification: { title, body },
      data: stringifyDataPayload(data),
      android: {
        priority: "high",
        notification: {
          channelId: ORDERS_CHANNEL_ID,
          priority: "high",
        },
      },
    });

    return {
      success: response.failureCount === 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    console.error("NotificationService: multicast send failed —", error.message);
    return {
      success: false,
      successCount: 0,
      failureCount: validTokens.length,
      error: error.message,
    };
  }
}

async function deliverToUser(userId, { title, body, type, order = null, data = {} }) {
  const resolvedUserId = userId?._id || userId;
  const user = await User.findById(resolvedUserId).select("fcmToken");
  if (!user) {
    return {
      success: false,
      error: "User not found",
      notification: null,
    };
  }

  const payloadData = {
    ...data,
    type,
    orderId: order?._id?.toString() || data.orderId || "",
    orderNumber: order?.orderNumber || data.orderNumber || "",
  };

  const notification = await persistNotification({
    userId: resolvedUserId,
    title,
    body,
    type,
    orderId: order?._id || null,
    data: payloadData,
    fcmSent: false,
  });

  if (!isValidFcmToken(user.fcmToken)) {
    return {
      success: true,
      delivered: false,
      notification,
      reason: "No FCM token registered",
    };
  }

  const result = await sendToToken(user.fcmToken, {
    title,
    body,
    data: payloadData,
  });

  if (result.success) {
    notification.fcmSent = true;
    notification.fcmError = "";
    await notification.save();

    return {
      success: true,
      delivered: true,
      notification,
      messageId: result.messageId,
    };
  }

  const fcmError = await handleMessagingError(
    { message: result.error, code: result.code },
    resolvedUserId
  );

  notification.fcmError = fcmError;
  await notification.save();

  return {
    success: true,
    delivered: false,
    notification,
    error: fcmError,
  };
}

function orderLabel(order) {
  return order?.orderNumber ? `#${order.orderNumber}` : "your order";
}

export async function sendOrderPlaced(order) {
  const title = "Order Placed";
  const body = `Your order ${orderLabel(order)} has been placed successfully.`;
  return deliverToUser(order.user, {
    title,
    body,
    type: "order_placed",
    order,
    data: buildOrderData(order, { type: "order_placed" }),
  });
}

export async function sendOrderConfirmed(order) {
  const title = "Order Confirmed";
  const body = `Your order ${orderLabel(order)} has been confirmed.`;
  return deliverToUser(order.user, {
    title,
    body,
    type: "order_confirmed",
    order,
    data: buildOrderData(order, { type: "order_confirmed" }),
  });
}

export async function sendOrderPacked(order) {
  const title = "Order Packed";
  const body = `Your order ${orderLabel(order)} has been packed and is ready to ship.`;
  return deliverToUser(order.user, {
    title,
    body,
    type: "order_packed",
    order,
    data: buildOrderData(order, { type: "order_packed" }),
  });
}

export async function sendOrderShipped(order) {
  const title = "Order Shipped";
  const body = `Your order ${orderLabel(order)} has been shipped.`;
  return deliverToUser(order.user, {
    title,
    body,
    type: "order_shipped",
    order,
    data: buildOrderData(order, { type: "order_shipped" }),
  });
}

export async function sendOutForDelivery(order) {
  const title = "Out For Delivery";
  const body = `Your order ${orderLabel(order)} is out for delivery.`;
  return deliverToUser(order.user, {
    title,
    body,
    type: "out_for_delivery",
    order,
    data: buildOrderData(order, { type: "out_for_delivery" }),
  });
}

export async function sendDelivered(order) {
  const title = "Order Delivered";
  const body = `Your order ${orderLabel(order)} has been delivered.`;
  return deliverToUser(order.user, {
    title,
    body,
    type: "order_delivered",
    order,
    data: buildOrderData(order, { type: "order_delivered" }),
  });
}

export async function sendPaymentSuccess(order, extra = {}) {
  const title = "Payment Successful";
  const body = `Payment for order ${orderLabel(order)} was successful.`;
  return deliverToUser(order.user, {
    title,
    body,
    type: "payment_success",
    order,
    data: buildOrderData(order, { type: "payment_success", ...extra }),
  });
}

export async function sendPaymentFailed(order, extra = {}) {
  const title = "Payment Failed";
  const body = `Payment for order ${orderLabel(order)} could not be completed.`;
  return deliverToUser(order.user, {
    title,
    body,
    type: "payment_failed",
    order,
    data: buildOrderData(order, { type: "payment_failed", ...extra }),
  });
}

export async function sendOffer(userId, { title, body, data = {} }) {
  return deliverToUser(userId, {
    title,
    body,
    type: "offer",
    data: stringifyDataPayload({ ...data, type: "offer" }),
  });
}

export async function sendCustomNotification(userId, { title, body, type = "custom", data = {} }) {
  return deliverToUser(userId, {
    title,
    body,
    type,
    data: stringifyDataPayload({ ...data, type }),
  });
}

export async function sendTestNotification(userId) {
  return deliverToUser(userId, {
    title: "Test Notification",
    body: "BulkMobileMart push notifications are working correctly.",
    type: "test",
    data: { type: "test" },
  });
}
