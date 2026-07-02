import { useEffect, useState } from "react";
import { formatAddressLine, getAddressFullName } from "../../../utils/addressDisplay";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getOrderById, updateAdminOrder } from "../../../api/api";
import { getOrderNumber } from "../../../utils/orderNumber";
import AdminAlert from "../AdminAlert";
import AdminOrderItemsEditor from "../AdminOrderItemsEditor";
import {
  adminFilterInputClass,
  cardClass,
} from "../adminStyles";
import {
  ADMIN_DETAIL_ORDER_STATUS_OPTIONS,
  ADMIN_DETAIL_PAYMENT_STATUS_OPTIONS,
  ORDER_PROGRESS_STEPS,
  ORDER_STATUS_STEP_INDEX,
  canEditOrderItems,
  formatDateTime,
  formatPrice,
  getPaymentStatus,
} from "./adminOrderUtils";

function OrderProgressStepper({ order }) {
  const activeIndex = ORDER_STATUS_STEP_INDEX[order.status] ?? 0;
  const isCancelled = order.status === "cancelled";

  return (
    <div className="w-full overflow-x-hidden py-2">
      <div className="flex w-full items-start">
        {ORDER_PROGRESS_STEPS.map((label, index) => {
          const isComplete = !isCancelled && index <= activeIndex;
          const isCancelledStep = isCancelled && index === 4;

          return (
            <div key={label} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className={`h-0.5 flex-1 ${
                    index === 0 ? "invisible" : !isCancelled && index <= activeIndex
                      ? "bg-green-600"
                      : "bg-neutral-200"
                  }`}
                />
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold sm:h-10 sm:w-10 ${
                    isComplete || isCancelledStep
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-neutral-200 bg-white text-neutral-400"
                  }`}
                >
                  {isComplete || isCancelledStep ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <div
                  className={`h-0.5 flex-1 ${
                    index === ORDER_PROGRESS_STEPS.length - 1
                      ? "invisible"
                      : !isCancelled && index < activeIndex
                        ? "bg-green-600"
                        : "bg-neutral-200"
                  }`}
                />
              </div>
              <p
                className={`mt-2 text-center text-[10px] font-semibold sm:text-xs ${
                  isComplete || isCancelledStep ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                {label}
              </p>
              {index === 0 && isComplete && (
                <p className="mt-0.5 text-center text-[10px] text-neutral-500 sm:text-xs">
                  {formatDateTime(order.createdAt)}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminOrderDetailSection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadOrder = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getOrderById(id);
      let orderData = data.data;

      if (orderData.status === "delivered" && getPaymentStatus(orderData) === "unpaid") {
        const { data: fixed } = await updateAdminOrder(orderData._id, {
          status: "delivered",
          paymentStatus: "paid",
        });
        orderData = fixed.data;
      }

      setOrder(orderData);
    } catch {
      setError("Order not found");
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [id]);

  const handleStatusChange = async (field, value) => {
    if (!order || updating) return;
    setUpdating(true);
    setError("");
    setSuccess("");
    try {
      const payload = { [field]: value };
      if (field === "status" && value === "delivered") {
        payload.paymentStatus = "paid";
      }

      const { data } = await updateAdminOrder(order._id, payload);
      setOrder(data.data);
      setSuccess("Order updated");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update order");
    } finally {
      setUpdating(false);
    }
  };

  const handleItemsUpdated = (updatedOrder) => {
    setOrder(updatedOrder);
    setSuccess("Order items updated");
  };

  if (loading) {
    return (
      <div className="min-w-0 animate-pulse space-y-4">
        <div className="h-12 rounded-xl bg-white" />
        <div className="h-28 rounded-xl bg-white" />
        <div className="h-24 rounded-xl bg-white" />
        <div className="h-40 rounded-xl bg-white" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-w-0 text-center">
        <p className="mb-4 text-text-secondary">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="text-sm font-semibold text-primary hover:underline"
        >
          ← Back to Orders
        </button>
      </div>
    );
  }

  const addr = order.deliveryAddress;
  const payment = getPaymentStatus(order);
  const orderId = getOrderNumber(order);
  const customerEmail = order.user?.email || "";
  const customerName = order.user?.name || getAddressFullName(addr) || "—";
  const addressLine = formatAddressLine(addr);

  return (
    <div className="min-w-0 space-y-4">
      <AdminAlert
        error={error}
        success={success}
        onClear={() => {
          setError("");
          setSuccess("");
        }}
      />

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/orders")}
          className="shrink-0 text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
        >
          ← Orders
        </button>
        <Link
          to={`/orders/${order._id}/invoice`}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
        >
          Bill Invoice
        </Link>
      </div>

      {/* Order ID + status dropdowns */}
      <div className={`${cardClass} flex flex-wrap items-start justify-between gap-4`}>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            Order ID
          </p>
          <p className="mt-1 text-lg font-bold text-neutral-900">#{orderId}</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[140px]">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Order Status
            </label>
            <select
              value={order.status}
              disabled={updating}
              onChange={(e) => handleStatusChange("status", e.target.value)}
              className={adminFilterInputClass}
            >
              {ADMIN_DETAIL_ORDER_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
              Payment Status
            </label>
            <select
              value={payment}
              disabled={updating}
              onChange={(e) => handleStatusChange("paymentStatus", e.target.value)}
              className={adminFilterInputClass}
            >
              {ADMIN_DETAIL_PAYMENT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {(order.message || order.customerNote || order.customerMessage)?.trim() && (
        <div className={cardClass}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
            Customer Message
          </h3>
          <p className="text-sm leading-relaxed text-neutral-700">
            {order.message || order.customerNote || order.customerMessage}
          </p>
        </div>
      )}

      {/* Progress stepper */}
      <div className={cardClass}>
        <OrderProgressStepper order={order} />
      </div>

      {/* Customer + Address */}
      <div className={`${cardClass} grid gap-6 md:grid-cols-2`}>
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">
            Customer
          </h3>
          <p className="font-semibold text-neutral-900">
            {customerName}
            {customerEmail && (
              <span className="font-normal text-neutral-500"> ({customerEmail})</span>
            )}
          </p>
          <p className="mt-1 text-sm text-neutral-600">{addr?.number || order.user?.phone}</p>
          <p className="mt-6 text-xs font-bold uppercase tracking-wide text-neutral-500">Total</p>
          <p className="mt-1 text-3xl font-bold text-neutral-900">{formatPrice(order.total)}</p>
        </div>
        <div>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">
            Address
          </h3>
          <p className="text-sm leading-relaxed text-neutral-700">{addressLine}</p>
          <p className="mt-3 text-sm text-neutral-600">
            Payment Mode:{" "}
            <span className="capitalize">
              {order.paymentMethod === "cod" ? "cash" : order.paymentMethod}
            </span>
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            Payment Status: <span className="lowercase">{payment}</span>
          </p>
          {order.paymentMethod === "online" && order.razorpayPaymentId && (
            <>
              <p className="mt-3 text-sm text-neutral-600">
                Transaction ID:{" "}
                <span className="break-all font-medium text-neutral-800">
                  {order.razorpayPaymentId}
                </span>
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                Payment Time:{" "}
                <span className="font-medium text-neutral-800">
                  {formatDateTime(order.paidAt || order.createdAt)}
                </span>
              </p>
            </>
          )}
          <p className="mt-4 text-right text-sm text-neutral-600">
            Items total: {formatPrice(order.subtotal)}
          </p>
        </div>
      </div>

      <AdminOrderItemsEditor
        order={order}
        disabled={updating || !canEditOrderItems(order.status)}
        itemsEditable={canEditOrderItems(order.status)}
        onUpdated={handleItemsUpdated}
        onError={setError}
        onSuccess={setSuccess}
      />

      {/* Billing summary */}
      <div className={cardClass}>
        <h3 className="mb-4 text-sm font-bold text-neutral-900">Billing Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Delivery Charges</span>
            <span>
              {order.deliveryCharges === 0 ? "Free" : formatPrice(order.deliveryCharges)}
            </span>
          </div>
          <p className="text-xs text-neutral-500">All prices include GST.</p>
          <div className="flex justify-between border-t border-neutral-200 pt-3 text-base font-bold text-neutral-900">
            <span>Total Amount</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminOrderDetailSection;
