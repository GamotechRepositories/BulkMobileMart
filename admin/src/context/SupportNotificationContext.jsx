import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getAdminSupportUnreadCount } from "../api/api";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "bmm_admin_support_last_seen";
const POLL_INTERVAL_MS = 30000;

const SupportNotificationContext = createContext(null);

function readLastSeenAt() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function SupportNotificationProvider({ children }) {
  const { adminUser } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (adminUser?.role !== "admin") {
      setHasUnread(false);
      setUnreadCount(0);
      return;
    }

    try {
      const since = readLastSeenAt();
      const params = since ? { since } : {};
      const { data } = await getAdminSupportUnreadCount(params);
      const count = data.data?.count || 0;
      setUnreadCount(count);
      setHasUnread(count > 0);
    } catch {
      // Ignore polling errors so the sidebar keeps working offline.
    }
  }, [adminUser]);

  const markSupportAsSeen = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setHasUnread(false);
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (adminUser?.role !== "admin") return undefined;

    refreshUnread();
    const intervalId = setInterval(refreshUnread, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [adminUser, refreshUnread]);

  return (
    <SupportNotificationContext.Provider
      value={{ hasUnread, unreadCount, markSupportAsSeen, refreshUnread }}
    >
      {children}
    </SupportNotificationContext.Provider>
  );
}

export function useSupportNotification() {
  const context = useContext(SupportNotificationContext);
  if (!context) {
    throw new Error("useSupportNotification must be used within SupportNotificationProvider");
  }
  return context;
}
