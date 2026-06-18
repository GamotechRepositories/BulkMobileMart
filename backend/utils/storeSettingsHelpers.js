import StoreSettings from "../models/StoreSettings.js";

export const DEFAULT_STORE_SETTINGS = {
  minimumOrderValue: 3000,
  minimumShippingCharge: 280,
  shippingSlabs: [
    { orderAmount: 3000, shippingCharge: 280 },
    { orderAmount: 5000, shippingCharge: 350 },
    { orderAmount: 8000, shippingCharge: 550 },
    { orderAmount: 12000, shippingCharge: 800 },
  ],
  merchantUpiId: "",
  merchantUpiName: "BulkMobileMart",
  cartNoticeEn: [
    "Please Verify Your Address Before Placing Your Order.",
    "Minimum order value ₹{{minOrder}}",
    "Parcel opening video is must for return.",
    "Shipping depends on parcel weight minimum Rs {{minShipping}}.",
    "User have to pay shipping charges in advance.",
  ],
  cartNoticeHi: [
    "कृपया अपना पूरा पता ठीक से लिखें ऑर्डर करने से पहले। इसके बाद ऑर्डर करें।",
    "न्यूनतम ऑर्डर मूल्य {{minOrder}}.",
    "पार्सल वापसी के लिए पार्सल खोलने का वीडियो अनिवार्य है।",
    "शिपिंग पार्सल के वजन पर निर्भर करता है न्यूनतम {{minShipping}}/",
    "उपयोगकर्ता को शिपिंग शुल्क अग्रिम रूप से देना होगा।",
  ],
};

let cachedSettings = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

export function normalizeShippingSlabs(slabs = []) {
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

export function serializeStoreSettings(doc) {
  const source = doc?.toObject ? doc.toObject() : doc || {};
  const minimumOrderValue =
    Number(source.minimumOrderValue) || DEFAULT_STORE_SETTINGS.minimumOrderValue;
  const minimumShippingCharge =
    Number(source.minimumShippingCharge) ||
    DEFAULT_STORE_SETTINGS.minimumShippingCharge;
  const shippingSlabs = normalizeShippingSlabs(
    source.shippingSlabs?.length
      ? source.shippingSlabs
      : DEFAULT_STORE_SETTINGS.shippingSlabs
  );

  return {
    minimumOrderValue,
    minimumShippingCharge,
    shippingSlabs,
    merchantUpiId: String(source.merchantUpiId || "").trim(),
    merchantUpiName:
      String(source.merchantUpiName || "").trim() ||
      DEFAULT_STORE_SETTINGS.merchantUpiName,
    cartNoticeEn:
      source.cartNoticeEn?.length > 0
        ? source.cartNoticeEn
        : DEFAULT_STORE_SETTINGS.cartNoticeEn,
    cartNoticeHi:
      source.cartNoticeHi?.length > 0
        ? source.cartNoticeHi
        : DEFAULT_STORE_SETTINGS.cartNoticeHi,
  };
}

export function calculateShippingCharge(subtotal, settings) {
  const amount = Number(subtotal) || 0;
  const minShipping =
    Number(settings?.minimumShippingCharge) ||
    DEFAULT_STORE_SETTINGS.minimumShippingCharge;
  const slabs = normalizeShippingSlabs(
    settings?.shippingSlabs || DEFAULT_STORE_SETTINGS.shippingSlabs
  );

  if (!slabs.length) {
    return minShipping;
  }

  let charge = minShipping;
  for (const slab of slabs) {
    if (amount >= slab.orderAmount) {
      charge = slab.shippingCharge;
    }
  }

  return charge;
}

export function meetsMinimumOrder(subtotal, settings) {
  const amount = Number(subtotal) || 0;
  const minimum =
    Number(settings?.minimumOrderValue) ||
    DEFAULT_STORE_SETTINGS.minimumOrderValue;
  return amount >= minimum;
}

export async function getStoreSettings({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && cachedSettings && cacheExpiresAt > now) {
    return cachedSettings;
  }

  let doc = await StoreSettings.findOne({ key: "store" });
  if (!doc) {
    doc = await StoreSettings.create({ key: "store" });
  }

  cachedSettings = serializeStoreSettings(doc);
  cacheExpiresAt = now + CACHE_TTL_MS;
  return cachedSettings;
}

export function clearStoreSettingsCache() {
  cachedSettings = null;
  cacheExpiresAt = 0;
}
