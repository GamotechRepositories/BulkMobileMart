import { calculateDeliveryCharges } from "../../../shared/shipping/deliveryCharges.js";
export const DEFAULT_STORE_SETTINGS = {
  minimumOrderValue: 3000,
  minimumShippingCharge: 280,
  shippingSlabs: [
    { orderAmount: 3000, shippingCharge: 280 },
    { orderAmount: 5000, shippingCharge: 350 },
    { orderAmount: 8000, shippingCharge: 550 },
    { orderAmount: 12000, shippingCharge: 800 },
  ],
};

function normalizeShippingSlabs(slabs = []) {
  return [...slabs]
    .map((slab) => ({
      orderAmount: Number(slab.orderAmount),
      shippingCharge: Number(slab.shippingCharge),
    }))
    .filter(
      (slab) =>
        Number.isFinite(slab.orderAmount) &&
        Number.isFinite(slab.shippingCharge) &&
        slab.orderAmount >= 0 &&
        slab.shippingCharge >= 0
    )
    .sort((a, b) => a.orderAmount - b.orderAmount);
}

export function mergeStoreSettings(settings) {
  const source = settings || {};
  return {
    minimumOrderValue:
      Number(source.minimumOrderValue) || DEFAULT_STORE_SETTINGS.minimumOrderValue,
    minimumShippingCharge:
      Number(source.minimumShippingCharge ?? DEFAULT_STORE_SETTINGS.minimumShippingCharge),
    shippingSlabs: normalizeShippingSlabs(
      source.shippingSlabs?.length
        ? source.shippingSlabs
        : DEFAULT_STORE_SETTINGS.shippingSlabs
    ),
  };
}

export function calculateShippingCharge(subtotal, settings, options = {}) {
  const configured = Number(settings?.minimumShippingCharge ?? DEFAULT_STORE_SETTINGS.minimumShippingCharge);
  return calculateDeliveryCharges({
    baseShippingCharge: Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_STORE_SETTINGS.minimumShippingCharge,
    orderValue: subtotal,
    ...options,
  }).deliveryCharges;
}

export function meetsMinimumOrder(subtotal, settings) {
  const amount = Number(subtotal) || 0;
  const merged = mergeStoreSettings(settings);
  return amount >= merged.minimumOrderValue;
}

export function getMinimumOrderShortfall(subtotal, settings) {
  const merged = mergeStoreSettings(settings);
  return Math.max(0, merged.minimumOrderValue - (Number(subtotal) || 0));
}
