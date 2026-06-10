import { useCallback, useEffect, useState } from "react";
import { getAdminOrders, updateAdminOrder } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import AdminAlert from "../AdminAlert";
import {
  adminActionBtnClass,
  adminTableClass,
  adminTableHeaderClass,
  adminTableWrapperClass,
  adminTdClass,
  adminThClass,
} from "../adminStyles";
import AdminOrderFilters from "./AdminOrderFilters";
import {
  downloadOrdersCsv,
  formatDate,
  formatPrice,
  getCustomerName,
  getCustomerPhone,
  getOrderDisplayId,
  getPaymentStatus,
  getProductSummary,
} from "./adminOrderUtils";

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || err.message || fallback;
}

function PaymentSection() {
  const { adminUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [orderStatus, setOrderStatus] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");

  const fetchOrders = useCallback(async () => {
    if (adminUser?.role !== "admin") return;

    try {
      setLoading(true);
      setError("");
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (orderStatus !== "all") params.status = orderStatus;
      if (paymentStatus !== "all") params.paymentStatus = paymentStatus;

      const { data } = await getAdminOrders(params);
      setOrders(data.data || []);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load payments"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [adminUser, startDate, endDate, orderStatus, paymentStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handlePaymentToggle = async (order) => {
    const current = getPaymentStatus(order);
    const next = current === "paid" ? "unpaid" : "paid";

    try {
      setUpdatingId(order._id);
      setError("");
      setSuccess("");
      await updateAdminOrder(order._id, { paymentStatus: next });
      setSuccess(`Payment marked as ${next}`);
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update payment");
    } finally {
      setUpdatingId(null);
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

      <p className="mb-4 text-sm font-medium text-neutral-700">
        {orders.length} payment record{orders.length === 1 ? "" : "s"}
      </p>

      <AdminOrderFilters
        startDate={startDate}
        endDate={endDate}
        orderStatus={orderStatus}
        paymentStatus={paymentStatus}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onOrderStatusChange={setOrderStatus}
        onPaymentStatusChange={setPaymentStatus}
        onDownload={() => downloadOrdersCsv(orders, "payments.csv")}
      />

      {loading ? (
        <p className="mt-4 text-text-secondary">Loading payments...</p>
      ) : orders.length === 0 ? (
        <p className="mt-4 text-text-secondary">No payment records found.</p>
      ) : (
        <div className={adminTableWrapperClass}>
          <table className={adminTableClass}>
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[15%]" />
              <col className="w-[22%]" />
              <col className="w-[10%]" />
              <col className="w-[9%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
              <col className="w-[13%]" />
            </colgroup>
            <thead>
              <tr className={adminTableHeaderClass}>
                <th className={adminThClass}>Order ID</th>
                <th className={adminThClass}>Customer</th>
                <th className={adminThClass}>Products</th>
                <th className={adminThClass}>Amount</th>
                <th className={adminThClass}>Method</th>
                <th className={adminThClass}>Payment</th>
                <th className={adminThClass}>Date</th>
                <th className={adminThClass}>Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const payment = getPaymentStatus(order);

                return (
                  <tr
                    key={order._id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
                  >
                    <td className={`${adminTdClass} font-semibold text-neutral-900`}>
                      <span className="block truncate">{getOrderDisplayId(order)}</span>
                    </td>
                    <td className={adminTdClass}>
                      <p className="truncate font-semibold text-neutral-900">
                        {getCustomerName(order)}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-500">
                        {getCustomerPhone(order)}
                      </p>
                    </td>
                    <td className={`${adminTdClass} text-neutral-600`}>
                      <span className="line-clamp-2 break-words">
                        {getProductSummary(order)}
                      </span>
                    </td>
                    <td className={`${adminTdClass} font-semibold text-neutral-900`}>
                      <span className="block truncate">{formatPrice(order.total)}</span>
                    </td>
                    <td className={`${adminTdClass} text-neutral-600`}>
                      <span className="block truncate text-xs sm:text-sm">
                        {order.paymentMethod === "cod" ? "COD" : "Online"}
                      </span>
                    </td>
                    <td className={adminTdClass}>
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium lowercase ${
                          payment === "paid"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {payment}
                      </span>
                    </td>
                    <td className={`${adminTdClass} text-neutral-600`}>
                      <span className="block truncate text-xs sm:text-sm">
                        {formatDate(order.createdAt)}
                      </span>
                    </td>
                    <td className={adminTdClass}>
                      <button
                        type="button"
                        disabled={updatingId === order._id}
                        onClick={() => handlePaymentToggle(order)}
                        className={adminActionBtnClass}
                      >
                        {payment === "paid" ? "Mark Unpaid" : "Mark Paid"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PaymentSection;
