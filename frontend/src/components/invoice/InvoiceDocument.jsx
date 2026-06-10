import { forwardRef } from "react";
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
  const paymentStatus = (order.paymentStatus || "unpaid") === "paid" ? "Paid" : "Unpaid";

  return (
    <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-border-light bg-white text-text-primary shadow-sm">
      <div ref={ref} id="invoice-print-area">
      {/* Header banner */}
      <div className="bg-slate-900 px-6 py-8 text-center text-white sm:px-10 sm:py-10">
        <img
          src={LOGO_URL}
          alt="BulkMobileMart"
          className="invoice-logo mx-auto mb-4 h-16 w-auto object-contain sm:h-20"
          crossOrigin="anonymous"
        />
        <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">BulkMobileMart</h1>
        <p className="mt-2 text-sm text-white/80 sm:text-base">
          Mobile Invoice | support@bulkmobilemart.com | 9876543210
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
                ["Name", addr?.name || user?.name || "—"],
                ["Email", user?.email || "—"],
                ["Phone", addr?.number ? `+91 ${addr.number}` : user?.phone ? `+91 ${user.phone}` : "—"],
                [
                  "Address",
                  [addr?.landmark, `${addr?.city}, ${addr?.state} ${addr?.pincode}`]
                    .filter(Boolean)
                    .join(", ") || "—",
                ],
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
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light bg-mobile-surface text-left text-xs font-bold uppercase tracking-wide text-text-secondary">
                <th className="px-4 py-3 sm:px-5">Sr No.</th>
                <th className="px-4 py-3 sm:px-5">Item Name</th>
                <th className="px-4 py-3 text-right sm:px-5">Qty</th>
                <th className="px-4 py-3 text-right sm:px-5">Rate</th>
                <th className="px-4 py-3 text-right sm:px-5">Amount</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={item._id} className="border-b border-border-light last:border-b-0">
                  <td className="px-4 py-3 sm:px-5">{index + 1}</td>
                  <td className="px-4 py-3 font-medium sm:px-5">{item.name}</td>
                  <td className="px-4 py-3 text-right sm:px-5">{item.quantity}</td>
                  <td className="px-4 py-3 text-right sm:px-5">{formatPrice(item.price)}</td>
                  <td className="px-4 py-3 text-right font-medium sm:px-5">
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
              <span>18% GST</span>
              <span>Included</span>
            </div>
            <div className="flex justify-between text-text-secondary">
              <span>Delivery</span>
              <span>{order.deliveryCharges === 0 ? "Free" : formatPrice(order.deliveryCharges)}</span>
            </div>
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
