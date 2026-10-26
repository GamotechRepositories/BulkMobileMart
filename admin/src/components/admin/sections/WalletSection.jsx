import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAdminWallets,
  getAdminWalletTransactions,
  updateAdminWalletStatus,
} from "../../../api/api";
import AdminAlert from "../AdminAlert";
import AdminPagination, { ADMIN_PAGE_SIZE } from "../AdminPagination";
import AdminSearchBar from "../AdminSearchBar";
import { IconWallet } from "../AdminIcons";
import AdjustWalletModal from "../AdjustWalletModal";
import {
  adminCompactTableClass,
  adminCompactTdClass,
  adminCompactThClass,
  adminFilterCardClass,
  adminTableHeaderClass,
  adminTableWrapperClass,
  btnPrimary,
  btnSecondary,
  iconBtnClass,
  pageHeaderActionsClass,
  pageHeaderClass,
} from "../adminStyles";

const SEARCH_DEBOUNCE_MS = 300;

const TRANSACTION_TYPE_LABELS = {
  referral_reward: { label: "Referral Reward", color: "bg-purple-50 text-purple-700 border-purple-200" },
  order_reward: { label: "Order Reward", color: "bg-blue-50 text-blue-700 border-blue-200" },
  points_redemption: { label: "Redemption", color: "bg-amber-50 text-amber-700 border-amber-200" },
  points_refund: { label: "Refund", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  admin_credit: { label: "Admin Credit", color: "bg-green-50 text-green-700 border-green-200" },
  admin_debit: { label: "Admin Debit", color: "bg-rose-50 text-rose-700 border-rose-200" },
  compensation: { label: "Compensation", color: "bg-teal-50 text-teal-700 border-teal-200" },
  promotional: { label: "Promotional", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  expiry: { label: "Expired", color: "bg-neutral-50 text-neutral-600 border-neutral-200" },
  adjustment: { label: "Adjustment", color: "bg-neutral-50 text-neutral-600 border-neutral-200" },
};

function formatTypeBadge(type) {
  const conf = TRANSACTION_TYPE_LABELS[type] || {
    label: type || "Transaction",
    color: "bg-neutral-50 text-neutral-600 border-neutral-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${conf.color}`}
    >
      {conf.label}
    </span>
  );
}

function WalletSection() {
  const [activeTab, setActiveTab] = useState("wallets"); // "wallets" | "transactions"
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  // Filters for Wallets tab
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hasBalanceOnly, setHasBalanceOnly] = useState(false);
  const [sortBy, setSortBy] = useState("pointsBalance");
  const [sortOrder, setSortOrder] = useState("desc");

  // Filters for Transactions tab
  const [typeFilter, setTypeFilter] = useState("all");

  // Selected wallet for adjustments
  const [adjustingWallet, setAdjustingWallet] = useState(null);
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  const fetchRequestIdRef = useRef(0);
  const skipSearchDebounceRef = useRef(true);

  // Debounced search
  useEffect(() => {
    if (skipSearchDebounceRef.current) {
      skipSearchDebounceRef.current = false;
      return undefined;
    }
    const timerId = window.setTimeout(() => {
      const nextQuery = searchInput.trim();
      setSearchQuery((prev) => {
        if (prev === nextQuery) return prev;
        setPage(1);
        return nextQuery;
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [searchInput]);

  const loadWallets = useCallback(async () => {
    const reqId = ++fetchRequestIdRef.current;
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: ADMIN_PAGE_SIZE,
        sortBy,
        sortOrder,
      };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;
      if (hasBalanceOnly) params.minBalance = 1;

      const { data } = await getAdminWallets(params);
      if (reqId !== fetchRequestIdRef.current) return;

      setWallets(data.data || []);
      setPagination(
        data.pagination || {
          page,
          limit: ADMIN_PAGE_SIZE,
          total: data.data?.length || 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      if (reqId !== fetchRequestIdRef.current) return;
      setError(err.response?.data?.message || "Failed to load customer wallets");
    } finally {
      if (reqId === fetchRequestIdRef.current) setLoading(false);
    }
  }, [page, searchQuery, statusFilter, hasBalanceOnly, sortBy, sortOrder]);

  const loadTransactions = useCallback(async () => {
    const reqId = ++fetchRequestIdRef.current;
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: ADMIN_PAGE_SIZE,
      };
      if (searchQuery) params.search = searchQuery;
      if (typeFilter !== "all") params.type = typeFilter;

      const { data } = await getAdminWalletTransactions(params);
      if (reqId !== fetchRequestIdRef.current) return;

      setTransactions(data.data || []);
      setPagination(
        data.pagination || {
          page,
          limit: ADMIN_PAGE_SIZE,
          total: data.data?.length || 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      if (reqId !== fetchRequestIdRef.current) return;
      setError(err.response?.data?.message || "Failed to load wallet transactions");
    } finally {
      if (reqId === fetchRequestIdRef.current) setLoading(false);
    }
  }, [page, searchQuery, typeFilter]);

  useEffect(() => {
    if (activeTab === "wallets") {
      loadWallets();
    } else {
      loadTransactions();
    }
  }, [activeTab, loadWallets, loadTransactions]);

  const handleToggleStatus = async (wallet) => {
    const nextStatus = wallet.status === "blocked" ? "active" : "blocked";
    const confirmMsg =
      nextStatus === "blocked"
        ? `Block wallet for ${wallet.userId?.name || "this user"}? They will not be able to earn or redeem points.`
        : `Unblock wallet for ${wallet.userId?.name || "this user"}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setTogglingStatusId(wallet._id);
      setError("");
      await updateAdminWalletStatus(wallet.userId?._id || wallet.userId, nextStatus);
      setSuccess(`Wallet status changed to ${nextStatus}`);
      loadWallets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update wallet status");
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleViewUserTransactions = (user) => {
    setActiveTab("transactions");
    setPage(1);
    setSearchInput(user.phone || user.name || "");
    setSearchQuery(user.phone || user.name || "");
  };

  // Quick calculations for the current view
  const totalPointsInPage = wallets.reduce(
    (sum, w) => sum + (Number(w.pointsBalance) || 0),
    0
  );

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
          <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <IconWallet className="w-6 h-6 text-indigo-600" />
            <span>Customer Wallets & Points</span>
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            View live wallet balances, adjust customer points, and inspect the points ledger.
          </p>
        </div>
        <div className={pageHeaderActionsClass}>
          <div className="flex rounded-lg bg-neutral-100 p-1 border border-neutral-200">
            <button
              type="button"
              onClick={() => {
                setActiveTab("wallets");
                setPage(1);
                setSearchInput("");
                setSearchQuery("");
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "wallets"
                  ? "bg-white text-indigo-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Customer Wallets
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("transactions");
                setPage(1);
                setSearchInput("");
                setSearchQuery("");
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                activeTab === "transactions"
                  ? "bg-white text-indigo-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Points Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4 sm:grid-cols-4">
        <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-3.5 shadow-sm">
          <p className="text-xs font-medium text-indigo-700">Total Wallets Registered</p>
          <p className="mt-1 text-xl font-black text-indigo-950 sm:text-2xl">
            {activeTab === "wallets" ? pagination.total : "—"}
          </p>
          <p className="text-[11px] text-indigo-500 mt-0.5">Across all registered dealers</p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-3.5 shadow-sm">
          <p className="text-xs font-medium text-emerald-700">Page Points Total</p>
          <p className="mt-1 text-xl font-black text-emerald-950 sm:text-2xl">
            {totalPointsInPage}{" "}
            <span className="text-xs font-normal text-emerald-700">
              pts (₹{totalPointsInPage})
            </span>
          </p>
          <p className="text-[11px] text-emerald-600 mt-0.5">1 Point = ₹1 Conversion</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm">
          <p className="text-xs font-medium text-neutral-600">Active Mode</p>
          <p className="mt-1 text-lg font-bold text-neutral-900 capitalize">
            {activeTab === "wallets" ? "Customer Accounts" : "Live Transaction Log"}
          </p>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {pagination.total} records found
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-600">Quick Rule</p>
            <p className="mt-0.5 text-xs font-semibold text-neutral-800">
              Points Auto-Redeem at Checkout
            </p>
          </div>
          <p className="text-[11px] text-neutral-500">
            Referrals: ₹50 / Purchase: ₹25
          </p>
        </div>
      </div>

      {/* Filter Card */}
      <div className={`${adminFilterCardClass} mb-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3`}>
        <div className="flex-1">
          <AdminSearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder={
              activeTab === "wallets"
                ? "Search by dealer name, phone, email, or shop..."
                : "Search by ref ID, description, or user details..."
            }
          />
        </div>

        {activeTab === "wallets" ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="blocked">Blocked Only</option>
            </select>

            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="pointsBalance-desc">Highest Balance First</option>
              <option value="pointsBalance-asc">Lowest Balance First</option>
              <option value="updatedAt-desc">Recently Updated</option>
              <option value="createdAt-desc">Recently Created</option>
            </select>

            <label className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 cursor-pointer select-none px-1">
              <input
                type="checkbox"
                checked={hasBalanceOnly}
                onChange={(e) => {
                  setHasBalanceOnly(e.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-neutral-300 text-indigo-600 accent-indigo-600"
              />
              <span>&gt;0 pts only</span>
            </label>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="points_redemption">Redemption</option>
              <option value="referral_reward">Referral Reward</option>
              <option value="order_reward">Order Reward</option>
              <option value="admin_credit">Admin Credit</option>
              <option value="admin_debit">Admin Debit</option>
              <option value="points_refund">Points Refund</option>
            </select>
          </div>
        )}
      </div>

      {/* Content Table */}
      {activeTab === "wallets" ? (
        loading && wallets.length === 0 ? (
          <p className="text-neutral-500 p-4 text-center">Loading customer wallets...</p>
        ) : wallets.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
            <IconWallet className="mx-auto h-10 w-10 text-neutral-400" />
            <p className="mt-2 text-sm font-semibold text-neutral-700">No wallets found</p>
            <p className="text-xs text-neutral-500 mt-1">
              {searchQuery
                ? "Try adjusting your search query or filters."
                : "Customer wallets are created automatically when users sign up or earn rewards."}
            </p>
          </div>
        ) : (
          <div className={adminTableWrapperClass}>
            <table className={adminCompactTableClass}>
              <colgroup>
                <col className="w-[24%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className={adminTableHeaderClass}>
                  <th className={adminCompactThClass}>Customer / Shop</th>
                  <th className={adminCompactThClass}>Phone</th>
                  <th className={adminCompactThClass}>Wallet Balance</th>
                  <th className={adminCompactThClass}>Status</th>
                  <th className={adminCompactThClass}>Last Updated</th>
                  <th className={adminCompactThClass}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((wallet) => {
                  const user = wallet.userId || {};
                  const isBlocked = wallet.status === "blocked";
                  const isToggling = togglingStatusId === wallet._id;

                  return (
                    <tr
                      key={wallet._id}
                      className="border-b border-neutral-100 hover:bg-neutral-50/50"
                    >
                      <td className={adminCompactTdClass}>
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 truncate">
                            {user.name || "Unknown Customer"}
                          </p>
                          {user.shopName ? (
                            <p className="text-[11px] text-neutral-500 truncate">
                              🏪 {user.shopName}
                            </p>
                          ) : null}
                          {user.email ? (
                            <p className="text-[11px] text-neutral-400 truncate">
                              {user.email}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className={`${adminCompactTdClass} text-neutral-600`}>
                        <span className="font-mono text-xs">{user.phone || "—"}</span>
                      </td>

                      <td className={adminCompactTdClass}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              (wallet.pointsBalance || 0) > 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                            }`}
                          >
                            <span>{wallet.pointsBalance || 0} pts</span>
                            <span className="text-[10px] font-normal opacity-75">
                              (₹{wallet.pointsBalance || 0})
                            </span>
                          </span>
                        </div>
                      </td>

                      <td className={adminCompactTdClass}>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isBlocked
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isBlocked ? "Blocked" : "Active"}
                        </span>
                      </td>

                      <td className={`${adminCompactTdClass} text-neutral-500 text-xs`}>
                        {wallet.updatedAt
                          ? new Date(wallet.updatedAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      <td className={adminCompactTdClass}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() =>
                              setAdjustingWallet({
                                ...wallet,
                                _id: user._id || wallet.userId,
                                name: user.name,
                                phone: user.phone,
                                walletBalance: wallet.pointsBalance,
                              })
                            }
                            className="rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-sm"
                            title="Credit or Debit points"
                          >
                            Adjust
                          </button>

                          <button
                            type="button"
                            onClick={() => handleViewUserTransactions(user)}
                            className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition"
                            title="View points history"
                          >
                            History
                          </button>

                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleToggleStatus(wallet)}
                            className={`rounded-md px-2 py-1 text-xs font-medium border transition ${
                              isBlocked
                                ? "border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                : "border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                            }`}
                            title={isBlocked ? "Unblock wallet" : "Block wallet"}
                          >
                            {isToggling ? "…" : isBlocked ? "Unblock" : "Block"}
                          </button>
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
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          </div>
        )
      ) : (
        /* Transactions Ledger Table */
        loading && transactions.length === 0 ? (
          <p className="text-neutral-500 p-4 text-center">Loading points ledger...</p>
        ) : transactions.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-8 text-center">
            <IconWallet className="mx-auto h-10 w-10 text-neutral-400" />
            <p className="mt-2 text-sm font-semibold text-neutral-700">No transactions recorded</p>
            <p className="text-xs text-neutral-500 mt-1">
              Points earned via referrals, orders, and redemption will appear here.
            </p>
          </div>
        ) : (
          <div className={adminTableWrapperClass}>
            <table className={adminCompactTableClass}>
              <colgroup>
                <col className="w-[15%]" />
                <col className="w-[20%]" />
                <col className="w-[15%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[24%]" />
              </colgroup>
              <thead>
                <tr className={adminTableHeaderClass}>
                  <th className={adminCompactThClass}>Date & Time</th>
                  <th className={adminCompactThClass}>Customer</th>
                  <th className={adminCompactThClass}>Type</th>
                  <th className={adminCompactThClass}>Points Delta</th>
                  <th className={adminCompactThClass}>Balance After</th>
                  <th className={adminCompactThClass}>Description & Ref</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
                  const user = tx.userId || {};
                  const isPositive = (tx.pointsDelta || 0) > 0;

                  return (
                    <tr
                      key={tx._id}
                      className="border-b border-neutral-100 hover:bg-neutral-50/50"
                    >
                      <td className={`${adminCompactTdClass} text-neutral-500 text-xs`}>
                        {tx.createdAt
                          ? new Date(tx.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>

                      <td className={adminCompactTdClass}>
                        <div className="min-w-0">
                          <p className="font-semibold text-neutral-900 truncate text-xs">
                            {user.name || "Customer"}
                          </p>
                          <p className="text-[11px] text-neutral-500 font-mono">
                            {user.phone || ""}
                          </p>
                        </div>
                      </td>

                      <td className={adminCompactTdClass}>
                        {formatTypeBadge(tx.type)}
                      </td>

                      <td className={adminCompactTdClass}>
                        <span
                          className={`font-black text-xs ${
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isPositive ? `+${tx.pointsDelta}` : tx.pointsDelta} pts
                        </span>
                      </td>

                      <td className={`${adminCompactTdClass} font-semibold text-neutral-800 text-xs`}>
                        {tx.balanceAfter ?? "—"} pts
                      </td>

                      <td className={adminCompactTdClass}>
                        <div className="min-w-0">
                          <p className="text-xs text-neutral-800 truncate">
                            {tx.description || "—"}
                          </p>
                          {tx.referenceId ? (
                            <p className="text-[10px] text-neutral-400 font-mono truncate">
                              Ref: {tx.referenceId}
                            </p>
                          ) : null}
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
              onPageChange={(nextPage) => setPage(nextPage)}
            />
          </div>
        )
      )}

      {/* Adjust Wallet Modal */}
      <AdjustWalletModal
        user={adjustingWallet}
        onClose={() => setAdjustingWallet(null)}
        onSuccess={(result) => {
          setSuccess(
            `Wallet balance updated: ${
              result.actionType === "credit" ? "+" : "-"
            }${result.points} points`
          );
          if (activeTab === "wallets") loadWallets();
          else loadTransactions();
        }}
      />
    </div>
  );
}

export default WalletSection;
