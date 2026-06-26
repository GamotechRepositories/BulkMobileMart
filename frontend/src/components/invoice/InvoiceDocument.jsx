import { forwardRef } from "react";
import { getAddressFullName } from "../../utils/addressDisplay";
import { LOGO_URL } from "../layout/Header";
import { getOrderNumber } from "../../utils/orderNumber";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const STATUS_LABELS = {
  confirm: "Confirm",
  processing: "Processing",
  shipping: "Shipping",
  delivered: "Delivered",
  cancelled: "Cancelled",
  pending: "Confirm",
  confirmed: "Confirm",
  shipped: "Shipping",
};

const InvoiceDocument = forwardRef(function InvoiceDocument(
  { order, user, onDownload, downloading },
  ref
) {
  const orderNo = getOrderNumber(order);
  const invoiceNo = `${orderNo}-INV`;
  const addr = order.deliveryAddress;
  const invoiceDate = formatDate(new Date());
  const orderDate = formatDate(order.createdAt);
  const paymentMode = order.paymentMethod === "cod" ? "Cash on Delivery" : "Online Payment";
  const paymentStatus =
    order.paymentStatus === "paid_10"
      ? "Paid 10%"
      : (order.paymentStatus || "unpaid") === "paid"
        ? "Paid"
        : "Unpaid";

  return (
    <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-border-light bg-white text-text-primary shadow-sm">
      <div ref={ref} id="invoice-print-area">
      {/* Header banner */}
      <div className="border-b border-border-light bg-white px-6 py-8 text-center sm:px-10 sm:py-10">
        <img
          src={LOGO_URL}
          alt="BulkMobileMart"
          className="invoice-logo mx-auto h-16 w-auto object-contain sm:h-20"
          crossOrigin="anonymous"
        />
        <p className="mt-4 text-sm text-text-secondary sm:text-base">
          support@bulkmobilemart.com | + 91 74002 22233
        </p>
      </div>

      <div className="p-5 sm:p-8">
        {/* Info boxes */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border-light p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Invoice &amp; Order</h2>
            <dl className="space-y-2 text-sm">
              {[
                ["Invoice Date", invoiceDate],
                ["Order No", orderNo],
                ["Invoice No", invoiceNo],
                ["Order Date", orderDate],
                ["Order Status", STATUS_LABELS[order.status] || order.status],
                ["Payment Status", paymentStatus],
                ["Payment Mode", paymentMode],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-text-secondary">{label}</dt>
                  <dd className="text-right font-medium text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-lg border border-border-light p-4 sm:p-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Bill To</h2>
            <dl className="space-y-2 text-sm">
              {[
                ["Name", getAddressFullName(addr) || user?.name || "—"],
                ["Email", addr?.email || user?.email || "—"],
                ["Phone", addr?.number ? `+91 ${addr.number}` : user?.phone ? `+91 ${user.phone}` : "—"],
                ["Shop", addr?.shopName || "—"],
                ["Shop No.", addr?.shopNo || "—"],
                ["Address", addr?.fullAddress || "—"],
                ["Landmark", addr?.landmark || "—"],
                ["City", [addr?.city, addr?.state, addr?.pincode].filter(Boolean).join(", ") || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="shrink-0 text-text-secondary">{label}</dt>
                  <dd className="text-right font-medium text-text-primary">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Items table */}
        <div className="mt-6 overflow-hidden rounded-lg border border-border-light">
          <table className="w-full table-fixed text-[11px] sm:text-sm">
            <thead>
              <tr className="border-b border-border-light bg-mobile-surface text-left text-[10px] font-bold uppercase tracking-wide text-text-secondary sm:text-xs">
                <th className="w-8 px-1 py-2 text-center sm:w-auto sm:px-5 sm:py-3">
                  <span className="sm:hidden">Sr</span>
                  <span className="hidden sm:inline">Sr No.</span>
                </th>
                <th className="px-1.5 py-2 sm:px-5 sm:py-3">Item Name</th>
                <th className="w-8 px-1 py-2 text-right sm:w-auto sm:px-5 sm:py-3">Qty</th>
                <th className="w-14 px-1 py-2 text-right sm:w-auto sm:px-5 sm:py-3">Rate</th>
                <th className="w-14 px-1 py-2 text-right sm:w-auto sm:px-5 sm:py-3">
                  <span className="sm:hidden">AM</span>
                  <span className="hidden sm:inline">Amount</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={item._id} className="border-b border-border-light last:border-b-0">
                  <td className="px-1 py-2 text-center tabular-nums sm:px-5 sm:py-3">{index + 1}</td>
                  <td className="px-1.5 py-2 font-medium sm:px-5 sm:py-3">{item.name}</td>
                  <td className="px-1 py-2 text-right tabular-nums sm:px-5 sm:py-3">{item.quantity}</td>
                  <td className="px-1 py-2 text-right tabular-nums sm:px-5 sm:py-3">{formatPrice(item.price)}</td>
                  <td className="px-1 py-2 text-right font-medium tabular-nums sm:px-5 sm:py-3">
                    {formatPrice(item.price * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-text-secondary">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Delivery</span>
              <span>{order.deliveryCharges === 0 ? "Free" : formatPrice(order.deliveryCharges)}</span>
            </div>
            <p className="text-xs text-text-muted">All prices include GST.</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              disabled={downloading}
              className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {downloading ? "Downloading..." : "Download Invoice"}
            </button>
          )}
          <div className="ml-auto flex w-full max-w-xs justify-between rounded-lg bg-slate-900 px-4 py-3 text-sm font-bold text-white sm:w-auto sm:min-w-[280px]">
            <span>Total Amount</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
});

export default InvoiceDocument;
