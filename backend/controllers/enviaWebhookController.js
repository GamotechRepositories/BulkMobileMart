import Order from "../models/order/Order.js";

function text(value) {
  return String(value || "").trim();
}

function normalizeEvents(rawEvents) {
  if (!Array.isArray(rawEvents)) return [];
  return rawEvents.map((event) => ({
    status: text(event.status || event.event || event.description),
    date: text(event.date || event.datetime || event.createdAt),
    location: text(event.location || event.city || ""),
    description: text(event.description || event.details || ""),
  }));
}

function extractWebhookPayload(body = {}) {
  const row = Array.isArray(body.data) ? body.data[0] || {} : body;
  const trackingNumber = text(
    row.trackingNumber || row.tracking_number || body.trackingNumber || body.tracking_number
  );
  const status = text(row.status || row.currentStatus || body.status);
  const statusMessage = text(row.message || row.lastEvent || body.statusMessage);
  const trackUrl = text(row.trackUrl || body.trackUrl);
  const events = normalizeEvents(row.events || row.history || body.events || body.history);

  return { trackingNumber, status, statusMessage, trackUrl, events };
}

export const handleEnviaWebhook = async (req, res) => {
  try {
    const expectedSecret = text(process.env.ENVIA_WEBHOOK_SECRET);
    if (expectedSecret) {
      const received =
        text(req.headers["x-webhook-secret"]) ||
        text(req.headers["x-envia-secret"]) ||
        text(req.query.secret);
      if (!received || received !== expectedSecret) {
        return res.status(401).json({ success: false, message: "Invalid webhook secret" });
      }
    }

    const payload = extractWebhookPayload(req.body || {});
    if (!payload.trackingNumber) {
      return res.status(400).json({ success: false, message: "trackingNumber is required" });
    }

    const order = await Order.findOne({
      "shipment.trackingNumber": payload.trackingNumber,
    });
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found for tracking" });
    }

    order.shipment = {
      ...order.shipment,
      provider: "envia",
      trackingNumber: payload.trackingNumber,
      trackUrl: payload.trackUrl || order.shipment?.trackUrl || "",
      status: payload.status || order.shipment?.status || "",
      statusMessage: payload.statusMessage || "",
      events: payload.events.length ? payload.events : order.shipment?.events || [],
      syncedAt: new Date(),
    };

    const normalized = payload.status.toLowerCase();
    if (normalized.includes("delivered")) {
      order.status = "delivered";
    } else if (
      (normalized.includes("transit") || normalized.includes("shipped")) &&
      ["confirm", "processing"].includes(order.status)
    ) {
      order.status = "shipping";
    }

    await order.save();
    res.status(200).json({ success: true, message: "Webhook processed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
