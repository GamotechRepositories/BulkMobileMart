import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyOrders } from "../api/api";
import MobileHeader from "../components/mobile/MobileHeader";
import OrderItemImage from "../components/orders/OrderItemImage";
import { getOrderNumber } from "../utils/orderNumber";

const formatPrice = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

const formatPlacedDate = (dateStr) =>
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

const STATUS_STYLES = {
  confirm: "bg-blue-50 text-blue-700",
  processing: "bg-purple-50 text-purple-700",
  shipping: "bg-indigo-50 text-indigo-700",
  delivered: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-700",
  pending: "bg-blue-50 text-blue-700",
  confirmed: "bg-blue-50 text-blue-700",
  shipped: "bg-indigo-50 text-indigo-700",
};

const PAYMENT_LABELS = {
  paid: "Paid",
  unpaid: "Unpaid",
  refundable: "Refundable",
};

const getPaymentStatus = (order) => order.paymentStatus || "unpaid";

function getProductId(item) {
  if (!item?.product) return null;
  if (typeof item.product === "object") return item.product._id;
  return item.product;
}

function OrderCard({ order }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const orderId = getOrderNumber(order);
  const primaryProductId = getProductId(order.items?.[0]);

  const toggleExpanded = (e) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  const paymentStatus = getPaymentStatus(order);
  const showPaymentBadge = paymentStatus !== "unpaid";

  const buyAgainButton = primaryProductId ? (
    <button
      type="button"
      onClick={() => navigate(`/product/${primaryProductId}`)}
      className="inline-flex items-center gap-0.5 rounded border border-primary px-2 py-0.5 text-[10px] font-semibold text-primary transition hover:bg-primary hover:text-white sm:gap-1 sm:px-2.5 sm:py-1 sm:text-xs"
    >
      <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
        />
      </svg>
      Buy Again
    </button>
  ) : null;

  return (
    <div className="overflow-hidden rounded-xl border border-border-light bg-white shadow-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/orders/${order._id}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            navigate(`/orders/${order._id}`);
          }
        }}
        className="cursor-pointer px-3 py-3 transition hover:bg-mobile-surface/40 sm:px-5 sm:py-4"
      >
        {/* Mobile: single compact row */}
        <div className="flex items-center gap-2 sm:hidden">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            <p className="shrink-0 text-sm font-bold text-text-primary">#{orderId}</p>
            <span className="truncate text-[11px] text-text-secondary">
              {formatPlacedDate(order.createdAt)}
            </span>
          </div>

          <p className="shrink-0 text-sm font-bold text-primary">{formatPrice(order.total)}</p>

          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              STATUS_STYLES[order.status] || STATUS_STYLES.confirm
            }`}
          >
            {STATUS_LABELS[order.status] || order.status}
          </span>

          {showPaymentBadge && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                paymentStatus === "paid"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {PAYMENT_LABELS[paymentStatus] || paymentStatus}
            </span>
          )}

          <button
            type="button"
            onClick={toggleExpanded}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border-light text-text-secondary transition hover:border-primary hover:text-primary"
            aria-label={expanded ? "Collapse order items" : "Expand order items"}
            aria-expanded={expanded}
          >
            <svg
              className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Desktop */}
        <div className="hidden items-start justify-between gap-4 sm:flex">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-bold text-text-primary">#{orderId}</p>
              <span className="text-sm text-text-secondary">{formatPlacedDate(order.createdAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-lg font-bold text-primary">{formatPrice(order.total)}</p>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                paymentStatus === "paid"
                  ? "bg-green-50 text-green-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {PAYMENT_LABELS[paymentStatus] || paymentStatus}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                STATUS_STYLES[order.status] || STATUS_STYLES.confirm
              }`}
            >
              {STATUS_LABELS[order.status] || order.status}
            </span>

            <button
              type="button"
              onClick={toggleExpanded}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border-light text-text-secondary transition hover:border-primary hover:text-primary"
              aria-label={expanded ? "Collapse order items" : "Expand order items"}
              aria-expanded={expanded}
            >
              <svg
                className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border-light px-3 py-3 sm:px-5">
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item._id} className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border-light bg-mobile-surface sm:h-14 sm:w-14">
                  <OrderItemImage
                    image={item.image}
                    fallbackImage={item.productImage}
                    alt={item.name}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-text-primary">{item.name}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">Qty: {item.quantity}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-text-primary">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {buyAgainButton && (
        <div className="flex justify-end px-3 pb-2 pt-2 sm:px-5 sm:pb-3 sm:pt-0">
          {buyAgainButton}
        </div>
      )}
    </div>
  );
}

function Orders() {
  const { user, openAuthModal } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const loadOrders = async () => {
      setLoading(true);
      try {
        const { data } = await getMyOrders();
        setOrders(data.data || []);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [user]);

  return (
    <div className="min-h-screen bg-mobile-bg px-4 pb-24 pt-2 sm:px-6 md:px-8 lg:pb-8 lg:pt-4">
      <MobileHeader showSearch={false} />
      <div className="mx-auto mt-2 max-w-5xl sm:mt-4">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">My Orders</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track, manage and reorder your purchases
          </p>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-border-light bg-white p-8 text-center shadow-sm sm:p-10">
            <p className="mb-6 text-sm text-text-secondary sm:text-base">
              Please login to view your orders.
            </p>
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="rounded-lg bg-primary px-8 py-3 text-sm font-bold text-white transition hover:brightness-110"
            >
              Login / Sign Up
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-border-light bg-white"
              />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-border-light bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-20 sm:w-20">
              <svg className="h-8 w-8 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-text-secondary sm:text-base">
              You haven&apos;t placed any orders yet.
            </p>
            <Link
              to="/product"
              className="mt-6 inline-block rounded-lg bg-primary px-8 py-3 text-sm font-bold text-white transition hover:brightness-110"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard key={order._id} order={order} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Orders;
