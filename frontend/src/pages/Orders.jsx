import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getMyOrders } from "../api/api";
import FlipkartOrderCard from "../components/orders/FlipkartOrderCard";
import {
  buildOrdersSummary,
  filterOrders,
  formatOrderPrice,
} from "../utils/orderUtils";

const ORDER_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

function SummaryTile({ label, value, compact = false }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className={`truncate font-extrabold text-white ${compact ? "text-[13px]" : "text-lg"}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-medium text-white/85">{label}</p>
    </div>
  );
}

function OrdersHeader({ summary, filter, search, onFilterChange, onSearchChange, onClearSearch }) {
  return (
    <div className="px-2 pb-3 pt-1">
      <h1 className="text-[22px] font-extrabold text-text-primary">My Orders</h1>
      <p className="mt-1 text-[13px] text-text-secondary">
        Track, manage and reorder your wholesale purchases
      </p>

      <div className="mt-3.5 rounded-lg bg-gradient-to-br from-[#2874F0] to-[#1A5DC9] p-3.5 shadow-[0_3px_8px_rgba(40,116,240,0.25)]">
        <div className="flex items-center">
          <SummaryTile label="Total orders" value={summary.total} />
          <div className="mx-1.5 h-9 w-px bg-white/25" />
          <SummaryTile label="In progress" value={summary.active} />
          <div className="mx-1.5 h-9 w-px bg-white/25" />
          <SummaryTile
            label="Total spent"
            value={formatOrderPrice(summary.spent, { withDecimals: false })}
            compact
          />
        </div>
      </div>

      <div className="relative mt-3">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by order ID or product name"
          className="w-full rounded-lg border border-border-light bg-white py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-[#2874F0] focus:ring-1 focus:ring-[#2874F0]"
        />
        {search ? (
          <button
            type="button"
            onClick={onClearSearch}
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition hover:bg-mobile-surface"
            aria-label="Clear search"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      <div className="mt-2.5 flex gap-2 overflow-x-auto hide-scrollbar">
        {ORDER_FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilterChange(item.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selected
                  ? "border-[#2874F0] bg-[#2874F0]/10 text-[#2874F0]"
                  : "border-border-light bg-white text-text-secondary"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StateCard({ children }) {
  return (
    <div className="rounded-lg bg-white p-6 shadow-[0_1px_4px_rgba(0,0,0,0.05)] sm:p-8">
      {children}
    </div>
  );
}

function Orders() {
  const { user, openAuthModal } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadOrders = useCallback(async () => {
    if (!user) {
      setOrders([]);
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data } = await getMyOrders();
      setOrders(data.data || []);
    } catch {
      setOrders([]);
      setError("Failed to load orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const summary = useMemo(() => buildOrdersSummary(orders), [orders]);
  const filteredOrders = useMemo(
    () => filterOrders(orders, { filter, query: search }),
    [orders, filter, search]
  );

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-2 pb-24 pt-2 sm:px-4 lg:pb-8 lg:pt-4">
      <div className="mx-auto max-w-3xl">
        {!user ? (
          <div className="px-2 pt-4">
            <StateCard>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center text-text-muted">
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-text-primary">Login to view your orders</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  Track wholesale orders, download invoices, and reorder in one tap.
                </p>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="mt-5 w-full rounded-lg bg-[#2874F0] px-8 py-3.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Login / Sign Up
                </button>
              </div>
            </StateCard>
          </div>
        ) : loading ? (
          <div className="space-y-3 px-2 pt-2">
            <div className="h-44 animate-pulse rounded-lg bg-white" />
            {[1, 2].map((item) => (
              <div key={item} className="h-72 animate-pulse rounded-lg bg-white" />
            ))}
          </div>
        ) : error && orders.length === 0 ? (
          <div className="px-2 pt-4">
            <StateCard>
              <div className="text-center">
                <p className="text-sm text-text-secondary">{error}</p>
                <button
                  type="button"
                  onClick={loadOrders}
                  className="mt-5 w-full rounded-lg bg-[#2874F0] px-8 py-3.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Retry
                </button>
              </div>
            </StateCard>
          </div>
        ) : orders.length === 0 ? (
          <div className="px-2 pt-4">
            <StateCard>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary/10 text-primary">
                  <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <h2 className="text-base font-bold text-text-primary">No orders yet</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  You haven&apos;t placed any wholesale orders. Browse products and checkout to see orders here.
                </p>
                <Link
                  to="/product"
                  className="mt-5 inline-block w-full rounded-lg bg-primary px-8 py-3.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Browse Products
                </Link>
              </div>
            </StateCard>
          </div>
        ) : (
          <>
            <OrdersHeader
              summary={summary}
              filter={filter}
              search={search}
              onFilterChange={setFilter}
              onSearchChange={setSearch}
              onClearSearch={() => setSearch("")}
            />

            {filteredOrders.length === 0 ? (
              <div className="px-2 py-12 text-center">
                <div className="mx-auto mb-3 text-text-muted">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <p className="font-semibold text-text-primary">No orders match your search</p>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Try a different filter or search term
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 px-2">
                {filteredOrders.map((order) => (
                  <FlipkartOrderCard key={order._id} order={order} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Orders;
