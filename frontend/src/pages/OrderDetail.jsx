import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cancelOrder, getOrderById } from "../api/api";
import { getOrderNumber } from "../utils/orderNumber";

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

const formatDateTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

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

const STEPS = ["Confirm", "Processing", "Shipping", "Delivered", "Cancelled"];

const STATUS_STEP_INDEX = {
  confirm: 0,
  processing: 1,
  shipping: 2,
  delivered: 3,
  cancelled: 4,
  pending: 0,
  confirmed: 0,
  shipped: 2,
};

const PAYMENT_LABELS = {
  paid: "Paid",
  unpaid: "Unpaid",
  refundable: "Refundable",
};

const getPaymentStatus = (order) => order.paymentStatus || "unpaid";

function OnlinePaymentInfo({ order }) {
  if (order.paymentMethod !== "online") return null;

  const transactionId = order.razorpayPaymentId || order.razorpayOrderId;
  const paymentTime = order.paidAt || order.createdAt;

  if (!transactionId) return null;

  return (
    <div className="mt-2 w-full space-y-1 text-sm">
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-xs font-semibold tracking-wide text-text-secondary">TRANSACTION ID</p>
        <p className="break-all font-medium text-text-primary">{transactionId}</p>
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <p className="text-xs font-semibold tracking-wide text-text-secondary">PAYMENT TIME</p>
        <p className="font-medium text-text-primary">{formatDateTime(paymentTime)}</p>
      </div>
    </div>
  );
}

function ProgressStepperHorizontal({ order }) {
  const activeIndex = STATUS_STEP_INDEX[order.status] ?? 0;
  const isCancelled = order.status === "cancelled";
  const placedAt = formatDateTime(order.createdAt);

  return (
    <div className="hidden w-full pb-2 lg:block">
      <div className="flex w-full items-start">
        {STEPS.map((label, index) => {
          const isComplete = !isCancelled && index <= activeIndex;
          const isCancelledStep = isCancelled && index === 4;

          return (
            <div key={label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className={`h-0.5 flex-1 ${index === 0 ? "invisible" : !isCancelled && index <= activeIndex ? "bg-primary" : "bg-border-light"}`}
                />
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold sm:h-11 sm:w-11 ${
                    isComplete || isCancelledStep
                      ? "border-primary bg-primary text-white"
                      : "border-border-light bg-white text-text-secondary"
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
                  className={`h-0.5 flex-1 ${index === STEPS.length - 1 ? "invisible" : !isCancelled && index < activeIndex ? "bg-primary" : "bg-border-light"}`}
                />
              </div>
              <p
                className={`mt-2 text-center text-xs font-semibold sm:text-sm ${isComplete || isCancelledStep ? "text-text-primary" : "text-text-secondary"}`}
              >
                {label}
              </p>
              {index === 0 && isComplete && (
                <p className="mt-0.5 text-center text-[10px] text-text-secondary sm:text-xs">{placedAt}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgressStepperVertical({ order }) {
  const activeIndex = STATUS_STEP_INDEX[order.status] ?? 0;
  const isCancelled = order.status === "cancelled";

  return (
    <div className="lg:hidden">
      <ul className="space-y-0">
        {STEPS.map((label, index) => {
          const isComplete = !isCancelled && index <= activeIndex;
          const isCancelledStep = isCancelled && index === 4;
          const isLast = index === STEPS.length - 1;

          return (
            <li key={label} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    isComplete || isCancelledStep
                      ? "border-green-600 bg-green-600 text-white"
                      : "border-border-light bg-white text-text-secondary"
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
                {!isLast && (
                  <div
                    className={`my-1 w-0.5 flex-1 min-h-[28px] ${!isCancelled && index < activeIndex ? "bg-green-600" : "bg-border-light"}`}
                  />
                )}
              </div>
              <div className={`pb-6 ${isLast ? "pb-0" : ""}`}>
                <p className={`text-sm font-semibold ${isComplete || isCancelledStep ? "text-text-primary" : "text-text-secondary"}`}>
                  {label}
                </p>
                {index === 0 && isComplete && (
                  <p className="mt-0.5 text-xs text-text-secondary">{formatDateTime(order.createdAt)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadOrder = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await getOrderById(id);
        setOrder(data.data);
      } catch {
        setError("Order not found");
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [user, id]);

  const handleCancelOrder = async () => {
    if (!order || cancelling || order.status !== "confirm") return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel this order? This action cannot be undone."
    );
    if (!confirmed) return;

    setCancelling(true);
    setCancelError("");
    try {
      const { data } = await cancelOrder(order._id);
      setOrder(data.data);
    } catch (err) {
      setCancelError(err.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancelling(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] bg-mobile-bg px-4 py-16 text-center">
        <p className="mb-6 text-text-secondary">Please login to view order details.</p>
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="rounded-lg bg-primary px-8 py-3 text-sm font-bold text-white"
        >
          Login / Sign Up
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-mobile-bg px-4 py-8">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-[520px] rounded-xl border border-border-light bg-white" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[60vh] bg-mobile-bg px-4 py-16 text-center">
        <p className="mb-6 text-text-secondary">{error || "Order not found"}</p>
        <Link to="/orders" className="text-sm font-semibold text-primary hover:underline">
          ← Back to My Orders
        </Link>
      </div>
    );
  }

  const addr = order.deliveryAddress;
  const addressLine = [addr?.landmark, addr?.city, addr?.state, addr?.pincode]
    .filter(Boolean)
    .join(", ")
    .replace(/, (\d{6})$/, " - $1");
  const orderMessage = (
    order.message ||
    order.customerNote ||
    order.customerMessage ||
    ""
  ).trim();

  return (
    <div className="min-h-screen bg-mobile-bg px-4 pb-24 pt-4 sm:px-6 lg:px-10 lg:pb-10 lg:pt-6">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-5 flex items-start gap-3 lg:mb-8">
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary transition hover:border-primary hover:text-primary"
            aria-label="Back to orders"
          >
            ←
          </button>
          <div>
            <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Order Details</h1>
            <p className="mt-0.5 text-sm text-text-secondary">{getOrderNumber(order)}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border-light bg-white shadow-sm">
          {/* Status */}
          <div className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-semibold tracking-wide text-text-secondary">STATUS</p>
                    <p className="text-sm font-bold text-text-primary lg:text-base">
                      {STATUS_LABELS[order.status] || order.status}
                    </p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-semibold tracking-wide text-text-secondary">PAYMENT</p>
                    <p className="text-sm font-bold text-text-primary lg:text-base">
                      {PAYMENT_LABELS[getPaymentStatus(order)] || getPaymentStatus(order)}
                    </p>
                  </div>
                </div>
                <OnlinePaymentInfo order={order} />
                {cancelError && (
                  <p className="mt-2 text-xs text-red-600 sm:text-sm">{cancelError}</p>
                )}
              </div>
              {order.status === "confirm" && (
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="shrink-0 text-xs font-medium text-text-secondary transition hover:text-red-600 disabled:opacity-50 sm:text-sm lg:rounded-lg lg:border lg:border-border-light lg:px-4 lg:py-2"
                >
                  {cancelling ? "Cancelling..." : "Cancel Order"}
                </button>
              )}
            </div>
          </div>

          <hr className="border-border-light" />

          {/* Progress stepper */}
          <div className="px-4 py-5 sm:px-6 lg:px-10 lg:py-10">
            <ProgressStepperVertical order={order} />
            <ProgressStepperHorizontal order={order} />
          </div>

          <hr className="border-border-light" />

          {/* Message, address, billing */}
          <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-3 lg:gap-8 lg:px-8 lg:py-6">
            <div>
              <h2 className="mb-3 text-sm font-bold tracking-wide text-text-primary">YOUR MESSAGE</h2>
              <p className="break-words text-sm leading-relaxed text-text-secondary">
                {orderMessage || "—"}
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold tracking-wide text-text-primary">ADDRESS</h2>
              <p className="text-sm leading-relaxed text-text-secondary">
                {addr?.name}
                <br />
                {addressLine}
                <br />
                +91 {addr?.number}
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-sm font-bold tracking-wide text-text-primary">BILLING SUMMARY</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Delivery</span>
                  <span>{order.deliveryCharges === 0 ? "Free" : formatPrice(order.deliveryCharges)}</span>
                </div>
                <div className="flex justify-between pt-1 font-bold text-text-primary">
                  <span>Total</span>
                  <span>{formatPrice(order.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-border-light" />

          {/* Order items */}
          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            <h2 className="mb-3 text-sm font-bold tracking-wide text-text-primary">ORDER ITEMS</h2>

            <div className="overflow-hidden rounded-lg border border-border-light bg-mobile-surface/30">
              {/* Mobile table */}
              <div className="lg:hidden">
                <div className="grid grid-cols-[1fr_40px_56px_56px] gap-1 border-b border-border-light bg-white px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                  <span>Itm</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Amt</span>
                </div>
                {order.items.map((item) => (
                  <div
                    key={item._id}
                    className="grid grid-cols-[1fr_40px_56px_56px] items-center gap-1 border-b border-border-light bg-white px-3 py-3 last:border-b-0"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-border-light bg-mobile-surface">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-contain p-0.5" />
                        ) : (
                          <div className="h-full w-full bg-mobile-surface" />
                        )}
                      </div>
                      <span className="line-clamp-2 text-xs font-medium leading-snug text-text-primary">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-center text-xs text-text-secondary">{item.quantity}</span>
                    <span className="text-right text-xs text-text-secondary">{formatPrice(item.price)}</span>
                    <span className="text-right text-xs font-semibold text-text-primary">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block">
                <div className="grid border-b border-border-light bg-white px-5 py-3 text-xs font-semibold uppercase tracking-wide text-text-secondary lg:grid-cols-[1fr_120px_140px_140px]">
                  <span>Item</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Unit Price</span>
                  <span className="text-right">Total</span>
                </div>
                <ul className="divide-y divide-border-light bg-white">
                  {order.items.map((item) => (
                    <li
                      key={item._id}
                      className="grid items-center px-5 py-4 lg:grid-cols-[1fr_120px_140px_140px]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border-light bg-mobile-surface">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-contain p-1" />
                          ) : (
                            <div className="h-full w-full bg-mobile-surface" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-text-primary">{item.name}</span>
                      </div>
                      <p className="text-center text-sm text-text-secondary">{item.quantity}</p>
                      <p className="text-right text-sm text-text-secondary">{formatPrice(item.price)}</p>
                      <p className="text-right text-sm font-semibold text-text-primary">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 flex justify-center lg:justify-end">
              <Link
                to={`/orders/${id}/invoice`}
                className="w-full max-w-xs rounded-lg border border-border-light bg-white py-2.5 text-center text-sm font-medium text-text-primary transition hover:border-primary hover:text-primary sm:w-auto sm:px-8 lg:max-w-none"
              >
                Bill Invoice
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;
