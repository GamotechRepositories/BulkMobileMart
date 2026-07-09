import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { deleteAdminOrder, getAdminOrders } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import { useAdminNotifications } from "../../../context/AdminNotificationContext";
import AdminAlert from "../AdminAlert";
import AdminPagination, { ADMIN_PAGE_SIZE } from "../AdminPagination";
import { IconTrash } from "../AdminIcons";
import {
  adminCompactTableClass,
  adminCompactTdClass,
  adminCompactThClass,
  adminTableHeaderClass,
  adminTableWrapperClass,
  iconBtnDangerClass,
} from "../adminStyles";
import AdminOrderFilters from "./AdminOrderFilters";
import {
  downloadOrdersCsv,
  formatDate,
  formatPrice,
  getCustomerName,
  getCustomerPhone,
  getOrderDisplayId,
  getOrderStatusLabel,
  getPaymentStatus,
  getPaymentStatusBadgeClass,
  getPaymentStatusLabel,
  getProductSummary,
  getTotalQty,
  getTransactionId,
  normalizeAdminSearchQuery,
} from "./adminOrderUtils";


function getErrorMessage(err, fallback) {
  return err.response?.data?.message || err.message || fallback;
}

function OrderSection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { adminUser } = useAuth();
  const { markOrdersAsSeen } = useAdminNotifications();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    const start = searchParams.get("startDate") || "";
    const end = searchParams.get("endDate") || "";
    const status = searchParams.get("status");
    const statusGroup = searchParams.get("statusGroup");

    setStartDate(start);
    setEndDate(end);

    if (statusGroup === "pending") {
      setOrderStatus("pending");
    } else if (status) {
      setOrderStatus(status);
    } else {
      setOrderStatus("all");
    }
  }, [searchParams]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, orderStatus, paymentStatus, searchQuery]);

  useEffect(() => {
    markOrdersAsSeen();
  }, [markOrdersAsSeen]);

  const fetchOrders = useCallback(async () => {
    if (adminUser?.role !== "admin") return;

    try {
      setLoading(true);
      setError("");
      const params = { page, limit: ADMIN_PAGE_SIZE };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (orderStatus === "pending") {
        params.statusGroup = "pending";
      } else if (orderStatus !== "all") {
        params.status = orderStatus;
      }
      if (paymentStatus !== "all") params.paymentStatus = paymentStatus;
      if (searchQuery.trim()) params.search = normalizeAdminSearchQuery(searchQuery);

      const { data } = await getAdminOrders(params);
      setOrders(data.data || []);
      setPagination(
        data.pagination || {
          page,
          limit: ADMIN_PAGE_SIZE,
          total: data.data?.length || 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load orders"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [adminUser, startDate, endDate, orderStatus, paymentStatus, searchQuery, page]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchOrders();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchOrders]);

  const handleDownload = async () => {
    try {
      const params = { limit: 10000 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (orderStatus === "pending") {
        params.statusGroup = "pending";
      } else if (orderStatus !== "all") {
        params.status = orderStatus;
      }
      if (paymentStatus !== "all") params.paymentStatus = paymentStatus;
      if (searchQuery.trim()) params.search = normalizeAdminSearchQuery(searchQuery);
      const { data } = await getAdminOrders(params);
      downloadOrdersCsv(data.data || [], "orders.csv");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to download orders"));
    }
  };

  const handleDelete = async (orderId, event) => {
    event?.stopPropagation();
    if (!window.confirm("Delete this order permanently? This cannot be undone.")) return;

    try {
      setError("");
      setSuccess("");
      await deleteAdminOrder(orderId);
      setSuccess("Order deleted");
      const nextPage = orders.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else fetchOrders();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to delete order"));
    }
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
        <p className="mt-4 text-text-secondary">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="mt-4 text-text-secondary">No orders found.</p>
      ) : (
        <div className={adminTableWrapperClass}>
          <table className={adminCompactTableClass}>
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[4%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[7%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead>
              <tr className={adminTableHeaderClass}>
                <th className={adminCompactThClass}>Order ID</th>
                <th className={adminCompactThClass}>Customer</th>
                <th className={adminCompactThClass}>Products</th>
                <th className={adminCompactThClass}>Qty</th>
                <th className={adminCompactThClass}>Price</th>
                <th className={adminCompactThClass}>Status</th>
                <th className={adminCompactThClass}>Payment</th>
                <th className={adminCompactThClass}>Transaction ID</th>
                <th className={adminCompactThClass}>Date</th>
                <th className={adminCompactThClass}>Delete</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const payment = getPaymentStatus(order);
                const transactionId = getTransactionId(order);

                return (
                  <tr
                    key={order._id}
                    onClick={() => navigate(`/orders/${order._id}`)}
                    className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
                  >
                    <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                      <span className="block truncate">{getOrderDisplayId(order)}</span>
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
                    <td className={`${adminCompactTdClass} text-neutral-800`}>
                      {getTotalQty(order)}
                    </td>
                    <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                      <span className="block truncate">{formatPrice(order.total)}</span>
                    </td>
                    <td className={adminCompactTdClass}>
                      <span className="text-[10px] font-medium capitalize text-neutral-600">
                        {getOrderStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className={adminCompactTdClass}>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium lowercase ${getPaymentStatusBadgeClass(payment)}`}
                      >
                        {getPaymentStatusLabel(payment)}
                      </span>
                    </td>
                    <td className={`${adminCompactTdClass} text-neutral-600`}>
                      <span className="line-clamp-2 break-all">
                        {transactionId || "—"}
                      </span>
                    </td>
                    <td className={`${adminCompactTdClass} text-neutral-600`}>
                      <span className="block truncate">{formatDate(order.createdAt)}</span>
                    </td>
                    <td className={adminCompactTdClass} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(order._id, e)}
                        className={iconBtnDangerClass}
                        title="Delete order"
                        aria-label="Delete order"
                      >
                        <IconTrash />
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
    </div>
  );
}

export default OrderSection;
