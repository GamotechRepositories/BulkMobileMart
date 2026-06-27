import {
  sendOrderPlaced,
  sendOrderConfirmed,
  sendOrderPacked,
  sendOrderShipped,
  sendOutForDelivery,
  sendDelivered,
  sendPaymentSuccess,
  sendPaymentFailed,
} from "./notificationService.js";

function logDispatchFailure(context, error) {
  console.error(`OrderNotificationDispatcher [${context}]:`, error?.message || error);
}

export async function notifyOrderCreated(order, { previousStatus = null } = {}) {
  if (!order?.user) {
    return null;
  }

  try {
    if (previousStatus === "attempted") {
      return await sendOrderConfirmed(order);
    }

    return await sendOrderPlaced(order);
  } catch (error) {
    logDispatchFailure("notifyOrderCreated", error);
    return null;
  }
}

export async function notifyOrderStatusChange(order, previousStatus, options = {}) {
  if (!order?.user || !previousStatus || order.status === previousStatus) {
    return null;
  }

  try {
    if (options.notificationStage === "out_for_delivery") {
      return await sendOutForDelivery(order);
    }

    switch (order.status) {
      case "confirm":
        if (previousStatus !== "confirm") {
          return await sendOrderConfirmed(order);
        }
        return null;
      case "processing":
        return await sendOrderPacked(order);
      case "shipping":
        return await sendOrderShipped(order);
      case "delivered":
        return await sendDelivered(order);
      default:
        return null;
    }
  } catch (error) {
    logDispatchFailure("notifyOrderStatusChange", error);
    return null;
  }
}

export async function notifyPaymentSuccess(order, extra = {}) {
  if (!order?.user) {
    return null;
  }

  try {
    return await sendPaymentSuccess(order, extra);
  } catch (error) {
    logDispatchFailure("notifyPaymentSuccess", error);
    return null;
  }
}

export async function notifyPaymentFailed(order, extra = {}) {
  if (!order?.user) {
    return null;
  }

  try {
    return await sendPaymentFailed(order, extra);
  } catch (error) {
    logDispatchFailure("notifyPaymentFailed", error);
    return null;
  }
}
