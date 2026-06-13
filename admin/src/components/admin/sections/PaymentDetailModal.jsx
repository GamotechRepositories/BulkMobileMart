import { useEffect, useState } from "react";
import { getAddressFullName, formatAddressLine } from "../../../utils/addressDisplay";
import { getAdminPaymentProof, updateAdminPaymentProof } from "../../../api/api";
import {
  formatDate,
  formatPrice,
  getCustomerName,
  getCustomerPhone,
  getOrderDisplayId,
  getOrderMessage,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatus,
  getProductSummary,
  getTransactionId,
} from "./adminOrderUtils";

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || err.message || fallback;
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getProofStatusLabel(status) {
  if (status === "verified") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function getProofStatusBadgeClass(status) {
  if (status === "verified") return "bg-green-100 text-green-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
}

function getPaymentStatusBadgeClass(status) {
  if (status === "paid") return "bg-green-100 text-green-800";
  if (status === "refundable") return "bg-blue-100 text-blue-800";
  if (status === "pending_verification") return "bg-amber-100 text-amber-800";
  return "bg-neutral-100 text-neutral-700";
}

function getPaymentStatusLabel(status) {
  if (status === "pending_verification") return "Pending verification";
  if (status === "paid") return "Paid";
  if (status === "refundable") return "Refundable";
  return "Unpaid";
}

function PaymentDetailModal({ order, proofId, onClose, onUpdated }) {
  const [proof, setProof] = useState(null);
  const [loading, setLoading] = useState(Boolean(proofId));
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!proofId) {
      setProof(null);
      setLoading(false);
      return undefined;
    }

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await getAdminPaymentProof(proofId);
        if (active) setProof(data.data);
      } catch (err) {
        if (active) setError(getErrorMessage(err, "Failed to load payment details"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [proofId]);

  const handleReview = async (status) => {
    if (!proofId) return;

    try {
      setActionLoading(true);
      setError("");
      await updateAdminPaymentProof(proofId, {
        status,
        rejectionReason: status === "rejected" ? rejectionReason : "",
      });
      onUpdated?.(status);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update payment"));
    } finally {
      setActionLoading(false);
    }
  };

  if (!order && !proofId) return null;

  const paymentStatus = getPaymentStatus(order);
  const items = proof?.items?.length ? proof.items : order?.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-neutral-900">Payment Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm font-semibold text-neutral-500 hover:bg-neutral-100"
          >
            Close
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-neutral-500">Loading...</p>
        ) : error && !order && !proof ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div className="space-y-4 text-sm">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-neutral-700">Order ID:</span>{" "}
                {proof?.orderNumber || getOrderDisplayId(order)}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Payment status:</span>{" "}
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    proof
                      ? getProofStatusBadgeClass(proof.status)
                      : getPaymentStatusBadgeClass(paymentStatus)
                  }`}
                >
                  {proof ? getProofStatusLabel(proof.status) : getPaymentStatusLabel(paymentStatus)}
                </span>
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Order status:</span>{" "}
                {getOrderStatusLabel(proof?.order?.status || order?.status)}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Paid type:</span>{" "}
                {proof
                  ? proof.paymentType === "cod_advance"
                    ? "UPI · COD advance (10%)"
                    : "UPI · Online full"
                  : order?.razorpayPaymentId
                    ? "Razorpay"
                    : getPaymentMethodLabel(order)}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Customer:</span>{" "}
                {proof?.user?.name || getCustomerName(order)}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Phone:</span>{" "}
                {proof?.user?.phone || proof?.deliveryAddress?.number || getCustomerPhone(order)}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Amount paid:</span>{" "}
                {formatPrice(proof?.amount ?? order?.total)}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Order total:</span>{" "}
                {formatPrice(proof?.orderTotal ?? order?.total)}
              </p>
              {(proof?.upiTransactionRef || getTransactionId(order)) && (
                <p className="sm:col-span-2">
                  <span className="font-semibold text-neutral-700">Transaction / UPI ref:</span>{" "}
                  {proof?.upiTransactionRef || getTransactionId(order) || "—"}
                </p>
              )}
              <p className="sm:col-span-2">
                <span className="font-semibold text-neutral-700">Date:</span>{" "}
                {formatDateTime(proof?.createdAt || order?.createdAt)}
              </p>
              {proof?.verifiedAt && (
                <p className="sm:col-span-2">
                  <span className="font-semibold text-neutral-700">Reviewed on:</span>{" "}
                  {formatDateTime(proof.verifiedAt)}
                </p>
              )}
            </div>

            <div>
              <p className="mb-1 font-semibold text-neutral-700">Products</p>
              <ul className="rounded-lg bg-neutral-50 p-3 text-neutral-800">
                {items.map((item, index) => (
                  <li key={`${item.product || item.name}-${index}`}>
                    {item.name} × {item.quantity}
                    {item.price != null ? ` — ${formatPrice(item.price * item.quantity)}` : ""}
                  </li>
                ))}
              </ul>
            </div>

            {(proof?.deliveryAddress || order?.deliveryAddress) && (
              <div>
                <p className="mb-1 font-semibold text-neutral-700">Delivery address</p>
                <p className="rounded-lg bg-neutral-50 p-3 text-neutral-800">
                  {(() => {
                    const addr = proof?.deliveryAddress || order?.deliveryAddress;
                    return (
                      <>
                        {getAddressFullName(addr)}, {addr.number}
                        {addr.email ? (
                          <>
                            <br />
                            {addr.email}
                          </>
                        ) : null}
                        <br />
                        {formatAddressLine(addr)}
                      </>
                    );
                  })()}
                </p>
              </div>
            )}

            {(proof?.customerMessage || getOrderMessage(order)) && (
              <div>
                <p className="mb-1 font-semibold text-neutral-700">Customer note</p>
                <p className="rounded-lg bg-neutral-50 p-3 text-neutral-800">
                  {proof?.customerMessage || getOrderMessage(order)}
                </p>
              </div>
            )}

            {proof?.screenshot && (
              <div>
                <p className="mb-2 font-semibold text-neutral-700">Payment screenshot</p>
                <img
                  src={proof.screenshot}
                  alt={proof.screenshotName || "Payment screenshot"}
                  className="max-h-96 rounded-lg border border-neutral-200 object-contain"
                />
              </div>
            )}

            {proof?.status === "rejected" && proof.rejectionReason && (
              <div className="rounded-lg bg-red-50 p-3 text-red-800">
                <p className="font-semibold">Rejection reason</p>
                <p className="mt-1">{proof.rejectionReason}</p>
              </div>
            )}

            {proof?.status === "verified" && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-800">
                Payment approved successfully.
              </div>
            )}

            {proof?.status === "pending" && (
              <div className="space-y-3 border-t border-neutral-100 pt-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-600">
                    Rejection reason (only if rejecting)
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Optional reason for customer"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleReview("verified")}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    Approve payment
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleReview("rejected")}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PaymentDetailModal;
