import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAdminPaymentProof,
  getAdminPaymentProofs,
  updateAdminPaymentProof,
} from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import AdminAlert from "../AdminAlert";
import {
  adminCompactTableClass,
  adminCompactTdClass,
  adminCompactThClass,
  adminTableHeaderClass,
  adminTableWrapperClass,
} from "../adminStyles";

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || err.message || fallback;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatPrice(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function getProductSummary(items = []) {
  if (!items.length) return "—";
  return items.map((item) => `${item.name} × ${item.quantity}`).join(", ");
}

function getStatusBadgeClass(status) {
  if (status === "verified") return "bg-green-100 text-green-800";
  if (status === "rejected") return "bg-red-100 text-red-800";
  return "bg-amber-100 text-amber-800";
}

function PaymentProofDetailModal({ paymentId, onClose, onUpdated }) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    if (!paymentId) return;

    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await getAdminPaymentProof(paymentId);
        if (active) setPayment(data.data);
      } catch (err) {
        if (active) setError(getErrorMessage(err, "Failed to load payment"));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [paymentId]);

  const handleReview = async (status) => {
    try {
      setActionLoading(true);
      setError("");
      await updateAdminPaymentProof(paymentId, {
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

  if (!paymentId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-lg font-bold text-neutral-900">UPI Payment Proof</h3>
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
        ) : error && !payment ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : payment ? (
          <div className="space-y-4 text-sm">
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-neutral-700">Order:</span>{" "}
                {payment.orderNumber || payment.order?.orderNumber || "—"}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Proof status:</span>{" "}
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusBadgeClass(payment.status)}`}
                >
                  {payment.status}
                </span>
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Order status:</span>{" "}
                {payment.order?.status || "—"}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Customer:</span>{" "}
                {payment.user?.name || "—"}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Phone:</span>{" "}
                {payment.user?.phone || payment.deliveryAddress?.number || "—"}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Amount paid:</span>{" "}
                {formatPrice(payment.amount)}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Order total:</span>{" "}
                {formatPrice(payment.orderTotal)}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">Type:</span>{" "}
                {payment.paymentType === "cod_advance" ? "COD advance (10%)" : "Online full"}
              </p>
              <p>
                <span className="font-semibold text-neutral-700">UPI ref:</span>{" "}
                {payment.upiTransactionRef || "—"}
              </p>
              <p className="sm:col-span-2">
                <span className="font-semibold text-neutral-700">Date:</span>{" "}
                {formatDate(payment.createdAt)}
              </p>
            </div>

            <div>
              <p className="mb-1 font-semibold text-neutral-700">Products</p>
              <ul className="rounded-lg bg-neutral-50 p-3 text-neutral-800">
                {(payment.items || []).map((item, index) => (
                  <li key={`${item.product}-${index}`}>
                    {item.name} × {item.quantity} — {formatPrice(item.price * item.quantity)}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="mb-1 font-semibold text-neutral-700">Delivery address</p>
              <p className="rounded-lg bg-neutral-50 p-3 text-neutral-800">
                {payment.deliveryAddress?.name}, {payment.deliveryAddress?.number}
                <br />
                {payment.deliveryAddress?.landmark}, {payment.deliveryAddress?.city},{" "}
                {payment.deliveryAddress?.state} — {payment.deliveryAddress?.pincode}
              </p>
            </div>

            {payment.customerMessage && (
              <div>
                <p className="mb-1 font-semibold text-neutral-700">Customer note</p>
                <p className="rounded-lg bg-neutral-50 p-3 text-neutral-800">
                  {payment.customerMessage}
                </p>
              </div>
            )}

            {payment.screenshot && (
              <div>
                <p className="mb-2 font-semibold text-neutral-700">Payment screenshot</p>
                <img
                  src={payment.screenshot}
                  alt={payment.screenshotName || "Payment screenshot"}
                  className="max-h-96 rounded-lg border border-neutral-200 object-contain"
                />
              </div>
            )}

            {payment.status === "pending" && (
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
        ) : null}
      </div>
    </div>
  );
}

function PaymentProofSection() {
  const { adminUser } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedId, setSelectedId] = useState(null);

  const fetchPayments = useCallback(async () => {
    if (adminUser?.role !== "admin") return;

    try {
      setLoading(true);
      setError("");
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const { data } = await getAdminPaymentProofs(params);
      setPayments(data.data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load payment proofs"));
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [adminUser, statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const sortedPayments = useMemo(
    () =>
      [...payments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [payments]
  );

  return (
    <div className="min-w-0">
      <AdminAlert
        error={error}
        success={success}
        onClear={() => {
          setError("");
          setSuccess("");
        }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-neutral-700">
          {sortedPayments.length} UPI proof{sortedPayments.length === 1 ? "" : "s"}
        </p>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm"
        >
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
      </div>

      {loading ? (
        <p className="text-text-secondary">Loading payment proofs...</p>
      ) : sortedPayments.length === 0 ? (
        <p className="text-text-secondary">No payment proofs found.</p>
      ) : (
        <div className={adminTableWrapperClass}>
          <table className={adminCompactTableClass}>
            <thead>
              <tr className={adminTableHeaderClass}>
                <th className={adminCompactThClass}>Order</th>
                <th className={adminCompactThClass}>Customer</th>
                <th className={adminCompactThClass}>Products</th>
                <th className={adminCompactThClass}>Paid</th>
                <th className={adminCompactThClass}>Type</th>
                <th className={adminCompactThClass}>Status</th>
                <th className={adminCompactThClass}>Date</th>
                <th className={adminCompactThClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedPayments.map((payment) => (
                <tr
                  key={payment._id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
                >
                  <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                    {payment.orderNumber || "—"}
                  </td>
                  <td className={adminCompactTdClass}>
                    <p className="truncate font-medium text-neutral-900">
                      {payment.user?.name || payment.deliveryAddress?.name || "—"}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-neutral-500">
                      {payment.user?.phone || payment.deliveryAddress?.number || "—"}
                    </p>
                  </td>
                  <td className={`${adminCompactTdClass} text-neutral-600`}>
                    <span className="line-clamp-2 break-words">
                      {getProductSummary(payment.items)}
                    </span>
                  </td>
                  <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                    {formatPrice(payment.amount)}
                  </td>
                  <td className={`${adminCompactTdClass} text-neutral-600`}>
                    {payment.paymentType === "cod_advance" ? "COD 10%" : "Online"}
                  </td>
                  <td className={adminCompactTdClass}>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(payment.status)}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className={`${adminCompactTdClass} text-neutral-600`}>
                    {formatDate(payment.createdAt)}
                  </td>
                  <td className={adminCompactTdClass}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(payment._id)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PaymentProofDetailModal
        paymentId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={(status) => {
          setSuccess(
            status === "verified"
              ? "Payment approved successfully"
              : "Payment rejected and order cancelled"
          );
          fetchPayments();
        }}
      />
    </div>
  );
}

export default PaymentProofSection;
