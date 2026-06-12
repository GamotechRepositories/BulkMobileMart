const MERCHANT_UPI_ID =
  import.meta.env.VITE_MERCHANT_UPI_ID 
// Name on your UPI account — set VITE_MERCHANT_UPI_NAME in .env (omit pn if empty)
const MERCHANT_NAME = (import.meta.env.VITE_MERCHANT_UPI_NAME || "").trim();

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

/** NPCI-style query string — encodeURIComponent (%20), not URLSearchParams (+) */
function buildUpiQuery(amount, note) {
  const parts = [
    `pa=${encodeURIComponent(MERCHANT_UPI_ID.trim())}`,
    `am=${encodeURIComponent(amount.toFixed(2))}`,
    `cu=INR`,
  ];

  if (MERCHANT_NAME) {
    parts.splice(1, 0, `pn=${encodeURIComponent(MERCHANT_NAME)}`);
  }

  const safeNote = sanitizeNote(note);
  if (safeNote) {
    parts.push(`tn=${encodeURIComponent(safeNote)}`);
  }

  return parts.join("&");
}

export function buildUpiUri(amount, note) {
  return `upi://pay?${buildUpiQuery(amount, note)}`;
}

export function getQrCodeImageUrl(amount, note) {
  const uri = buildUpiUri(amount, note);
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=4&data=${encodeURIComponent(uri)}`;
}

export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isValidUpiId(value) {
  return /^[\w.-]+@[\w.-]+$/.test(String(value || "").trim());
}

/**
 * Opens the phone's native "Open with" sheet (GPay, PhonePe, Paytm, etc.)
 */
export function openUpiAppChooser(amount, note) {
  const query = buildUpiQuery(amount, note);
  const upiUrl = `upi://pay?${query}`;
  const ua = navigator.userAgent || "";
  const isAndroid = /android/i.test(ua);

  const targetUrl = isAndroid
    ? `intent://pay?${query}#Intent;scheme=upi;end`
    : upiUrl;

  const link = document.createElement("a");
  link.href = targetUrl;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return isMobileDevice();
}
