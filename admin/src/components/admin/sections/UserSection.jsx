import { useCallback, useEffect, useRef, useState, Fragment } from "react";
import { createUser, deleteUser, getUserOrderStats, getUsers, updateUser } from "../../../api/api";
import AdminAlert from "../AdminAlert";
import AdminPagination, { ADMIN_PAGE_SIZE } from "../AdminPagination";
import AdminSearchBar from "../AdminSearchBar";
import { IconEdit, IconTrash, IconWallet } from "../AdminIcons";
import UserEditModal from "../UserEditModal";
import AdjustWalletModal from "../AdjustWalletModal";
import {
  adminCompactTableClass,
  adminCompactTdClass,
  adminCompactThClass,
  adminFilterCardClass,
  adminTableHeaderClass,
  adminTableWrapperClass,
  btnPrimary,
  iconBtnClass,
  iconBtnDangerClass,
  pageHeaderActionsClass,
  pageHeaderClass,
} from "../adminStyles";
import { formatPrice } from "./adminOrderUtils";

const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_USER_PAGE_SIZE = 100;

function CustomerHistoryPanel({ stats, loading, error, onAdjustWallet }) {
  if (loading) {
    return <p className="text-sm text-neutral-500">Loading customer history...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="w-full min-w-0 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-900">Customer History & Wallet</p>
        {onAdjustWallet ? (
          <button
            type="button"
            onClick={onAdjustWallet}
            className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
          >
            Adjust Wallet Points
          </button>
        ) : null}
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="min-w-0 rounded-lg border border-neutral-200 bg-white px-2 py-2 sm:px-3">
          <p className="text-[10px] leading-tight text-neutral-500 sm:text-xs">Total Orders</p>
          <p className="mt-1 truncate text-base font-semibold text-neutral-900 sm:text-lg">
            {stats?.totalOrders ?? 0}
          </p>
        </div>
        <div className="min-w-0 rounded-lg border border-neutral-200 bg-white px-2 py-2 sm:px-3">
          <p className="text-[10px] leading-tight text-neutral-500 sm:text-xs">Total Revenue</p>
          <p className="mt-1 truncate text-base font-semibold text-neutral-900 sm:text-lg">
            {formatPrice(stats?.totalRevenue ?? 0)}
          </p>
        </div>
        <div className="min-w-0 rounded-lg border border-neutral-200 bg-white px-2 py-2 sm:px-3">
          <p className="text-[10px] leading-tight text-neutral-500 sm:text-xs">Avg Order Value</p>
          <p className="mt-1 truncate text-base font-semibold text-neutral-900 sm:text-lg">
            {formatPrice(stats?.averageOrderValue ?? 0)}
          </p>
        </div>
        <div className="min-w-0 rounded-lg border border-indigo-100 bg-indigo-50/50 px-2 py-2 sm:px-3">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] leading-tight text-indigo-700 sm:text-xs font-medium">Wallet Balance</p>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                stats?.walletStatus === "blocked"
                  ? "bg-red-100 text-red-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {stats?.walletStatus === "blocked" ? "Blocked" : "Active"}
            </span>
          </div>
          <p className="mt-1 truncate text-base font-bold text-indigo-900 sm:text-lg">
            {stats?.walletBalance ?? 0}{" "}
            <span className="text-xs font-medium text-indigo-700">
              pts (₹{stats?.walletBalance ?? 0})
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

function UserSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [adjustingWalletUser, setAdjustingWalletUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_USER_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Sort and filter states
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [walletFilter, setWalletFilter] = useState("all");
  const [orderFilter, setOrderFilter] = useState("all");
  const [walletStatus, setWalletStatus] = useState("all");

  const [expandedUserId, setExpandedUserId] = useState(null);
  const [historyByUser, setHistoryByUser] = useState({});
  const [historyLoadingId, setHistoryLoadingId] = useState(null);
  const fetchRequestIdRef = useRef(0);
  const skipSearchDebounceRef = useRef(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_USER_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    if (skipSearchDebounceRef.current) {
      skipSearchDebounceRef.current = false;
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      const nextQuery = searchInput.trim();
      setSearchQuery((prev) => {
        if (prev === nextQuery) return prev;
        setExpandedUserId(null);
        setPage(1);
        return nextQuery;
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [searchInput]);

  const fetchUsers = useCallback(async () => {
    const requestId = ++fetchRequestIdRef.current;

    try {
      setLoading(true);
      setError("");
      const params = {
        page,
        limit: pageSize,
        sortBy,
        sortOrder,
        walletFilter,
        orderFilter,
        walletStatus,
      };
      if (searchQuery) {
        if (/^\d+$/.test(searchQuery)) {
          params.phone = searchQuery;
        } else {
          params.name = searchQuery;
          params.search = searchQuery;
        }
      }
      const { data } = await getUsers(params);
      if (requestId !== fetchRequestIdRef.current) return;

      setUsers(data.data || []);
      setPagination(
        data.pagination || {
          page,
          limit: pageSize,
          total: data.data?.length || 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      if (requestId !== fetchRequestIdRef.current) return;
      setError(
        err.response?.data?.message ||
          "Failed to load users. Login as admin to view registered dealers."
      );
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [page, pageSize, searchQuery, sortBy, sortOrder, walletFilter, orderFilter, walletStatus]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const loadCustomerHistory = async (userId) => {
    if (historyByUser[userId]?.stats || historyByUser[userId]?.error) return;

    try {
      setHistoryLoadingId(userId);
      const { data } = await getUserOrderStats(userId);
      setHistoryByUser((prev) => ({
        ...prev,
        [userId]: { stats: data.data, error: "" },
      }));
    } catch (err) {
      setHistoryByUser((prev) => ({
        ...prev,
        [userId]: {
          stats: null,
          error: err.response?.data?.message || "Failed to load customer history",
        },
      }));
    } finally {
      setHistoryLoadingId(null);
    }
  };

  const handleRowClick = (userId) => {
    const id = String(userId);
    if (expandedUserId === id) {
      setExpandedUserId(null);
      return;
    }
    setExpandedUserId(id);
    loadCustomerHistory(id);
  };

  const closeModal = () => {
    setEditingUser(null);
    setShowAddUser(false);
  };

  const handleSave = async (id, payload) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      if (id) {
        await updateUser(id, payload);
        setSuccess("User updated successfully");
      } else {
        if (!payload.password) {
          delete payload.password;
        }
        await createUser(payload);
        setSuccess("User added successfully");
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || (id ? "Failed to update user" : "Failed to add user"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      setError("");
      setSuccess("");
      await deleteUser(id);
      setSuccess("User deleted");
      if (editingUser?._id === id) setEditingUser(null);
      if (expandedUserId === String(id)) setExpandedUserId(null);
      const nextPage = users.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
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

      <div className={pageHeaderClass}>
        <div>
          <p className="text-sm font-medium text-neutral-700">
            All users ({pagination.total})
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Click any row to see history
          </p>
        </div>
        <div className={pageHeaderActionsClass}>
          <button
            type="button"
            onClick={() => setShowAddUser(true)}
            className={btnPrimary}
          >
            Add User
          </button>
        </div>
      </div>

      <div className={`${adminFilterCardClass} mb-4 space-y-3`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <AdminSearchBar
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search by name, phone, email, or shop..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Dropdown */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="createdAt-desc">Joined: Newest First</option>
              <option value="createdAt-asc">Joined: Oldest First</option>
              <option value="walletBalance-desc">Wallet: Highest Balance</option>
              <option value="walletBalance-asc">Wallet: Lowest Balance</option>
              <option value="orderValue-desc">Order Value: Highest Spent</option>
              <option value="orderValue-asc">Order Value: Lowest Spent</option>
              <option value="totalOrders-desc">Orders: Most Orders</option>
              <option value="name-asc">Name: A to Z</option>
            </select>

            {/* Wallet Filter */}
            <select
              value={walletFilter}
              onChange={(e) => {
                setWalletFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Wallet Balances</option>
              <option value="has_balance">&gt;0 Points Only</option>
              <option value="zero_balance">0 Points Only</option>
            </select>

            {/* Order History Filter */}
            <select
              value={orderFilter}
              onChange={(e) => {
                setOrderFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Order History</option>
              <option value="has_orders">Has Placed Orders</option>
              <option value="no_orders">Zero Orders</option>
            </select>

            {/* Wallet Status Filter */}
            <select
              value={walletStatus}
              onChange={(e) => {
                setWalletStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Wallet Statuses</option>
              <option value="active">Active Only</option>
              <option value="blocked">Blocked Only</option>
            </select>

            {/* Page Size Selector */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value={100}>100 per page</option>
              <option value={50}>50 per page</option>
              <option value={20}>20 per page</option>
            </select>

            {/* Reset Filters button if any filter is active */}
            {sortBy !== "createdAt" ||
            sortOrder !== "desc" ||
            walletFilter !== "all" ||
            orderFilter !== "all" ||
            walletStatus !== "all" ||
            searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSortBy("createdAt");
                  setSortOrder("desc");
                  setWalletFilter("all");
                  setOrderFilter("all");
                  setWalletStatus("all");
                  setSearchInput("");
                  setSearchQuery("");
                  setPage(1);
                }}
                className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {loading && users.length === 0 ? (
        <p className="text-text-secondary">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-text-secondary">
          {error
            ? "Could not load users."
            : searchQuery || walletFilter !== "all" || orderFilter !== "all"
              ? "No users found matching these filters."
              : "No registered users yet."}
        </p>
      ) : (
        <div className={adminTableWrapperClass}>
          {loading ? (
            <p className="mb-2 px-3 pt-3 text-xs text-neutral-500">Searching...</p>
          ) : null}
          <table className={adminCompactTableClass}>
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[16%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead>
              <tr className={adminTableHeaderClass}>
                <th className={adminCompactThClass}>Name</th>
                <th className={adminCompactThClass}>Phone</th>
                <th className={adminCompactThClass}>Wallet Balance</th>
                <th className={adminCompactThClass}>Order Value</th>
                <th className={adminCompactThClass}>Joined</th>
                <th className={adminCompactThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const userId = String(user._id);
                const isExpanded = expandedUserId === userId;
                const history = historyByUser[userId];

                return (
                  <Fragment key={userId}>
                    <tr
                      onClick={() => handleRowClick(userId)}
                      className={`cursor-pointer border-b border-neutral-100 hover:bg-neutral-50/50 ${
                        isExpanded ? "bg-neutral-50/70" : ""
                      }`}
                    >
                      <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                        <div className="min-w-0">
                          <span className="block truncate">{user.name}</span>
                          {user.shopName ? (
                            <span className="block truncate text-[11px] text-neutral-500 font-normal">
                              🏪 {user.shopName}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={`${adminCompactTdClass} text-neutral-600`}>
                        <span className="block truncate font-mono text-xs">{user.phone}</span>
                      </td>
                      <td className={adminCompactTdClass}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              (user.walletBalance || 0) > 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                            }`}
                          >
                            <span>{user.walletBalance || 0} pts</span>
                            <span className="text-[10px] font-normal opacity-75">
                              (₹{user.walletBalance || 0})
                            </span>
                          </span>
                          {user.walletStatus === "blocked" ? (
                            <span className="rounded bg-red-100 px-1 py-0.2 text-[10px] font-medium text-red-700">
                              Blocked
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className={adminCompactTdClass}>
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 text-xs">
                            {formatPrice(user.totalRevenue || 0)}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {user.totalOrders || 0} {user.totalOrders === 1 ? "order" : "orders"}
                          </p>
                        </div>
                      </td>
                      <td className={`${adminCompactTdClass} text-neutral-600`}>
                        <span className="block truncate text-xs">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("en-IN")
                            : "—"}
                        </span>
                      </td>
                      <td className={adminCompactTdClass}>
                        <div className="flex flex-nowrap items-center gap-1">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setAdjustingWalletUser(user);
                            }}
                            className={iconBtnClass}
                            title="Adjust Wallet Balance"
                            aria-label="Adjust Wallet Balance"
                          >
                            <IconWallet className="w-4 h-4 text-indigo-600" />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setEditingUser(user);
                            }}
                            className={iconBtnClass}
                            title="Edit"
                            aria-label="Edit user"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDelete(user._id);
                            }}
                            className={iconBtnDangerClass}
                            title="Delete"
                            aria-label="Delete user"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded ? (
                      <tr className="border-b border-neutral-100 bg-neutral-50">
                        <td colSpan={6} className="px-3 py-3 sm:px-4">
                          <CustomerHistoryPanel
                            stats={history?.stats}
                            loading={historyLoadingId === userId}
                            error={history?.error}
                            onAdjustWallet={() => setAdjustingWalletUser(user)}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          <AdminPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            loading={loading}
            onPageChange={(nextPage) => {
              setExpandedUserId(null);
              setPage(nextPage);
            }}
          />
        </div>
      )}

      <UserEditModal
        user={editingUser}
        isAdd={showAddUser}
        onClose={closeModal}
        onSave={handleSave}
        saving={saving}
      />

      <AdjustWalletModal
        user={adjustingWalletUser}
        onClose={() => setAdjustingWalletUser(null)}
        onSuccess={(result) => {
          setSuccess(
            `Wallet updated: ${
              result.actionType === "credit" ? "+" : "-"
            }${result.points} points`
          );
          fetchUsers();
          if (expandedUserId === String(result.userId)) {
            setHistoryByUser((prev) => ({
              ...prev,
              [result.userId]: undefined,
            }));
            loadCustomerHistory(result.userId);
          }
        }}
      />
    </div>
  );
}

export default UserSection;
