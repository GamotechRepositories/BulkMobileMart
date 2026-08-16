import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  saveFcmToken,
} from "../api/api";
import { requestAndGetFcmToken, setupForegroundMessaging } from "../config/firebase";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeToast, setActiveToast] = useState(null);
  const [pushRegistered, setPushRegistered] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await getUnreadNotificationCount();
      if (res.data?.success) {
        setUnreadCount(res.data.data?.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch unread notification count —", err);
    }
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setLoading(true);
    try {
      const res = await getNotifications({ limit: 30 });
      if (res.data?.success) {
        setNotifications(res.data.data?.items || res.data.data || []);
        fetchUnreadCount();
      }
    } catch (err) {
      console.error("Failed to fetch notifications —", err);
    } finally {
      setLoading(false);
    }
  }, [user, fetchUnreadCount]);

  const registerPushNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const token = await requestAndGetFcmToken();
      if (token) {
        await saveFcmToken(token, "web");
        setPushRegistered(true);
        console.log("FCM: Registered web push token with backend successfully.");
      }
    } catch (err) {
      console.error("FCM: Failed to register push token with backend —", err);
    }
  }, [user]);

  // Handle user login / logout & register push
  useEffect(() => {
    if (user) {
      loadNotifications();
      registerPushNotifications();
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setPushRegistered(false);
    }
  }, [user, loadNotifications, registerPushNotifications]);

  // Handle foreground push messages
  useEffect(() => {
    let unsubscribe = () => {};
    if (user) {
      setupForegroundMessaging((payload) => {
        const title = payload.notification?.title || payload.data?.title || "Notification";
        const body = payload.notification?.body || payload.data?.body || "";
        const data = payload.data || {};

        setActiveToast({ title, body, data, id: Date.now() });
        loadNotifications();
      }).then((unsub) => {
        if (unsub) unsubscribe = unsub;
      });
    }

    return () => {
      unsubscribe();
    };
  }, [user, loadNotifications]);

  // Auto dismiss toast after 5 seconds
  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [activeToast]);

  const markAsRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification read —", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications read —", err);
    }
  };

  const deleteNotif = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id && n.id !== id));
      fetchUnreadCount();
    } catch (err) {
      console.error("Failed to delete notification —", err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        activeToast,
        pushRegistered,
        dismissToast: () => setActiveToast(null),
        loadNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotif,
        registerPushNotifications,
      }}
    >
      {children}

      {/* Foreground Notification Toast Alert */}
      {activeToast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-xl shadow-2xl border border-gray-100 p-4 transition-all duration-300 transform translate-y-0 animate-bounce-once">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0 text-accent font-semibold text-lg">
              🔔
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-gray-900 truncate">
                {activeToast.title}
              </h4>
              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                {activeToast.body}
              </p>
            </div>
            <button
              onClick={() => setActiveToast(null)}
              className="text-gray-400 hover:text-gray-600 text-sm font-semibold p-1"
              aria-label="Close toast"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
