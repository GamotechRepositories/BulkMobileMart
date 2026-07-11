export function getDefaultManualTracking() {
  return {
    enabled: false,
    note: "",
    evidenceUrl: "",
    evidenceName: "",
    updatedAt: null,
  };
}

export function resolveManualTracking(existing) {
  if (!existing || typeof existing !== "object") {
    return getDefaultManualTracking();
  }

  const plain =
    typeof existing.toObject === "function" ? existing.toObject() : existing;

  return {
    enabled: Boolean(plain.enabled),
    note: String(plain.note || "").trim(),
    evidenceUrl: String(plain.evidenceUrl || "").trim(),
    evidenceName: String(plain.evidenceName || "").trim(),
    updatedAt: plain.updatedAt || null,
  };
}

export function getShipmentPlain(shipment) {
  if (!shipment) return {};
  return typeof shipment.toObject === "function" ? shipment.toObject() : { ...shipment };
}

export function mergeOrderShipment(order, updates = {}) {
  const existing = getShipmentPlain(order?.shipment);
  const { manualTracking: manualTrackingUpdate, ...restUpdates } = updates;

  return {
    ...existing,
    ...restUpdates,
    manualTracking: resolveManualTracking(
      manualTrackingUpdate !== undefined
        ? manualTrackingUpdate
        : existing.manualTracking
    ),
  };
}

/** Empty shipment so admin can create a new Envia label. */
export function getClearedShipment() {
  return {
    provider: "",
    carrier: "",
    service: "",
    shipmentId: "",
    trackingNumber: "",
    trackUrl: "",
    labelUrl: "",
    status: "",
    statusMessage: "",
    syncedAt: null,
    events: [],
    note: "",
    evidenceUrl: "",
    evidenceName: "",
    manualTracking: getDefaultManualTracking(),
  };
}
