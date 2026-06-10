import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyOrders } from "../api/api";
import MobileHeader from "../components/mobile/MobileHeader";
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
};

const getPaymentStatus = (order) => order.paymentStatus || "unpaid";

function OrderCard({ order }) {
  return (
    <Link
      to={`/orders/${order._id}`}
      className="block rounded-lg border border-border-light bg-white px-4 py-3 shadow-sm transition hover:border-primary/50 sm:px-5 sm:py-3.5"
    >
      {/* Top row — ID left, date + price + status right */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text-primary">
          {getOrderNumber(order)}
        </p>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="text-xs text-text-secondary">{formatDate(order.createdAt)}</span>
          <span className="text-sm font-bold text-text-primary">
            {formatPrice(order.total)}
          </span>
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
              STATUS_STYLES[order.status] || STATUS_STYLES.confirm
            }`}
          >
            {STATUS_LABELS[order.status] || order.status}
          </span>
          <span
            className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
              getPaymentStatus(order) === "paid"
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            {PAYMENT_LABELS[getPaymentStatus(order)] || getPaymentStatus(order)}
          </span>
        </div>
      </div>

      {/* Product rows */}
      <div className="mt-3 space-y-2.5">
        {order.items.map((item) => (
          <div key={item._id} className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border-light bg-mobile-surface">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <div className="h-full w-full bg-mobile-surface" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-sm font-semibold text-text-primary">{item.name}</p>
              <p className="text-xs text-text-secondary">Qty: {item.quantity}</p>
            </div>
          </div>
        ))}
      </div>
    </Link>
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
    <div className="min-h-screen bg-mobile-bg px-4 pb-24 pt-4 sm:px-6 md:px-8 lg:pb-8 lg:pt-6">
      <MobileHeader showSearch={false} />
      <div className="mx-auto mt-6 max-w-4xl sm:mt-8">
        <h1 className="mb-8 text-center text-2xl font-bold text-text-primary sm:text-3xl">
          My Orders
        </h1>

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
          <div className="space-y-5">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-xl border border-border-light bg-white"
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
          <div className="space-y-3">
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
