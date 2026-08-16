import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

export function NotificationDropdown({ user, onLoginClick }) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotif,
    registerPushNotifications,
    pushRegistered,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleBellClick = () => {
    if (!user) {
      if (onLoginClick) onLoginClick();
      return;
    }
    setIsOpen((prev) => !prev);
  };

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      markAsRead(item._id || item.id);
    }
    setIsOpen(false);

    const orderId = item.order?._id || item.order || item.data?.orderId;
    if (orderId) {
      navigate(`/orders/${orderId}`);
    } else if (item.data?.trackUrl) {
      window.open(item.data.trackUrl, "_blank");
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleBellClick}
        className="relative flex flex-col items-center justify-center gap-1 px-3 lg:px-4 text-gray-700 hover:text-accent transition focus:outline-none"
        aria-label="Notifications"
      >
        <span className="relative inline-flex">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.6}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          {user && unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] px-0.5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white leading-none shadow-sm animate-pulse">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>
        <span className="text-[10px] font-medium hidden sm:inline">Notifications</span>
      </button>

      {isOpen && user && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden transform origin-top-right transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="bg-accent/10 text-accent text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-[11px] font-medium text-accent hover:underline focus:outline-none"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Enable Push Prompt banner if not registered */}
          {typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission !== "granted" &&
            !pushRegistered && (
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-amber-800 font-medium">
                  Enable push alerts for order updates
                </span>
                <button
                  type="button"
                  onClick={registerPushNotifications}
                  className="bg-amber-600 text-white text-[10px] font-bold px-2.5 py-1 rounded hover:bg-amber-700 transition"
                >
                  Enable
                </button>
              </div>
            )}

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-gray-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <div className="w-10 h-10 mx-auto mb-2 text-gray-300 flex items-center justify-center rounded-full bg-gray-50">
                  🔔
                </div>
                <p className="text-xs font-semibold text-gray-700">No notifications yet</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  You will receive order status, shipping, and payment updates here.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const isUnread = !item.isRead;
                return (
                  <div
                    key={item._id || item.id}
                    className={`p-3.5 flex items-start gap-3 hover:bg-gray-50/80 transition cursor-pointer group ${
                      isUnread ? "bg-blue-50/30" : ""
                    }`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    <div className="shrink-0 mt-0.5">
                      <span
                        className={`w-2 h-2 rounded-full inline-block ${
                          isUnread ? "bg-accent" : "bg-transparent"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4
                          className={`text-xs ${
                            isUnread ? "font-bold text-gray-900" : "font-medium text-gray-700"
                          } truncate`}
                        >
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotif(item._id || item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 text-xs transition shrink-0"
                      title="Delete notification"
                    >
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer link to Orders if logged in */}
          <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
            <Link
              to="/orders"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-accent hover:underline block"
            >
              View My Orders →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationDropdown;
