import { useCallback, useEffect, useState } from "react";
import { getAdminPaymentProofs } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import { useAdminNotifications } from "../../../context/AdminNotificationContext";
import AdminAlert from "../AdminAlert";
import AdminPagination, { ADMIN_PAGE_SIZE } from "../AdminPagination";
import {
  adminCompactTableClass,
  adminCompactTdClass,
  adminCompactThClass,
  adminTableHeaderClass,
  adminTableWrapperClass,
} from "../adminStyles";
import PaymentDetailModal from "./PaymentDetailModal";
import { formatDate, formatPrice, getCustomerName, getCustomerPhone } from "./adminOrderUtils";

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || err.message || fallback;
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

function ProofsTable({ proofs, showStatus = false, actionLabel, onAction }) {
  if (proofs.length === 0) {
    return null;
  }

  return (
    <div className={adminTableWrapperClass}>
      <table className={adminCompactTableClass}>
        <thead>
          <tr className={adminTableHeaderClass}>
            <th className={adminCompactThClass}>Order ID</th>
            <th className={adminCompactThClass}>Customer</th>
            <th className={adminCompactThClass}>Amount</th>
            <th className={adminCompactThClass}>Type</th>
            {showStatus ? <th className={adminCompactThClass}>Status</th> : null}
            <th className={adminCompactThClass}>Submitted</th>
            <th className={adminCompactThClass}>Action</th>
          </tr>
        </thead>
        <tbody>
          {proofs.map((proof) => (
            <tr
              key={proof._id}
              className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
            >
              <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                {proof.orderNumber || proof.order?.orderNumber || "—"}
              </td>
              <td className={adminCompactTdClass}>
                <p className="truncate font-medium text-neutral-900">
                  {proof.user?.name || getCustomerName(proof.order)}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-neutral-500">
                  {proof.user?.phone || proof.deliveryAddress?.number || getCustomerPhone(proof.order)}
                </p>
              </td>
              <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                {formatPrice(proof.amount)}
              </td>
              <td className={`${adminCompactTdClass} text-neutral-600`}>
                {proof.paymentType === "cod_advance" ? "COD advance (10%)" : "Online full"}
              </td>
              {showStatus ? (
                <td className={adminCompactTdClass}>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getProofStatusBadgeClass(proof.status)}`}
                  >
                    {getProofStatusLabel(proof.status)}
                  </span>
                </td>
              ) : null}
              <td className={`${adminCompactTdClass} text-neutral-600`}>
                {formatDate(proof.createdAt)}
              </td>
              <td className={adminCompactTdClass}>
                <button
                  type="button"
                  onClick={() => onAction(proof._id)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                    showStatus
                      ? "border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                      : "border-primary text-primary hover:bg-orange-50"
                  }`}
                >
                  {actionLabel}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentProofsSection() {
  const { adminUser } = useAuth();
  const { markPaymentsAsSeen } = useAdminNotifications();
  const [pendingProofs, setPendingProofs] = useState([]);
  const [reviewedProofs, setReviewedProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedProofId, setSelectedProofId] = useState(null);
  const [pendingPage, setPendingPage] = useState(1);
  const [reviewedPage, setReviewedPage] = useState(1);
  const [pendingPagination, setPendingPagination] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [reviewedPagination, setReviewedPagination] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    markPaymentsAsSeen();
  }, [markPaymentsAsSeen]);

  const fetchData = useCallback(async () => {
    if (adminUser?.role !== "admin") return;

    try {
      setLoading(true);
      setError("");

      const [pendingRes, reviewedRes] = await Promise.all([
        getAdminPaymentProofs({
          page: pendingPage,
          limit: ADMIN_PAGE_SIZE,
          status: "pending",
        }),
        getAdminPaymentProofs({
          page: reviewedPage,
          limit: ADMIN_PAGE_SIZE,
          status: "reviewed",
        }),
      ]);

      const loadedPending = pendingRes.data.data || [];
      const loadedReviewed = reviewedRes.data.data || [];

      setPendingProofs(loadedPending);
      setReviewedProofs(loadedReviewed);
      setPendingPagination(
        pendingRes.data.pagination || {
          page: pendingPage,
          limit: ADMIN_PAGE_SIZE,
          total: loadedPending.length,
          totalPages: 1,
        }
      );
      setReviewedPagination(
        reviewedRes.data.pagination || {
          page: reviewedPage,
          limit: ADMIN_PAGE_SIZE,
          total: loadedReviewed.length,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load payment proofs"));
      setPendingProofs([]);
      setReviewedProofs([]);
    } finally {
      setLoading(false);
    }
  }, [adminUser, pendingPage, reviewedPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProofUpdated = (status) => {
    setSuccess(
      status === "verified"
        ? "Payment approved successfully"
        : "Payment rejected and order cancelled"
    );
    if (status === "verified" && pendingPage > 1 && pendingProofs.length <= 1) {
      setPendingPage((current) => Math.max(1, current - 1));
      return;
    }
    fetchData();
  };

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

      <p className="mb-4 text-xs text-neutral-500">
        All customer UPI payment proofs are listed here. Pending proofs need your review; approved
        and rejected proofs are kept in the history section below.
      </p>

      <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50/40 p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Pending review</h2>
            <p className="mt-0.5 text-xs text-neutral-600">
              {pendingPagination.total} UPI proof{pendingPagination.total === 1 ? "" : "s"} waiting
              for verification
            </p>
          </div>
          {pendingPagination.total > 0 ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-800">
              Action required
            </span>
          ) : null}
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">Loading pending proofs...</p>
        ) : pendingProofs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-amber-200 bg-white/70 px-4 py-6 text-sm text-neutral-600">
            No pending UPI payment proofs.
          </p>
        ) : (
          <>
            <ProofsTable
              proofs={pendingProofs}
              actionLabel="Review"
              onAction={setSelectedProofId}
            />
            <AdminPagination
              page={pendingPagination.page}
              totalPages={pendingPagination.totalPages}
              total={pendingPagination.total}
              loading={loading}
              onPageChange={setPendingPage}
            />
          </>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-neutral-900">Reviewed payments</h2>
          <p className="mt-0.5 text-xs text-neutral-600">
            {reviewedPagination.total} approved or rejected UPI proof
            {reviewedPagination.total === 1 ? "" : "s"}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-text-secondary">Loading reviewed proofs...</p>
        ) : reviewedProofs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-200 px-4 py-6 text-sm text-neutral-600">
            No reviewed UPI payment proofs yet.
          </p>
        ) : (
          <>
            <ProofsTable
              proofs={reviewedProofs}
              showStatus
              actionLabel="View"
              onAction={setSelectedProofId}
            />
            <AdminPagination
              page={reviewedPagination.page}
              totalPages={reviewedPagination.totalPages}
              total={reviewedPagination.total}
              loading={loading}
              onPageChange={setReviewedPage}
            />
          </>
        )}
      </section>

      {selectedProofId ? (
        <PaymentDetailModal
          proofId={selectedProofId}
          onClose={() => setSelectedProofId(null)}
          onUpdated={handleProofUpdated}
        />
      ) : null}
    </div>
  );
}

export default PaymentProofsSection;
