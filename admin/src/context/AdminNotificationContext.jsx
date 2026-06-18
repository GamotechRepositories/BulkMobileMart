import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getAdminOrderUnreadCount,
  getAdminPaymentUnreadCount,
  getAdminSupportUnreadCount,
} from "../api/api";
import { useAuth } from "./AuthContext";

const STORAGE_KEYS = {
  support: "bmm_admin_support_last_seen",
  orders: "bmm_admin_orders_last_seen",
  payments: "bmm_admin_payments_last_seen",
};
const POLL_INTERVAL_MS = 30000;

const AdminNotificationContext = createContext(null);

function readLastSeenAt(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function writeLastSeenAt(key) {
  localStorage.setItem(key, new Date().toISOString());
}

async function fetchUnreadCount(fetcher, storageKey) {
  const since = readLastSeenAt(storageKey);
  const params = since ? { since } : {};
  const { data } = await fetcher(params);
  return data.data?.count || 0;
}

export function AdminNotificationProvider({ children }) {
  const { adminUser } = useAuth();
  const [hasUnreadSupport, setHasUnreadSupport] = useState(false);
  const [unreadSupportCount, setUnreadSupportCount] = useState(0);
  const [hasUnreadOrders, setHasUnreadOrders] = useState(false);
  const [unreadOrderCount, setUnreadOrderCount] = useState(0);
  const [hasUnreadPayments, setHasUnreadPayments] = useState(false);
  const [unreadPaymentCount, setUnreadPaymentCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (adminUser?.role !== "admin") {
      setHasUnreadSupport(false);
      setUnreadSupportCount(0);
      setHasUnreadOrders(false);
      setUnreadOrderCount(0);
      setHasUnreadPayments(false);
      setUnreadPaymentCount(0);
      return;
    }

    try {
      const [supportCount, orderCount, paymentCount] = await Promise.all([
        fetchUnreadCount(getAdminSupportUnreadCount, STORAGE_KEYS.support),
        fetchUnreadCount(getAdminOrderUnreadCount, STORAGE_KEYS.orders),
        fetchUnreadCount(getAdminPaymentUnreadCount, STORAGE_KEYS.payments),
      ]);

      setUnreadSupportCount(supportCount);
      setHasUnreadSupport(supportCount > 0);
      setUnreadOrderCount(orderCount);
      setHasUnreadOrders(orderCount > 0);
      setUnreadPaymentCount(paymentCount);
      setHasUnreadPayments(paymentCount > 0);
    } catch {
      // Ignore polling errors so the sidebar keeps working offline.
    }
  }, [adminUser]);

  const markSupportAsSeen = useCallback(() => {
    writeLastSeenAt(STORAGE_KEYS.support);
    setHasUnreadSupport(false);
    setUnreadSupportCount(0);
  }, []);

  const markOrdersAsSeen = useCallback(() => {
    writeLastSeenAt(STORAGE_KEYS.orders);
    setHasUnreadOrders(false);
    setUnreadOrderCount(0);
  }, []);

  const markPaymentsAsSeen = useCallback(() => {
    writeLastSeenAt(STORAGE_KEYS.payments);
    setHasUnreadPayments(false);
    setUnreadPaymentCount(0);
  }, []);

  useEffect(() => {
    if (adminUser?.role !== "admin") return undefined;

    refreshUnread();
    const intervalId = setInterval(refreshUnread, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [adminUser, refreshUnread]);

  return (
    <AdminNotificationContext.Provider
      value={{
        hasUnreadSupport,
        unreadSupportCount,
        hasUnreadOrders,
        unreadOrderCount,
        hasUnreadPayments,
        unreadPaymentCount,
        markSupportAsSeen,
        markOrdersAsSeen,
        markPaymentsAsSeen,
        refreshUnread,
      }}
    >
      {children}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotifications() {
  const context = useContext(AdminNotificationContext);
  if (!context) {
    throw new Error("useAdminNotifications must be used within AdminNotificationProvider");
  }
  return context;
}

export function useSupportNotification() {
  const {
    hasUnreadSupport,
    unreadSupportCount,
    markSupportAsSeen,
    refreshUnread,
  } = useAdminNotifications();

  return {
    hasUnread: hasUnreadSupport,
    unreadCount: unreadSupportCount,
    markSupportAsSeen,
    refreshUnread,
  };
}

// Backward-compatible provider alias.
export const SupportNotificationProvider = AdminNotificationProvider;
