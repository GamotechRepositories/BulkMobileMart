const PLACEHOLDER_PATTERN = /^(your|xxx|test)/i;

const endpoint =
  process.env.WHATSAPP_ENDPOINT?.trim() ||
  "https://api.voxup.ai/api/v1/campaigns/api/send";

const apiKeys = {
  order_confirmation: process.env.WHATSAPP_ORDER_CONFIRMATION_API_KEY?.trim() || "",
  invoice_sent: process.env.WHATSAPP_INVOICE_API_KEY?.trim() || "",
  order_tracking: process.env.WHATSAPP_ORDER_TRACKING_API_KEY?.trim() || "",
  order_delivered: process.env.WHATSAPP_ORDER_DELIVERED_API_KEY?.trim() || "",
};

export const whatsappConfig = {
  endpoint,
  apiKeys,
  publicWebUrl: (
    process.env.PUBLIC_WEB_URL ||
    process.env.STORE_URL ||
    "https://www.bulkmobilemart.in"
  ).replace(/\/$/, ""),
};

export function getWhatsAppApiKey(messageType) {
  return apiKeys[messageType] || "";
}

export function isWhatsAppMessageConfigured(messageType) {
  const key = getWhatsAppApiKey(messageType);
  if (!endpoint || !key) return false;
  if (PLACEHOLDER_PATTERN.test(key)) return false;
  return true;
}

export function isWhatsAppConfigured() {
  return Object.keys(apiKeys).some((type) => isWhatsAppMessageConfigured(type));
}
