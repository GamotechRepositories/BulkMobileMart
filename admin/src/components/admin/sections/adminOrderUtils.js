import { getOrderNumber } from "../../../utils/orderNumber";
import { getAddressFullName } from "../../../utils/addressDisplay";

export const ORDER_STATUSES = ["attempted", "confirm", "processing", "shipping", "delivered", "cancelled"];

export const ORDER_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "attempted", label: "Attempted" },
  { value: "confirm", label: "Confirm" },
  { value: "processing", label: "Processing" },
  { value: "shipping", label: "Shipping" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export const PAYMENT_STATUS_OPTIONS = [
  { value: "all", label: "All Payments" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
  { value: "pending_verification", label: "Pending verification" },
  { value: "refundable", label: "Refundable" },
];

export function normalizeAdminSearchQuery(value) {
  return String(value || "")
    .trim()
    .replace(/^#+/, "")
    .trim();
}

export const ADMIN_DETAIL_ORDER_STATUS_OPTIONS = [
  { value: "attempted", label: "attempted" },
  { value: "confirm", label: "confirm" },
  { value: "processing", label: "processing" },
  { value: "shipping", label: "shipping" },
  { value: "delivered", label: "delivered" },
  { value: "cancelled", label: "cancelled" },
];

export const ADMIN_DETAIL_PAYMENT_STATUS_OPTIONS = [
  { value: "unpaid", label: "unpaid" },
  { value: "paid", label: "paid" },
  { value: "refundable", label: "refundable" },
];

export const ORDER_PROGRESS_STEPS = ["Confirm", "Processing", "Shipping", "Delivered", "Cancelled"];

export const ORDER_STATUS_STEP_INDEX = {
  attempted: -1,
  confirm: 0,
  processing: 1,
  shipping: 2,
  delivered: 3,
  cancelled: 4,
  // legacy values from older orders
  pending: 0,
  confirmed: 0,
  shipped: 2,
};

export const formatDateTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const STATUS_LABELS = {
  attempted: "Attempted",
  confirm: "Confirm",
  processing: "Processing",
  shipping: "Shipping",
  delivered: "Delivered",
  cancelled: "Cancelled",
  pending: "Confirm",
  confirmed: "Confirm",
  shipped: "Shipping",
};

export function getOrderStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function getOrderMessage(order) {
  return (order?.message || order?.customerNote || order?.customerMessage || "").trim();
}

export const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

export const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function getCustomerName(order) {
  return order.user?.name || getAddressFullName(order.deliveryAddress) || "—";
}

export function getCustomerPhone(order) {
  return order.user?.phone || order.deliveryAddress?.number || "—";
}

export function getProductSummary(order) {
  if (!order.items?.length) return "—";
  if (order.items.length === 1) return order.items[0].name;
  return `${order.items[0].name} +${order.items.length - 1} more`;
}

export function getTotalQty(order) {
  return order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
}

export function getPaymentStatus(order) {
  return order.paymentStatus || "unpaid";
}

export function getPaymentStatusBadgeClass(payment) {
  if (payment === "paid") return "bg-green-100 text-green-700";
  if (payment === "refundable") return "bg-blue-100 text-blue-700";
  return "bg-amber-100 text-amber-800";
}

export function getOrderDisplayId(order) {
  return `#${getOrderNumber(order)}`;
}

export function getPaymentMethodLabel(order) {
  return order.paymentMethod === "cod" ? "COD" : "Online";
}

export function getTransactionId(order) {
  if (order.paymentMethod !== "online") return "";
  return order.razorpayPaymentId || order.razorpayOrderId || "";
}

function downloadCsv(headers, rows, filename) {
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadPaymentsCsv(orders, filename = "payments.csv") {
  const headers = [
    "Order ID",
    "Customer",
    "Phone",
    "Products",
    "Amount",
    "Method",
    "Payment",
    "Transaction ID",
    "Date",
  ];

  const rows = orders.map((order) => [
    getOrderNumber(order),
    getCustomerName(order),
    getCustomerPhone(order),
    getProductSummary(order),
    order.total,
    getPaymentMethodLabel(order),
    getPaymentStatus(order),
    getTransactionId(order),
    formatDate(order.createdAt),
  ]);

  downloadCsv(headers, rows, filename);
}

export function downloadOrdersCsv(orders, filename = "orders.csv") {
  const headers = [
    "Order ID",
    "Customer",
    "Phone",
    "Products",
    "Qty",
    "Price",
    "Status",
    "Payment",
    "Transaction ID",
    "Message",
    "Date",
  ];

  const rows = orders.map((order) => [
    getOrderNumber(order),
    getCustomerName(order),
    getCustomerPhone(order),
    getProductSummary(order),
    getTotalQty(order),
    order.total,
    getOrderStatusLabel(order.status),
    getPaymentStatus(order),
    getTransactionId(order),
    getOrderMessage(order),
    formatDate(order.createdAt),
  ]);

  downloadCsv(headers, rows, filename);
}
