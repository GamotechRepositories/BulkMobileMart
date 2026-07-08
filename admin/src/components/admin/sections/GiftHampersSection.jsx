import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAdminGiftHamperOrders, getStoreSettings, updateAdminGiftHamper } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import AdminAlert from "../AdminAlert";
import AdminPagination, { ADMIN_PAGE_SIZE } from "../AdminPagination";
import {
  adminCompactTableClass,
  adminCompactTdClass,
  adminCompactThClass,
  adminFilterInputClass,
  adminTableHeaderClass,
  adminTableWrapperClass,
  btnPrimary,
  btnSecondary,
  pageHeaderClass,
} from "../adminStyles";
import {
  formatDate,
  formatPrice,
  getCustomerName,
  getCustomerPhone,
  getOrderDisplayId,
  normalizeAdminSearchQuery,
} from "./adminOrderUtils";

const STATUS_TABS = [
  { value: "pending", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

function getGiftHamperStatusBadge(status) {
  if (status === "approved") {
    return { label: "Approved", className: "bg-green-100 text-green-800" };
  }
  if (status === "rejected") {
    return { label: "Rejected", className: "bg-red-100 text-red-800" };
  }
  return { label: "Pending", className: "bg-amber-100 text-amber-800" };
}

function GiftHampersSection() {
  const navigate = useNavigate();
  const { adminUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [actingId, setActingId] = useState("");
  const [featureEnabled, setFeatureEnabled] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    let active = true;
    getStoreSettings()
      .then(({ data }) => {
        if (!active) return;
        setFeatureEnabled(Boolean(data?.data?.giftHampersEnabled));
      })
      .catch(() => {
        if (!active) return;
        setFeatureEnabled(true);
      })
      .finally(() => {
        if (active) setSettingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery]);

  const fetchOrders = useCallback(async () => {
    if (adminUser?.role !== "admin") return;

    try {
      setLoading(true);
      setError("");
      const params = { page, limit: ADMIN_PAGE_SIZE, status: statusFilter };
      if (searchQuery.trim()) params.search = normalizeAdminSearchQuery(searchQuery);

      const { data } = await getAdminGiftHamperOrders(params);
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
      setError(err.response?.data?.message || "Failed to load gift hampers");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [adminUser?.role, page, searchQuery, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleReview = async (orderId, status) => {
    const adminNote =
      status === "rejected"
        ? window.prompt("Optional reason for rejection (shown internally):") || ""
        : "";

    if (status === "rejected" && adminNote === null) return;

    setActingId(orderId);
    setError("");
    setSuccess("");
    try {
      await updateAdminGiftHamper(orderId, { status, adminNote });
      setSuccess(status === "approved" ? "Gift hamper approved" : "Gift hamper rejected");
      fetchOrders();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update gift hamper");
    } finally {
      setActingId("");
    }
  };

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

      <div className={pageHeaderClass}>
        <div>
          <h2 className="text-lg font-bold text-text-primary">Gift Hampers</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Orders that qualify for gift hampers based on store settings thresholds.
          </p>
        </div>
      </div>

      {!settingsLoading && !featureEnabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Gift hampers are currently <strong>disabled</strong> in store settings. New orders
          will not qualify for hampers until you enable the feature. You can still review
          orders that qualified before it was turned off.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              statusFilter === tab.value
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="max-w-md">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search order, customer, phone..."
          className={adminFilterInputClass}
        />
      </div>

      {loading ? (
        <p className="text-text-secondary">Loading gift hampers...</p>
      ) : orders.length === 0 ? (
        <p className="text-text-secondary">No gift hamper orders found.</p>
      ) : (
        <div className={adminTableWrapperClass}>
          <table className={adminCompactTableClass}>
            <thead>
              <tr className={adminTableHeaderClass}>
                <th className={adminCompactThClass}>Order</th>
                <th className={adminCompactThClass}>Customer</th>
                <th className={adminCompactThClass}>Order Total</th>
                <th className={adminCompactThClass}>Threshold</th>
                <th className={adminCompactThClass}>Gift</th>
                <th className={adminCompactThClass}>Status</th>
                <th className={adminCompactThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const badge = getGiftHamperStatusBadge(order.giftHamper?.status);
                const isActing = actingId === order._id;
                return (
                  <tr key={order._id} className="border-b border-neutral-100 last:border-0">
                    <td className={`${adminCompactTdClass} font-semibold`}>
                      <button
                        type="button"
                        onClick={() => navigate(`/orders/${order._id}`)}
                        className="text-left text-primary hover:underline"
                      >
                        #{getOrderDisplayId(order)}
                      </button>
                      <p className="mt-0.5 text-[10px] font-normal text-neutral-500">
                        {formatDate(order.createdAt)}
                      </p>
                    </td>
                    <td className={adminCompactTdClass}>
                      <span className="block font-medium">{getCustomerName(order)}</span>
                      <span className="text-[10px] text-neutral-500">{getCustomerPhone(order)}</span>
                    </td>
                    <td className={adminCompactTdClass}>{formatPrice(order.total)}</td>
                    <td className={adminCompactTdClass}>
                      {formatPrice(order.giftHamper?.minOrderAmount || 0)}
                    </td>
                    <td className={adminCompactTdClass}>
                      <div className="flex items-start gap-2">
                        {order.giftHamper?.gift?.image ? (
                          <img
                            src={order.giftHamper.gift.image}
                            alt=""
                            className="h-10 w-10 rounded object-cover"
                          />
                        ) : null}
                        <div className="min-w-0">
                          <p className="font-medium text-neutral-900">
                            {order.giftHamper?.gift?.name || "—"}
                          </p>
                          {order.giftHamper?.gift?.description ? (
                            <p className="mt-0.5 line-clamp-2 text-[10px] text-neutral-500">
                              {order.giftHamper.gift.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className={adminCompactTdClass}>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className={adminCompactTdClass}>
                      <div className="flex flex-wrap gap-1">
                        {order.giftHamper?.status === "pending" ? (
                          <>
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => handleReview(order._id, "approved")}
                              className={btnPrimary}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isActing}
                              onClick={() => handleReview(order._id, "rejected")}
                              className={btnSecondary}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <Link
                            to={`/orders/${order._id}`}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View order
                          </Link>
                        )}
                      </div>
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

export default GiftHampersSection;
