import { buildUpiQuery, isMobileDevice } from "./upiPayment";

export const UPI_APP_OPTIONS = [
  {
    id: "gpay",
    label: "Google Pay",
    shortLabel: "GPay",
    color: "#4285F4",
    uriPrefix: "tez://upi/pay?",
  },
  {
    id: "phonepe",
    label: "PhonePe",
    shortLabel: "Pe",
    color: "#5F259F",
    uriPrefix: "phonepe://pay?",
  },
  {
    id: "paytm",
    label: "Paytm",
    shortLabel: "Tm",
    color: "#00BAF2",
    uriPrefix: "paytmmp://pay?",
  },
  {
    id: "bhim",
    label: "BHIM UPI",
    shortLabel: "BHIM",
    color: "#0984E3",
    uriPrefix: "bhim://pay?",
  },
];

export function getUpiAppOptions() {
  return UPI_APP_OPTIONS;
}

export function buildUpiAppUrl(app, amount, note, config = {}) {
  const query = buildUpiQuery(amount, note, config);
  if (!query) return "";
  return `${app.uriPrefix}${query}`;
}

export function openUpiApp(app, amount, note, config = {}) {
  const query = buildUpiQuery(amount, note, config);
  if (!query) return false;

  const ua = navigator.userAgent || "";
  const isAndroid = /android/i.test(ua);
  const appUrl = `${app.uriPrefix}${query}`;

  let targetUrl = appUrl;
  if (isAndroid && app.id === "generic") {
    targetUrl = `intent://pay?${query}#Intent;scheme=upi;end`;
  } else if (isAndroid) {
    targetUrl = appUrl;
  }

  const link = document.createElement("a");
  link.href = targetUrl;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return isMobileDevice();
}
