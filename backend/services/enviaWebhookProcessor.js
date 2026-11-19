import Order from "../models/order/Order.js";
import {
  isOutForDeliveryTracking,
  findOrderShipment,
  storeOrderShipment,
  getCombinedShipmentStatus,
  mergeOrderShipment,
} from "../utils/shipmentHelpers.js";
import { notifyOrderStatusChange } from "./orderNotificationDispatcher.js";
import { sendShipmentStatusUpdate } from "./notificationService.js";

function text(value) {
  return String(value || "").trim();
}

function normalizeEvents(rawEvents) {
  if (!Array.isArray(rawEvents)) return [];
  return rawEvents.map((event) => ({
    status: text(event.status || event.event || event.description),
    date: text(event.date || event.datetime || event.timestamp || event.createdAt),
    location: text(event.location || event.city || ""),
    description: text(event.description || event.details || ""),
  }));
}

export function extractEnviaWebhookPayload(body = {}) {
  const row = body?.data && typeof body.data === "object" ? body.data : body;
  const nested = Array.isArray(row) ? row[0] || {} : row;

  const trackingNumber = text(
    nested.tracking_number ||
      nested.trackingNumber ||
      body.tracking_number ||
      body.trackingNumber
  );

  const orderReference = text(
    nested.folio ||
      nested.reference ||
      nested.order_number ||
      nested.orderNumber ||
      nested.order_id ||
      body.folio ||
      body.reference ||
      body.order_number ||
      body.orderNumber
  )
    .replace(/\D/g, "")
    .slice(-6);

  const status = text(
    nested.status || nested.currentStatus || body.status || body.currentStatus
  );
  const statusMessage = text(
    nested.status_description ||
      nested.statusDescription ||
      nested.message ||
      nested.lastEvent ||
      body.statusMessage ||
      body.message
  );
  const trackUrl = text(nested.track_url || nested.trackUrl || body.trackUrl);
  const carrier = text(nested.carrier_name || nested.carrier || body.carrier);
  const location = text(nested.location || body.location);
  const events = normalizeEvents(
    nested.events || nested.history || body.events || body.history
  );

  return {
    trackingNumber,
    orderReference: /^\d{6}$/.test(orderReference) ? orderReference : "",
    status,
    statusMessage: statusMessage || location,
    trackUrl,
    carrier,
    events,
    eventType: text(body.type || body.event),
  };
}

async function findOrderForWebhook({ trackingNumber, orderReference }) {
  if (trackingNumber) {
    const byTracking = await Order.findOne({
      $or: [{ "shipment.trackingNumber": trackingNumber }, { "additionalShipments.trackingNumber": trackingNumber }],
    });
    if (byTracking) return byTracking;
  }

  if (orderReference) {
    const byOrderNumber = await Order.findOne({ orderNumber: orderReference });
    if (byOrderNumber) return byOrderNumber;
  }

  return null;
}

export async function processEnviaWebhookEvent(body = {}) {
  const payload = extractEnviaWebhookPayload(body);

  if (!payload.trackingNumber && !payload.orderReference) {
    console.warn("Envia webhook: missing tracking number and order reference");
    return { ok: false, reason: "missing_identifiers" };
  }

  const order = await findOrderForWebhook(payload);
  if (!order) {
    console.warn(
      `Envia webhook: no order matched (tracking=${payload.trackingNumber}, ref=${payload.orderReference})`
    );
    return { ok: false, reason: "order_not_found" };
  }

  let target;
  try {
    target = findOrderShipment(order, payload.trackingNumber);
  } catch {
    // Never replace a different parcel when only the order reference matched.
    return { ok: false, reason: "shipment_not_found" };
  }
  const previousStatus = order.status;
  const previousShipmentStatus = text(target?.status);
  const previousShipmentMessage = text(target?.statusMessage);

  const updated = mergeOrderShipment({ shipment: target }, {
    provider: "envia",
    carrier: payload.carrier || target?.carrier || "",
    trackingNumber: payload.trackingNumber || target?.trackingNumber || "",
    trackUrl: payload.trackUrl || target?.trackUrl || "",
    status: payload.status || target?.status || "",
    statusMessage: payload.statusMessage || target?.statusMessage || "",
    syncedAt: new Date(),
    events: payload.events.length ? payload.events : target?.events || [],
  });

  storeOrderShipment(order, updated, { trackingNumber: target?.trackingNumber });
  order.status = getCombinedShipmentStatus(order);

  await order.save();

  if (order.status !== previousStatus) {
    const notificationStage = isOutForDeliveryTracking({
      status: payload.status,
      statusMessage: payload.statusMessage,
      events: payload.events,
    })
      ? "out_for_delivery"
      : undefined;

    void notifyOrderStatusChange(order, previousStatus, { notificationStage });
  } else if (
    (payload.status && payload.status !== previousShipmentStatus) ||
    (payload.statusMessage && payload.statusMessage !== previousShipmentMessage)
  ) {
    if (order.user) {
      void sendShipmentStatusUpdate(order, {
        status: payload.status || updated.status,
        statusDescription: payload.statusMessage || updated.statusMessage,
        trackUrl: payload.trackUrl || updated.trackUrl,
      });
    }
  }

  return {
    ok: true,
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    shipmentStatus: updated.status,
  };
}
