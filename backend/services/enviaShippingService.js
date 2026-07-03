import axios from "axios";

import StoreSettings from "../models/StoreSettings.js";

const TEST_BASE_URL = "https://api-test.envia.com";
const PROD_BASE_URL = "https://api.envia.com";
const GEOCODE_BASE_URL = "https://geocodes.envia.com";

const INDIA_STATE_ALIASES = {
  "andhra pradesh": "AP",
  "arunachal pradesh": "AR",
  assam: "AS",
  bihar: "BR",
  chhattisgarh: "CG",
  goa: "GA",
  gujarat: "GJ",
  haryana: "HR",
  "himachal pradesh": "HP",
  jharkhand: "JH",
  karnataka: "KA",
  kerala: "KL",
  "madhya pradesh": "MP",
  maharashtra: "MH",
  maharastra: "MH",
  manipur: "MN",
  meghalaya: "ML",
  mizoram: "MZ",
  nagaland: "NL",
  odisha: "OR",
  orissa: "OR",
  punjab: "PB",
  rajasthan: "RJ",
  sikkim: "SK",
  "tamil nadu": "TN",
  telangana: "TG",
  tripura: "TR",
  "uttar pradesh": "UP",
  uttarakhand: "UT",
  "west bengal": "WB",
  delhi: "DL",
  "new delhi": "DL",
  "jammu and kashmir": "JK",
  ladakh: "LA",
  puducherry: "PY",
  pondicherry: "PY",
  chandigarh: "CH",
  ap: "AP",
  ar: "AR",
  as: "AS",
  br: "BR",
  cg: "CG",
  ga: "GA",
  gj: "GJ",
  hr: "HR",
  hp: "HP",
  jh: "JH",
  ka: "KA",
  kl: "KL",
  mp: "MP",
  mh: "MH",
  mn: "MN",
  ml: "ML",
  mz: "MZ",
  nl: "NL",
  or: "OR",
  pb: "PB",
  rj: "RJ",
  sk: "SK",
  tn: "TN",
  tg: "TG",
  tr: "TR",
  up: "UP",
  ut: "UT",
  wb: "WB",
  dl: "DL",
  jk: "JK",
  la: "LA",
  py: "PY",
  ch: "CH",
};

const pincodeStateCache = new Map();

function safeTrim(value) {
  return String(value || "").trim();
}

function toPositiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normalizeIndiaPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (String(phone || "").trim().startsWith("+")) return String(phone).trim();
  return String(phone || "").trim();
}

function lookupIndiaStateAlias(state) {
  const normalized = safeTrim(state).toLowerCase();
  if (!normalized) return "";
  if (/^[a-z]{2}$/i.test(normalized)) {
    return normalized.toUpperCase();
  }
  return INDIA_STATE_ALIASES[normalized] || "";
}

async function resolveIndiaStateCode(state, postalCode) {
  const alias = lookupIndiaStateAlias(state);
  if (alias) return alias;

  const pin = safeTrim(postalCode);
  if (!/^\d{6}$/.test(pin)) {
    return safeTrim(state);
  }

  if (pincodeStateCache.has(pin)) {
    return pincodeStateCache.get(pin);
  }

  try {
    const response = await axios.get(`${GEOCODE_BASE_URL}/zipcode/IN/${pin}`, {
      timeout: 8_000,
    });
    const code = safeTrim(response.data?.[0]?.state?.code?.["2digit"]);
    if (code) {
      pincodeStateCache.set(pin, code);
      return code;
    }
  } catch {
    // Fall back to the provided state text when geocode lookup fails.
  }

  return safeTrim(state);
}

async function normalizeEnviaAddress(address = {}) {
  const country = safeTrim(address.country || "IN").toUpperCase();
  const postalCode = safeTrim(address.postalCode);
  const state =
    country === "IN"
      ? await resolveIndiaStateCode(address.state, postalCode)
      : safeTrim(address.state);

  return {
    ...address,
    name: safeTrim(address.name),
    company: safeTrim(address.company),
    email: safeTrim(address.email),
    phone: normalizeIndiaPhone(address.phone),
    street: safeTrim(address.street),
    number: safeTrim(address.number) || "1",
    city: safeTrim(address.city),
    state,
    country,
    postalCode,
  };
}

function extractEnviaError(error) {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }
  if (data?.error?.message) {
    return safeTrim(data.error.message);
  }
  if (data?.message) {
    return safeTrim(data.message);
  }
  if (Array.isArray(data?.data)) {
    const rowMessage = safeTrim(data.data[0]?.message || data.data[0]?.error);
    if (rowMessage) return rowMessage;
  }
  return safeTrim(error?.message) || "Envia shipment request failed";
}

async function resolveEnviaConfig() {
  const settings = await StoreSettings.findOne({ key: "store" }).lean();
  const envia = settings?.envia || {};

  const tokenFromEnv = safeTrim(process.env.ENVIA_API_TOKEN);
  const tokenFromSettings = safeTrim(envia.apiToken);
  const token = tokenFromEnv || tokenFromSettings;

  const useSandbox = process.env.ENVIA_USE_SANDBOX
    ? process.env.ENVIA_USE_SANDBOX === "true"
    : envia.useSandbox !== false;

  const enabled = process.env.ENVIA_FORCE_ENABLE
    ? process.env.ENVIA_FORCE_ENABLE === "true"
    : Boolean(envia.enabled);

  return {
    enabled,
    token,
    useSandbox,
    defaultCarrier: safeTrim(process.env.ENVIA_DEFAULT_CARRIER || envia.defaultCarrier),
    defaultService: safeTrim(process.env.ENVIA_DEFAULT_SERVICE || envia.defaultService),
    origin: {
      name: safeTrim(envia.origin?.name),
      company: safeTrim(envia.origin?.company),
      email: safeTrim(envia.origin?.email),
      phone: safeTrim(envia.origin?.phone),
      street: safeTrim(envia.origin?.street),
      city: safeTrim(envia.origin?.city),
      state: safeTrim(envia.origin?.state),
      country: safeTrim(envia.origin?.country || "IN").toUpperCase(),
      postalCode: safeTrim(envia.origin?.postalCode),
    },
    packageDefaults: {
      type: safeTrim(envia.packageDefaults?.type || "box"),
      content: safeTrim(envia.packageDefaults?.content || "Mobile accessories"),
      amount: Math.max(1, Math.round(toPositiveNumber(envia.packageDefaults?.amount, 1))),
      weightUnit: safeTrim(envia.packageDefaults?.weightUnit || "KG").toUpperCase(),
      lengthUnit: safeTrim(envia.packageDefaults?.lengthUnit || "CM").toUpperCase(),
      weight: toPositiveNumber(envia.packageDefaults?.weight, 1),
      length: toPositiveNumber(envia.packageDefaults?.length, 20),
      width: toPositiveNumber(envia.packageDefaults?.width, 15),
      height: toPositiveNumber(envia.packageDefaults?.height, 10),
    },
  };
}

function buildClient(baseUrl, token) {
  return axios.create({
    baseURL: baseUrl,
    timeout: 25_000,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

function ensureConfigUsable(config) {
  if (!config.enabled) {
    throw new Error("Envia is disabled in store settings");
  }
  if (!config.token) {
    throw new Error("Envia API token is missing");
  }
  const requiredOrigin = ["name", "phone", "street", "city", "state", "country", "postalCode"];
  const missing = requiredOrigin.filter((key) => !safeTrim(config.origin[key]));
  if (missing.length) {
    throw new Error(`Envia origin is incomplete. Missing: ${missing.join(", ")}`);
  }
}

function mapAddressToDestination(address = {}) {
  return {
    name: safeTrim(address.fullName),
    company: safeTrim(address.shopName),
    email: safeTrim(address.email),
    phone: safeTrim(address.number),
    street: safeTrim(address.fullAddress),
    city: safeTrim(address.city),
    state: safeTrim(address.state),
    country: "IN",
    postalCode: safeTrim(address.pincode),
    number: safeTrim(address.shopNo) || "1",
  };
}

function mapOriginForEnvia(origin = {}) {
  return {
    name: safeTrim(origin.name),
    company: safeTrim(origin.company),
    email: safeTrim(origin.email),
    phone: safeTrim(origin.phone),
    street: safeTrim(origin.street),
    number: safeTrim(origin.streetNumber) || "1",
    city: safeTrim(origin.city),
    state: safeTrim(origin.state),
    country: safeTrim(origin.country || "IN").toUpperCase(),
    postalCode: safeTrim(origin.postalCode),
  };
}

function buildShipmentPayload(order, config, overrides = {}) {
  const destination = mapAddressToDestination(order.deliveryAddress || {});
  const requiredDestination = ["name", "phone", "street", "city", "state", "postalCode"];
  const missing = requiredDestination.filter((key) => !safeTrim(destination[key]));
  if (missing.length) {
    throw new Error(`Order address is incomplete. Missing: ${missing.join(", ")}`);
  }

  const carrier = safeTrim(overrides.carrier || config.defaultCarrier);
  const service = safeTrim(overrides.service || config.defaultService);
  if (!carrier || !service) {
    throw new Error("Carrier and service are required to create Envia shipment");
  }

  const defaults = config.packageDefaults;
  const packages = [
    {
      type: safeTrim(overrides.packageType || defaults.type),
      content: safeTrim(overrides.content || defaults.content),
      amount: Math.max(1, Math.round(toPositiveNumber(overrides.amount, defaults.amount))),
      weightUnit: safeTrim(overrides.weightUnit || defaults.weightUnit).toUpperCase(),
      lengthUnit: safeTrim(overrides.lengthUnit || defaults.lengthUnit).toUpperCase(),
      weight: toPositiveNumber(overrides.weight, defaults.weight),
      dimensions: {
        length: toPositiveNumber(overrides.length, defaults.length),
        width: toPositiveNumber(overrides.width, defaults.width),
        height: toPositiveNumber(overrides.height, defaults.height),
      },
      declaredValue: toPositiveNumber(overrides.declaredValue, order.total || 1),
    },
  ];

  return {
    origin: mapOriginForEnvia(config.origin),
    destination,
    packages,
    settings: {
      currency: "INR",
      printFormat: "PDF",
      printSize: "STOCK_4X6",
    },
    shipment: {
      type: 1,
      carrier,
      service,
    },
  };
}

function pickGeneratedShipmentData(responseData = {}) {
  if (responseData?.meta === "error" || responseData?.error) {
    throw new Error(extractEnviaError({ response: { data: responseData } }));
  }

  const row = Array.isArray(responseData?.data) ? responseData.data[0] : null;
  if (!row) {
    throw new Error("Envia did not return shipment data");
  }
  return {
    provider: "envia",
    carrier: safeTrim(row.carrier),
    service: safeTrim(row.service),
    shipmentId: safeTrim(row.shipmentId || row.folio || ""),
    trackingNumber: safeTrim(row.trackingNumber || row.guideNumber || ""),
    trackUrl: safeTrim(row.trackUrl || ""),
    labelUrl: safeTrim(row.label || ""),
    status: safeTrim(row.status || ""),
    statusMessage: safeTrim(row.message || ""),
    syncedAt: new Date(),
    events: [],
    raw: row,
  };
}

function pickTrackingData(responseData = {}, fallbackTracking = "") {
  const row = Array.isArray(responseData?.data) ? responseData.data[0] : null;
  if (!row) {
    throw new Error("Envia did not return tracking data");
  }

  const trackingEvents = Array.isArray(row.events || row.history)
    ? (row.events || row.history).map((event) => ({
        status: safeTrim(event.status || event.event || event.description),
        date: safeTrim(event.date || event.datetime || event.createdAt),
        location: safeTrim(event.location || event.city || ""),
        description: safeTrim(event.description || event.details || ""),
      }))
    : [];

  return {
    status: safeTrim(row.status || row.currentStatus || ""),
    statusMessage: safeTrim(row.message || row.lastEvent || ""),
    trackUrl: safeTrim(row.trackUrl || ""),
    trackingNumber: safeTrim(row.trackingNumber || fallbackTracking),
    syncedAt: new Date(),
    events: trackingEvents,
    raw: row,
  };
}

export async function createEnviaShipment(order, overrides = {}) {
  const config = await resolveEnviaConfig();
  ensureConfigUsable(config);

  const baseURL = config.useSandbox ? TEST_BASE_URL : PROD_BASE_URL;
  const client = buildClient(baseURL, config.token);
  const payload = buildShipmentPayload(order, config, overrides);
  payload.origin = await normalizeEnviaAddress(payload.origin);
  payload.destination = await normalizeEnviaAddress(payload.destination);

  try {
    const response = await client.post("/ship/generate/", payload);
    return pickGeneratedShipmentData(response.data);
  } catch (error) {
    let message = extractEnviaError(error);
    const authFailed = /auth/i.test(message) || error?.response?.status === 401;
    if (authFailed && config.useSandbox) {
      message +=
        " Your token works on production Envia, but sandbox mode is ON. Turn off \"Use sandbox\" in admin, or use a token from ship-test.envia.com.";
    } else if (authFailed && !config.useSandbox) {
      message +=
        " Use a production token from ship.envia.com, or enable sandbox and use a ship-test.envia.com token.";
    }
    throw new Error(message);
  }
}

export async function trackEnviaShipment(trackingNumber) {
  const config = await resolveEnviaConfig();
  ensureConfigUsable(config);
  const normalized = safeTrim(trackingNumber);
  if (!normalized) {
    throw new Error("Tracking number is required");
  }

  const baseURL = config.useSandbox ? TEST_BASE_URL : PROD_BASE_URL;
  const client = buildClient(baseURL, config.token);
  const response = await client.post("/ship/generaltrack/", {
    trackingNumbers: [normalized],
  });
  return pickTrackingData(response.data, normalized);
}

function applyShipmentOnOrder(order, shipment) {
  order.shipment = {
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
  };
}

export async function autoCreateShipmentForOrder(order, reason = "auto") {
  if (!order || order.shipment?.trackingNumber || order.status === "cancelled") {
    return order;
  }

  try {
    const shipment = await createEnviaShipment(order);
    applyShipmentOnOrder(order, shipment);
    if (["confirm", "processing"].includes(order.status)) {
      order.status = "shipping";
    }
    await order.save();
    return order;
  } catch (error) {
    const message = extractEnviaError(error);
    order.shipment = {
      provider: "envia",
      carrier: order.shipment?.carrier || "",
      service: order.shipment?.service || "",
      shipmentId: order.shipment?.shipmentId || "",
      trackingNumber: "",
      trackUrl: order.shipment?.trackUrl || "",
      labelUrl: order.shipment?.labelUrl || "",
      status: "failed",
      statusMessage: message,
      syncedAt: new Date(),
      events: order.shipment?.events || [],
    };
    await order.save();
    console.error(`Auto shipment failed for order ${order._id} (${reason}): ${message}`);
    return order;
  }
}
