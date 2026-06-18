import { useCallback, useEffect, useMemo, useState } from "react";
import { getAdminOrders, getAdminPaymentProofs } from "../../../api/api";
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
import AdminOrderFilters from "./AdminOrderFilters";
import PaymentDetailModal from "./PaymentDetailModal";
import {
  downloadPaymentsCsv,
  formatDate,
  getCustomerName,
  getCustomerPhone,
  getOrderDisplayId,
  getPaymentMethodLabel,
  getPaymentStatus,
  getProductSummary,
  normalizeAdminSearchQuery,
} from "./adminOrderUtils";

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || err.message || fallback;
}

function getPaidType(order, proof) {
  if (proof) {
    return proof.paymentType === "cod_advance" ? "UPI · COD advance" : "UPI · Online";
  }
  if (order.razorpayPaymentId || order.codAdvanceRazorpayPaymentId) return "Razorpay";
  return getPaymentMethodLabel(order);
}

function getRowStatus(order, proof) {
  if (proof) {
    if (proof.status === "verified") return { label: "Approved", className: "bg-green-100 text-green-800" };
    if (proof.status === "rejected") return { label: "Rejected", className: "bg-red-100 text-red-800" };
    return { label: "Pending", className: "bg-amber-100 text-amber-800" };
  }

  const status = getPaymentStatus(order);
  if (status === "paid") return { label: "Paid", className: "bg-green-100 text-green-800" };
  if (status === "refundable") return { label: "Refundable", className: "bg-blue-100 text-blue-800" };
  if (status === "pending_verification") {
    return { label: "Pending verification", className: "bg-amber-100 text-amber-800" };
  }
  return { label: "Unpaid", className: "bg-neutral-100 text-neutral-700" };
}

function PaymentSection() {
  const { adminUser } = useAuth();
  const { markPaymentsAsSeen } = useAdminNotifications();
  const [orders, setOrders] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedProofId, setSelectedProofId] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, orderStatus, paymentStatus, searchQuery]);

  useEffect(() => {
    markPaymentsAsSeen();
  }, [markPaymentsAsSeen]);

  const proofByOrderId = useMemo(() => {
    const map = new Map();
    proofs.forEach((proof) => {
      const orderId = proof.order?._id || proof.order;
      if (orderId) map.set(String(orderId), proof);
    });
    return map;
  }, [proofs]);

  const fetchData = useCallback(async () => {
    if (adminUser?.role !== "admin") return;

    try {
      setLoading(true);
      setError("");
      const params = { page, limit: ADMIN_PAGE_SIZE };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (orderStatus !== "all") params.status = orderStatus;
      if (paymentStatus !== "all") params.paymentStatus = paymentStatus;
      if (searchQuery.trim()) params.search = normalizeAdminSearchQuery(searchQuery);

      const ordersRes = await getAdminOrders(params);
      const loadedOrders = ordersRes.data.data || [];
      setOrders(loadedOrders);
      setPagination(
        ordersRes.data.pagination || {
          page,
          limit: ADMIN_PAGE_SIZE,
          total: loadedOrders.length,
          totalPages: 1,
        }
      );

      const orderIds = loadedOrders.map((order) => order._id).join(",");
      const proofsRes = await getAdminPaymentProofs(
        orderIds ? { orderIds, limit: ADMIN_PAGE_SIZE } : { limit: 1 }
      );

      setProofs(proofsRes.data.data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load payments"));
      setOrders([]);
      setProofs([]);
    } finally {
      setLoading(false);
    }
  }, [adminUser, startDate, endDate, orderStatus, paymentStatus, searchQuery, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDownload = async () => {
    try {
      const params = { limit: 10000 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (orderStatus !== "all") params.status = orderStatus;
      if (paymentStatus !== "all") params.paymentStatus = paymentStatus;
      if (searchQuery.trim()) params.search = normalizeAdminSearchQuery(searchQuery);
      const { data } = await getAdminOrders(params);
      downloadPaymentsCsv(data.data || [], "payments.csv");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to download payments"));
    }
  };

  const handleView = (order) => {
    const proof = proofByOrderId.get(String(order._id));
    setSelectedOrder(order);
    setSelectedProofId(proof?._id || null);
  };

  const closeModal = () => {
    setSelectedOrder(null);
    setSelectedProofId(null);
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

      <p className="mb-4 text-sm font-medium text-neutral-700">
        {pagination.total} payment{pagination.total === 1 ? "" : "s"}
      </p>

      <AdminOrderFilters
        startDate={startDate}
        endDate={endDate}
        orderStatus={orderStatus}
        paymentStatus={paymentStatus}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onOrderStatusChange={setOrderStatus}
        onPaymentStatusChange={setPaymentStatus}
        onDownload={handleDownload}
      />

      {loading ? (
        <p className="mt-4 text-text-secondary">Loading payments...</p>
      ) : orders.length === 0 ? (
        <p className="mt-4 text-text-secondary">No payments found.</p>
      ) : (
        <div className={adminTableWrapperClass}>
          <table className={adminCompactTableClass}>
            <thead>
              <tr className={adminTableHeaderClass}>
                <th className={adminCompactThClass}>Order ID</th>
                <th className={adminCompactThClass}>Customer</th>
                <th className={adminCompactThClass}>Product</th>
                <th className={adminCompactThClass}>Paid type</th>
                <th className={adminCompactThClass}>Status</th>
                <th className={adminCompactThClass}>Date</th>
                <th className={adminCompactThClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const proof = proofByOrderId.get(String(order._id));
                const status = getRowStatus(order, proof);

                return (
                  <tr
                    key={order._id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
                  >
                    <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                      {getOrderDisplayId(order)}
                    </td>
                    <td className={adminCompactTdClass}>
                      <p className="truncate font-medium text-neutral-900">
                        {getCustomerName(order)}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-neutral-500">
                        {getCustomerPhone(order)}
                      </p>
                    </td>
                    <td className={`${adminCompactTdClass} text-neutral-600`}>
                      <span className="line-clamp-2 break-words">
                        {getProductSummary(order)}
                      </span>
                    </td>
                    <td className={`${adminCompactTdClass} text-neutral-600`}>
                      {getPaidType(order, proof)}
                    </td>
                    <td className={adminCompactTdClass}>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                    <td className={`${adminCompactTdClass} text-neutral-600`}>
                      {formatDate(proof?.verifiedAt || order.createdAt)}
                    </td>
                    <td className={adminCompactTdClass}>
                      <button
                        type="button"
                        onClick={() => handleView(order)}
                        className="rounded-lg border border-primary px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-orange-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <AdminPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            loading={loading}
            onPageChange={setPage}
          />
        </div>
      )}

      {(selectedOrder || selectedProofId) && (
        <PaymentDetailModal
          order={selectedOrder}
          proofId={selectedProofId}
          onClose={closeModal}
          onUpdated={(status) => {
            setSuccess(
              status === "verified"
                ? "Payment approved successfully"
                : "Payment rejected and order cancelled"
            );
            fetchData();
          }}
        />
      )}
    </div>
  );
}

export default PaymentSection;
