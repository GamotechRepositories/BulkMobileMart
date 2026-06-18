const ENV_UPI_ID = String(import.meta.env.VITE_MERCHANT_UPI_ID || "").trim();
const ENV_UPI_NAME = (import.meta.env.VITE_MERCHANT_UPI_NAME || "").trim();

export function getPayableAmount(orderTotal, paymentMethod) {
  if (paymentMethod === "cod") {
    return Math.round(orderTotal * 0.1 * 100) / 100;
  }
  return Math.round(orderTotal * 100) / 100;
}

function sanitizeNote(note) {
  return String(note || "Order")
    .replace(/%/g, "")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .slice(0, 40);
}

export function resolveMerchantUpiConfig(config = {}) {
  const upiId = String(config.merchantUpiId || config.upiId || ENV_UPI_ID || "").trim();
  const upiName = String(
    config.merchantUpiName || config.upiName || ENV_UPI_NAME || "BulkMobileMart"
  ).trim();

  return { upiId, upiName };
}

/** NPCI-style query string — encodeURIComponent (%20), not URLSearchParams (+) */
export function buildUpiQuery(amount, note, config = {}) {
  const { upiId, upiName } = resolveMerchantUpiConfig(config);
  if (!upiId) {
    return "";
  }

  const parts = [
    `pa=${encodeURIComponent(upiId)}`,
    `am=${encodeURIComponent(amount.toFixed(2))}`,
    `cu=INR`,
  ];

  if (upiName) {
    parts.splice(1, 0, `pn=${encodeURIComponent(upiName)}`);
  }

  const safeNote = sanitizeNote(note);
  if (safeNote) {
    parts.push(`tn=${encodeURIComponent(safeNote)}`);
  }

  return parts.join("&");
}

export function buildUpiUri(amount, note, config = {}) {
  const query = buildUpiQuery(amount, note, config);
  return query ? `upi://pay?${query}` : "";
}

export function getQrCodeImageUrl(amount, note, config = {}) {
  const uri = buildUpiUri(amount, note, config);
  if (!uri) return "";
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(uri)}`;
}

export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isValidUpiId(value) {
  return /^[\w.-]+@[\w.-]+$/.test(String(value || "").trim());
}

/**
 * Opens the OS UPI app picker — only installed UPI apps are shown.
 * Android: intent:// URL triggers the native "Open with" dialog.
 * iOS/other: falls back to upi:// scheme.
 */
export function openUpiAppChooser(amount, note, config = {}) {
  const query = buildUpiQuery(amount, note, config);
  if (!query || typeof window === "undefined") return false;

  const upiUrl = `upi://pay?${query}`;
  const ua = navigator.userAgent || "";
  const isAndroid = /android/i.test(ua);

  const targetUrl = isAndroid
    ? `intent://pay?${query}#Intent;scheme=upi;end`
    : upiUrl;

  try {
    // window.location is most reliable for Android intent:// in mobile Chrome
    window.location.assign(targetUrl);
  } catch {
    const link = document.createElement("a");
    link.href = targetUrl;
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return isMobileDevice();
}
