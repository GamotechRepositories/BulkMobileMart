import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  getMyOrders,
  getMyWallet,
  getMyWalletTransactions,
  claimReferralCode,
} from "../api/api";
import AddressForm, { ADDRESS_FORM_FIELDS } from "../components/address/AddressForm";
import BuyAgainCard from "../components/product/BuyAgainCard";
import {
  formatAddressLine,
  getAddressFullName,
  mapAddressToForm,
} from "../utils/addressDisplay";

function profileFirstName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts[0] || "there";
}

function profileInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function extractRecentOrderItems(orders, maxItems = 12) {
  const eligible = orders
    .filter((order) => order.status !== "cancelled" && order.status !== "attempted" && order.status !== "return")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const seen = new Set();
  const items = [];

  for (const order of eligible) {
    for (const item of order.items || []) {
      const productId = item.product?._id || item.product;
      if (!productId || seen.has(String(productId))) continue;
      seen.add(String(productId));
      items.push({
        ...item,
        productId: String(productId),
        image: item.image || item.productImage || item.product?.productImages?.[0] || "",
      });
      if (items.length >= maxItems) return items;
    }
  }

  return items;
}

function formatTransactionDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTransactionTypeDetails(type) {
  switch (type) {
    case "cashback":
      return {
        label: "Cashback Reward",
        badgeClass: "bg-emerald-100 text-emerald-800",
      };
    case "referral_reward":
      return {
        label: "Referral Bonus",
        badgeClass: "bg-emerald-100 text-emerald-800",
      };
    case "points_redemption":
      return {
        label: "Points Redeemed",
        badgeClass: "bg-amber-100 text-amber-800",
      };
    case "points_expiry":
      return {
        label: "Points Expired",
        badgeClass: "bg-red-100 text-red-800",
      };
    case "reward_reversal":
      return {
        label: "Reward Reversed",
        badgeClass: "bg-red-100 text-red-800",
      };
    case "admin_adjustment":
      return {
        label: "Admin Adjustment",
        badgeClass: "bg-blue-100 text-blue-800",
      };
    default:
      return {
        label: type ? type.replace(/_/g, " ") : "Transaction",
        badgeClass: "bg-gray-100 text-gray-800",
      };
  }
}

function ProfileInfoRow({ icon, label, value, onEdit, showDivider }) {
  return (
    <div>
      <div className="flex items-center gap-3 px-3.5 py-3.5 sm:px-4 sm:py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFE8D4] text-primary">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-text-secondary">{label}</p>
          <p className="truncate text-sm font-semibold text-text-primary">{value}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-primary"
        >
          Edit
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      {showDivider ? <div className="ml-[62px] mr-3.5 border-t border-border-light" /> : null}
    </div>
  );
}

function QuickLink({ icon, label, onClick, to }) {
  const content = (
    <>
      <div className="mx-auto flex h-8 w-8 items-center justify-center text-primary">{icon}</div>
      <span className="mt-1.5 block text-center text-[10px] font-semibold leading-tight text-text-primary">
        {label}
      </span>
    </>
  );

  const className = "flex-1 rounded-xl px-1 py-1 transition hover:bg-white/60";

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function Profile() {
  const navigate = useNavigate();
  const { user, openAuthModal, logout, updateProfile } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [formError, setFormError] = useState("");
  const [recentItems, setRecentItems] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [addressIndex, setAddressIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const addressesRef = useRef(null);

  // Wallet state
  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState("all");

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const { data } = await getAddresses();
      setAddresses(data.data || []);
    } catch {
      setAddresses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentItems = async () => {
    setRecentLoading(true);
    try {
      const { data } = await getMyOrders();
      setRecentItems(extractRecentOrderItems(data.data || []));
    } catch {
      setRecentItems([]);
    } finally {
      setRecentLoading(false);
    }
  };

  const loadWallet = async () => {
    setWalletLoading(true);
    try {
      const { data } = await getMyWallet();
      setWallet(data.data || null);
    } catch (err) {
      console.error("Failed to load wallet:", err);
      setWallet(null);
    } finally {
      setWalletLoading(false);
    }
  };

  const loadWalletTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const { data } = await getMyWalletTransactions({ limit: 50 });
      setWalletTransactions(data.data || []);
    } catch (err) {
      console.error("Failed to load transactions:", err);
      setWalletTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAddresses();
      loadRecentItems();
      loadWallet();
    } else {
      setAddresses([]);
      setRecentItems([]);
      setWallet(null);
      setLoading(false);
      setWalletLoading(false);
    }
  }, [user]);

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === "credit") {
      return walletTransactions.filter((tx) => Number(tx.pointsDelta) > 0);
    }
    if (transactionFilter === "debit") {
      return walletTransactions.filter((tx) => Number(tx.pointsDelta) < 0);
    }
    return walletTransactions;
  }, [walletTransactions, transactionFilter]);

  // Referral state & handlers
  const [referralInput, setReferralInput] = useState("");
  const [claimingReferral, setClaimingReferral] = useState(false);
  const [referralMsg, setReferralMsg] = useState({ error: "", success: "" });
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareLink = async (link, code) => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join BulkMobileMart",
          text: `Use my referral code ${code} to get welcome bonus points on BulkMobileMart!`,
          url: link,
        });
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
      }
    }
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleClaimReferral = async (e) => {
    e?.preventDefault();
    if (!referralInput.trim()) return;
    setClaimingReferral(true);
    setReferralMsg({ error: "", success: "" });
    try {
      const { data } = await claimReferralCode(referralInput.trim());
      setReferralMsg({ error: "", success: data.message || "Referral bonus claimed!" });
      setReferralInput("");
      loadWallet();
    } catch (err) {
      setReferralMsg({
        error: err.response?.data?.message || "Failed to claim referral code",
        success: "",
      });
    } finally {
      setClaimingReferral(false);
    }
  };

  useEffect(() => {
    if (addressIndex >= addresses.length) {
      setAddressIndex(Math.max(0, addresses.length - 1));
    }
  }, [addresses.length, addressIndex]);

  const handleSaveAddress = async (formData) => {
    setSavingAddress(true);
    setFormError("");
    try {
      if (editingAddress) {
        const { data } = await updateAddress(editingAddress._id, formData);
        setAddresses((prev) =>
          prev.map((addr) => (addr._id === editingAddress._id ? data.data : addr))
        );
      } else {
        const { data } = await addAddress({
          ...formData,
          isDefault: addresses.length === 0,
        });
        setAddresses((prev) => [data.data, ...prev]);
      }
      setShowAddressForm(false);
      setEditingAddress(null);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save address");
    } finally {
      setSavingAddress(false);
    }
  };

  const handleEditProfileField = async (field, label, currentValue) => {
    const nextValue = window.prompt(`Edit ${label}`, currentValue);
    if (nextValue == null || nextValue.trim() === currentValue) return;

    try {
      await updateProfile({ [field]: nextValue.trim() });
    } catch (err) {
      window.alert(err.response?.data?.message || "Failed to update profile");
    }
  };

  const handleEditAddress = (addr) => {
    setEditingAddress(addr);
    setShowAddressForm(true);
    setFormError("");
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm("Remove this address?")) return;
    try {
      await deleteAddress(addrId);
      setAddresses((prev) => prev.filter((addr) => addr._id !== addrId));
    } catch {
      setFormError("Failed to delete address");
    }
  };

  const cancelAddressForm = () => {
    setShowAddressForm(false);
    setEditingAddress(null);
    setFormError("");
  };

  const scrollToAddresses = () => {
    addressesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const currentAddress = addresses[addressIndex];

  if (!user) {
    return (
      <div className="min-h-screen bg-mobile-bg px-4 pb-24 pt-4">
        <div className="mx-auto max-w-xl rounded-2xl border border-border-light bg-white px-6 py-10 text-center">
          <p className="mb-6 text-sm text-text-secondary">
            Sign in to manage your account and addresses.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal("login")}
            className="rounded-lg bg-primary px-8 py-3 text-sm font-bold text-white transition hover:brightness-110"
          >
            Login / Sign Up
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mobile-bg px-4 pb-24 pt-4 sm:px-6">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Hi, {profileFirstName(user.name)} 👋
            </h1>
            <p className="mt-1 text-sm text-text-secondary">Manage your profile & addresses</p>
          </div>
          <div className="relative shrink-0">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary/15 bg-[#FFE8D4] text-lg font-bold text-primary">
              {profileInitials(user.name)}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-border-light bg-white shadow-sm">
              <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a1.5 1.5 0 00-4.5-4.5L4 15.5V20z" />
              </svg>
            </span>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border-light bg-white shadow-sm">
          <ProfileInfoRow
            icon={
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            label="Name"
            value={user.name}
            onEdit={() => handleEditProfileField("name", "Name", user.name)}
            showDivider
          />
          <ProfileInfoRow
            icon={
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            label="Email"
            value={user.email || "Not provided"}
            onEdit={() => handleEditProfileField("email", "Email", user.email || "")}
            showDivider
          />
          <ProfileInfoRow
            icon={
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            }
            label="Phone Number"
            value={user.phone || "Not provided"}
            onEdit={() => handleEditProfileField("phone", "Phone Number", user.phone || "")}
            showDivider={false}
          />
        </div>

        {/* Wallet Balance Card */}
        <div className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-[#FFF5ED] via-white to-[#FFE8D4]/50 p-4 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm shadow-primary/30">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                    Wallet Balance
                  </span>
                  {wallet?.status && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        wallet.status === "blocked"
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          wallet.status === "blocked" ? "bg-red-500" : "bg-emerald-500"
                        }`}
                      />
                      {wallet.status === "blocked" ? "Blocked" : "Active"}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-text-primary">
                    {walletLoading ? "..." : (wallet?.pointsBalance ?? 0).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-primary">Points</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowWalletModal(true);
                loadWalletTransactions();
              }}
              className="flex items-center gap-1 rounded-xl border border-primary/25 bg-white px-3 py-2 text-xs font-bold text-primary shadow-xs transition hover:bg-primary hover:text-white"
            >
              History
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-2 border-t border-primary/10 pt-3">
            <div className="flex items-center gap-2 rounded-xl border border-border-light/60 bg-white/80 px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-text-secondary">Total Earned</p>
                <p className="truncate text-xs font-bold text-emerald-600">
                  +{wallet?.stats?.totalEarned?.toLocaleString() ?? 0} pts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-border-light/60 bg-white/80 px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-text-secondary">Total Redeemed</p>
                <p className="truncate text-xs font-bold text-amber-700">
                  {wallet?.stats?.totalRedeemed?.toLocaleString() ?? 0} pts
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Refer & Earn Card */}
        <div className="overflow-hidden rounded-2xl border border-primary/20 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFE8D4] text-primary">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">Refer & Earn</h3>
                <p className="text-xs text-text-secondary">
                  Invite friends to earn {wallet?.rewardsConfig?.referralRewardReferrer ?? 50} bonus points!
                </p>
              </div>
            </div>

            {wallet?.referral?.referredUsersCount > 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                {wallet.referral.referredUsersCount} invited
              </span>
            )}
          </div>

          {/* Referral Code Box */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-dashed border-primary/40 bg-[#FFF5ED] px-3.5 py-2.5">
            <div>
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                Your Referral Code
              </p>
              <p className="font-mono text-base font-extrabold tracking-widest text-primary">
                {wallet?.referral?.code || "..."}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => handleCopyCode(wallet?.referral?.code)}
                className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-primary shadow-xs border border-primary/20 hover:bg-primary hover:text-white transition"
              >
                {copiedCode ? "Copied! ✓" : "Copy Code"}
              </button>
              <button
                type="button"
                onClick={() => handleShareLink(wallet?.referral?.link, wallet?.referral?.code)}
                className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:brightness-110 transition"
              >
                {copiedLink ? "Link Copied! ✓" : "Share Link"}
              </button>
            </div>
          </div>

          {/* Transaction Reward Notice Banner */}
          {wallet?.rewardsConfig?.orderRewardEnabled && (
            <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-amber-50/70 border border-amber-200/60 px-3 py-2 text-xs text-amber-900">
              <span className="text-base">🎁</span>
              <span>
                Earn <strong>+{wallet.rewardsConfig.orderRewardPoints} reward points</strong> on every order above <strong>₹{wallet.rewardsConfig.orderRewardThreshold}</strong>!
              </span>
            </div>
          )}

          {/* Claim referral input (if user hasn't claimed a referral yet) */}
          {!wallet?.referral?.referredBy && (
            <form onSubmit={handleClaimReferral} className="mt-3 border-t border-border-light/60 pt-3">
              <p className="text-xs font-semibold text-text-primary">Have a friend's referral code?</p>
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  placeholder="Enter referral code"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  className="flex-1 rounded-xl border border-border-light px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-text-primary focus:border-primary focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={claimingReferral || !referralInput.trim()}
                  className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-xs disabled:opacity-50 hover:brightness-110 transition"
                >
                  {claimingReferral ? "Claiming..." : "Claim Bonus"}
                </button>
              </div>
              {referralMsg.error && (
                <p className="mt-1.5 text-[11px] text-red-600">{referralMsg.error}</p>
              )}
              {referralMsg.success && (
                <p className="mt-1.5 text-[11px] text-emerald-600 font-medium">{referralMsg.success}</p>
              )}
            </form>
          )}
        </div>

        <div className="flex rounded-2xl border border-primary/10 bg-[#FFF5ED] px-2 py-4">
          <QuickLink
            label="Addresses"
            onClick={scrollToAddresses}
            icon={
              <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          <QuickLink
            label="Orders"
            to="/orders"
            icon={
              <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
          />
          <QuickLink
            label="Wallet"
            onClick={() => {
              setShowWalletModal(true);
              loadWalletTransactions();
            }}
            icon={
              <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            }
          />
          <QuickLink
            label="Wishlist"
            to="/wishlist"
            icon={
              <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            }
          />
          <QuickLink
            label="Setting"
            onClick={() => setShowSettings(true)}
            icon={
              <svg className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
        </div>

        {(recentLoading || recentItems.length > 0) && (
          <section>
            <h2 className="text-base font-bold text-text-primary">Buy Again</h2>
            <p className="mt-0.5 text-sm text-text-secondary">Items from your recent orders</p>
            <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recentLoading
                ? [1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-[210px] w-[140px] shrink-0 animate-pulse rounded-2xl bg-mobile-surface"
                    />
                  ))
                : recentItems.map((item) => (
                    <BuyAgainCard
                      key={`${item.productId}-${item.variantName || "default"}-${item.colorName || "default"}`}
                      item={item}
                    />
                  ))}
            </div>
          </section>
        )}

        <section ref={addressesRef}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-text-primary">Saved Addresses</h2>
            {!showAddressForm && (
              <button
                type="button"
                onClick={() => {
                  setEditingAddress(null);
                  setShowAddressForm(true);
                  setFormError("");
                }}
                className="text-sm font-semibold text-primary"
              >
                + Add Address
              </button>
            )}
          </div>

          {formError && !showAddressForm && (
            <p className="mb-3 text-sm text-red-600">{formError}</p>
          )}

          {showAddressForm ? (
            <>
              {formError && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
              )}
              <AddressForm
                plain
                initial={
                  editingAddress
                    ? mapAddressToForm(editingAddress)
                    : {
                        ...ADDRESS_FORM_FIELDS,
                        fullName: user.name || "",
                        number: user.phone || "",
                        email: user.email || "",
                      }
                }
                onSubmit={handleSaveAddress}
                onCancel={cancelAddressForm}
                submitting={savingAddress}
              />
            </>
          ) : loading ? (
            <div className="h-52 animate-pulse rounded-2xl border border-border-light bg-white" />
          ) : addresses.length === 0 ? (
            <div className="rounded-2xl border border-border-light bg-white p-5 text-sm text-text-secondary">
              No saved addresses yet.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-border-light bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFE8D4] text-primary">
                    <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-text-primary">{getAddressFullName(currentAddress)}</p>
                      {currentAddress.isDefault && (
                        <span className="rounded-md bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                      {formatAddressLine(currentAddress)}
                    </p>
                    <p className="mt-2 flex items-center gap-1 text-sm text-text-secondary">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      +91 {currentAddress.number}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditAddress(currentAddress)}
                    className="px-2 text-sm font-semibold text-primary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(currentAddress._id)}
                    className="px-2 text-sm font-semibold text-red-600"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {addresses.length > 1 && (
                <div className="mt-3 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={addressIndex === 0}
                    onClick={() => setAddressIndex((i) => Math.max(0, i - 1))}
                    className="rounded-full border border-border-light px-3 py-1 text-xs disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <div className="flex gap-1.5">
                    {addresses.map((addr, index) => (
                      <button
                        key={addr._id}
                        type="button"
                        aria-label={`Address ${index + 1}`}
                        onClick={() => setAddressIndex(index)}
                        className={`h-2 rounded-full transition ${
                          index === addressIndex ? "w-2 bg-primary" : "w-2 bg-border-light"
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={addressIndex >= addresses.length - 1}
                    onClick={() => setAddressIndex((i) => Math.min(addresses.length - 1, i + 1))}
                    className="rounded-full border border-border-light px-3 py-1 text-xs disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {/* Wallet History Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 backdrop-blur-xs sm:items-center sm:p-4">
          <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border-light px-5 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFE8D4] text-primary">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Wallet History</h3>
                  <p className="text-xs text-text-secondary">Points ledger and statements</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWalletModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary hover:bg-mobile-surface"
              >
                ✕
              </button>
            </div>

            {/* Top Balance Summary Banner */}
            <div className="border-b border-primary/10 bg-[#FFF5ED] px-5 py-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-text-secondary">Available Balance</span>
                  <p className="text-xl font-extrabold text-text-primary">
                    {(wallet?.pointsBalance ?? 0).toLocaleString()}{" "}
                    <span className="text-xs font-bold text-primary">Points</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-text-secondary">Earned / Spent</span>
                  <p className="text-xs font-semibold text-text-primary">
                    <span className="text-emerald-600">+{wallet?.stats?.totalEarned ?? 0}</span> /{" "}
                    <span className="text-amber-700">-{wallet?.stats?.totalRedeemed ?? 0}</span>
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="mt-3 flex gap-2">
                {[
                  { id: "all", label: "All" },
                  { id: "credit", label: "Earned (+)" },
                  { id: "debit", label: "Spent (-)" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTransactionFilter(tab.id)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      transactionFilter === tab.id
                        ? "bg-primary text-white shadow-xs"
                        : "border border-border-light bg-white text-text-secondary hover:bg-white/80"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 divide-y divide-border-light overflow-y-auto px-5 py-4">
              {transactionsLoading ? (
                <div className="space-y-3 py-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-xl bg-mobile-surface" />
                  ))}
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFE8D4] text-primary">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="font-semibold text-text-primary">No transactions found</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs text-text-secondary">
                    {transactionFilter === "all"
                      ? "Earn points by placing orders or through cashbacks and rewards!"
                      : `No ${transactionFilter === "credit" ? "earned" : "spent"} transactions found.`}
                  </p>
                </div>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCredit = Number(tx.pointsDelta) > 0;
                  const typeInfo = getTransactionTypeDetails(tx.type);
                  return (
                    <div key={tx._id} className="flex items-start justify-between py-3.5 first:pt-0 last:pb-0">
                      <div className="flex min-w-0 flex-1 items-start gap-3 pr-3">
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isCredit ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                          }`}
                        >
                          {isCredit ? (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                            </svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-text-primary">{typeInfo.label}</span>
                            {tx.status === "reversed" && (
                              <span className="rounded bg-red-100 px-1.5 py-0.2 text-[9px] font-bold text-red-700">
                                REVERSED
                              </span>
                            )}
                          </div>
                          {tx.description && (
                            <p className="mt-0.5 truncate text-xs text-text-secondary">{tx.description}</p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-text-muted">
                            <span>{formatTransactionDate(tx.createdAt)}</span>
                            {tx.referenceId && (
                              <>
                                <span>•</span>
                                <span className="font-mono">Ref: {tx.referenceId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p
                          className={`text-sm font-extrabold ${
                            isCredit ? "text-emerald-600" : "text-amber-700"
                          }`}
                        >
                          {isCredit ? `+${tx.pointsDelta}` : tx.pointsDelta} pts
                        </p>
                        <p className="text-[10px] text-text-secondary">
                          Bal: {tx.balanceAfter ?? 0}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="rounded-b-3xl border-t border-border-light bg-mobile-surface p-4">
              <button
                type="button"
                onClick={() => setShowWalletModal(false)}
                className="w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-white transition hover:brightness-110"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/40 px-4 pb-6 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Account Settings</h3>
              <button type="button" onClick={() => setShowSettings(false)} className="text-text-secondary">
                ✕
              </button>
            </div>
            <Link
              to="/support"
              onClick={() => setShowSettings(false)}
              className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-mobile-surface"
            >
              <span className="font-medium text-text-primary">Help & Support</span>
              <span className="text-text-secondary">›</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setShowSettings(false);
                logout();
                navigate("/");
              }}
              className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-3 text-left font-medium text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
