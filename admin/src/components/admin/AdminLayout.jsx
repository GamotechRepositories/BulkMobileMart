import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAdminNotifications } from "../../context/AdminNotificationContext";
import { STORE_URL } from "../../constants/brand";
import {
  IconBanner,
  IconBrand,
  IconCalendar,
  IconCategory,
  IconDashboard,
  IconExternalLink,
  IconLogout,
  IconOrder,
  IconPayment,
  IconProduct,
  IconSupport,
  IconTestimonial,
  IconSettings,
  IconUser,
  IconUsers,
} from "./AdminIcons";

const PAGE_TITLES = {
  "/": "Dashboard",
  "/banners": "Hero Banners",
  "/categories/add": "Add Category",
  "/categories/show": "Show Category",
  "/products/add": "Add Product",
  "/products/show": "Show Product",
  "/brands/add": "Add Brand",
  "/brands/show": "Show Brands",
  "/testimonials/add": "Add Testimonial",
  "/testimonials/show": "Testimonials",
  "/settings": "Store Settings",
  "/users": "Users",
  "/orders": "Orders",
  "/payments": "Payments",
  "/support": "Support Messages",
};

const NAV_ITEMS = [
  { type: "link", to: "/", label: "Dashboard", end: true, icon: IconDashboard },
  {
    type: "group",
    label: "Products",
    icon: IconProduct,
    basePath: "/products",
    children: [
      { to: "/products/add", label: "Add Product" },
      { to: "/products/show", label: "Show Product" },
    ],
  },
  { type: "link", to: "/orders", label: "Orders", icon: IconOrder },
  {
    type: "group",
    label: "Categories",
    icon: IconCategory,
    basePath: "/categories",
    children: [
      { to: "/categories/add", label: "Add Category" },
      { to: "/categories/show", label: "Show Category" },
    ],
  },
  {
    type: "group",
    label: "Brands",
    icon: IconBrand,
    basePath: "/brands",
    children: [
      { to: "/brands/add", label: "Add Brand" },
      { to: "/brands/show", label: "Show Brands" },
    ],
  },
  {
    type: "group",
    label: "Testimonials",
    icon: IconTestimonial,
    basePath: "/testimonials",
    children: [
      { to: "/testimonials/add", label: "Add Testimonial" },
      { to: "/testimonials/show", label: "Show Testimonials" },
    ],
  },
  { type: "link", to: "/settings", label: "Store Settings", icon: IconSettings },
  { type: "link", to: "/payments", label: "Payments", icon: IconPayment },
  { type: "link", to: "/support", label: "Support", icon: IconSupport },
  { type: "link", to: "/users", label: "Users", icon: IconUsers },
  { type: "link", to: "/banners", label: "Hero Banners", icon: IconBanner },
];

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-accent text-white"
      : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
  }`;

const subNavLinkClass = ({ isActive }) =>
  `block rounded-lg py-2 pl-11 pr-3 text-sm transition ${
    isActive
      ? "bg-neutral-800 text-accent font-medium"
      : "text-neutral-500 hover:bg-neutral-800 hover:text-white"
  }`;

const INDIA_TZ = "Asia/Kolkata";

function formatTodayDate(short = false) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: short ? undefined : "short",
    day: "numeric",
    month: "short",
    year: short ? undefined : "numeric",
    timeZone: INDIA_TZ,
  }).format(new Date());
}

const toolbarIconWrap =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md shadow-sm ring-1";

function AdminHeaderToolbar({ adminUser, onLogout }) {
  const today = formatTodayDate();
  const todayShort = formatTodayDate(true);
  const adminLabel = adminUser?.name?.split(" ")[0] || "Admin";

  const boxBase =
    "inline-flex h-9 max-w-full items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold transition sm:h-10 sm:gap-2.5 sm:px-3 sm:text-sm";

  return (
    <div className="flex max-w-full flex-wrap items-center justify-end gap-2 sm:gap-2.5">
      <div
        className={`${boxBase} border-neutral-200 bg-neutral-50 text-neutral-700`}
        title={today}
      >
        <span className={`${toolbarIconWrap} bg-white text-accent ring-neutral-200/80`}>
          <IconCalendar className="h-4 w-4" />
        </span>
        <span className="hidden whitespace-nowrap sm:inline">{today}</span>
        <span className="whitespace-nowrap sm:hidden">{todayShort}</span>
      </div>

      <a
        href={STORE_URL}
        target="_blank"
        rel="noreferrer"
        className={`${boxBase} border-accent/30 bg-accent/5 text-accent hover:border-accent/50 hover:bg-accent/10`}
      >
        <span className={`${toolbarIconWrap} bg-accent/10 text-accent ring-accent/20`}>
          <IconExternalLink className="h-4 w-4" />
        </span>
        <span className="whitespace-nowrap">Visit Site</span>
      </a>

      {adminUser ? (
        <>
          <span
            className={`${boxBase} max-w-[9.5rem] border-neutral-200 bg-white text-neutral-700 sm:max-w-[11rem]`}
            title={adminUser.email || adminLabel}
          >
            <span className={`${toolbarIconWrap} bg-neutral-100 text-neutral-600 ring-neutral-200/80`}>
              <IconUser className="h-4 w-4" />
            </span>
            <span className="truncate">{adminLabel}</span>
          </span>
          <button
            type="button"
            onClick={onLogout}
            className={`${boxBase} border-red-200 bg-red-50 text-red-600 hover:border-red-300 hover:bg-red-100`}
          >
            <span className={`${toolbarIconWrap} bg-red-100 text-red-600 ring-red-200/80`}>
              <IconLogout className="h-4 w-4" />
            </span>
            <span className="whitespace-nowrap">Logout</span>
          </button>
        </>
      ) : (
        <span className={`${boxBase} border-neutral-200 bg-white text-neutral-700`}>
          <span className={`${toolbarIconWrap} bg-neutral-100 text-neutral-600 ring-neutral-200/80`}>
            <IconUser className="h-4 w-4" />
          </span>
          <span className="whitespace-nowrap">Admin</span>
        </span>
      )}
    </div>
  );
}

function NavIconWithBadge({ showBadge, children }) {
  return (
    <span className="relative shrink-0">
      {children}
      {showBadge ? (
        <span
          className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-1 ring-neutral-950"
          aria-hidden="true"
        />
      ) : null}
    </span>
  );
}

function NavGroup({
  item,
  location,
  onNavigate,
  collapsed,
  onExpand,
  openGroupKey,
  setOpenGroupKey,
}) {
  const isGroupActive = location.pathname.startsWith(item.basePath);
  const open = openGroupKey === item.basePath;
  const Icon = item.icon;

  useEffect(() => {
    if (isGroupActive) setOpenGroupKey(item.basePath);
  }, [isGroupActive, item.basePath, setOpenGroupKey]);

  const handleToggle = () => {
    if (collapsed) {
      onExpand?.();
      setOpenGroupKey(item.basePath);
      return;
    }
    setOpenGroupKey((prev) => (prev === item.basePath ? "" : item.basePath));
  };

  if (collapsed) {
    return (
      <button
        type="button"
        title={item.label}
        onClick={handleToggle}
        className={`flex w-full items-center justify-center rounded-lg p-2.5 transition ${
          isGroupActive
            ? "bg-accent text-white"
            : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" />
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isGroupActive
            ? "bg-neutral-800 text-white"
            : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
        }`}
      >
        <span className="flex items-center gap-3">
          <Icon className="w-5 h-5 shrink-0" />
          {item.label}
        </span>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-1 space-y-0.5">
          {item.children.map((child) => (
            <NavLink
              key={child.to}
              to={child.to}
              onClick={onNavigate}
              className={subNavLinkClass}
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarContent({
  location,
  onNavigate,
  collapsed,
  onCollapse,
  onExpand,
  hasUnreadSupport,
  hasUnreadOrders,
  hasUnreadPayments,
}) {
  const [openGroupKey, setOpenGroupKey] = useState("");

  return (
    <>
      <div className={`mb-6 ${collapsed ? "flex justify-center px-1" : "px-1"}`}>
        {collapsed ? (
          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand sidebar"
            title="Bulk Mobile Mart"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-xl font-bold text-primary transition hover:bg-neutral-800"
          >
            B
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1 truncate text-lg font-bold tracking-tight text-white">
              Bulk Mobile Mart
            </div>
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-800 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          if (item.type === "group") {
            return (
              <NavGroup
                key={item.label}
                item={item}
                location={location}
                onNavigate={onNavigate}
                collapsed={collapsed}
                onExpand={onExpand}
                openGroupKey={openGroupKey}
                setOpenGroupKey={setOpenGroupKey}
              />
            );
          }

          const Icon = item.icon;
          const showSupportBadge = item.to === "/support" && hasUnreadSupport;
          const showOrdersBadge = item.to === "/orders" && hasUnreadOrders;
          const showPaymentsBadge = item.to === "/payments" && hasUnreadPayments;
          const showBadge = showSupportBadge || showOrdersBadge || showPaymentsBadge;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              onClick={onNavigate}
              className={({ isActive }) =>
                collapsed
                  ? `flex items-center justify-center rounded-lg p-2.5 transition ${
                      isActive
                        ? "bg-accent text-white"
                        : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    }`
                  : navLinkClass({ isActive })
              }
            >
              <NavIconWithBadge showBadge={showBadge}>
                <Icon className="w-5 h-5 shrink-0" />
              </NavIconWithBadge>
              {!collapsed && item.label}
            </NavLink>
          );
        })}
      </nav>
    </>
  );
}

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminUser, adminLogout } = useAuth();
  const {
    hasUnreadSupport,
    hasUnreadOrders,
    hasUnreadPayments,
    markSupportAsSeen,
    markOrdersAsSeen,
    markPaymentsAsSeen,
  } = useAdminNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const pageTitle = /^\/orders\/[^/]+$/.test(location.pathname)
    ? "Order Details"
    : PAGE_TITLES[location.pathname] || "Dashboard";

  const isDashboard = location.pathname === "/" || location.pathname === "";
  const isSupportPage = location.pathname === "/support";
  const isOrdersPage = location.pathname === "/orders" || /^\/orders\/[^/]+$/.test(location.pathname);
  const isPaymentsPage = location.pathname === "/payments";

  useEffect(() => {
    if (isSupportPage) {
      markSupportAsSeen();
    }
  }, [isSupportPage, markSupportAsSeen]);

  useEffect(() => {
    if (isOrdersPage) {
      markOrdersAsSeen();
    }
  }, [isOrdersPage, markOrdersAsSeen]);

  useEffect(() => {
    if (isPaymentsPage) {
      markPaymentsAsSeen();
    }
  }, [isPaymentsPage, markPaymentsAsSeen]);

  const handleLogout = () => {
    adminLogout();
    navigate("/login");
  };

  const expandSidebar = () => setSidebarCollapsed(false);
  const collapseSidebar = () => setSidebarCollapsed(true);

  return (
    <div className="min-h-screen bg-neutral-100">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-neutral-800 bg-neutral-950 px-4 py-6 transition-all duration-300 lg:translate-x-0 ${
          sidebarCollapsed ? "lg:w-[72px] lg:px-2" : ""
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent
          location={location}
          onNavigate={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed && !sidebarOpen}
          onCollapse={collapseSidebar}
          onExpand={expandSidebar}
          hasUnreadSupport={hasUnreadSupport && !isSupportPage}
          hasUnreadOrders={hasUnreadOrders && !isOrdersPage}
          hasUnreadPayments={hasUnreadPayments && !isPaymentsPage}
        />
      </aside>

      <div
        className={`min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
        }`}
      >
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-700 transition hover:bg-neutral-50 lg:hidden"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="truncate text-base font-bold text-neutral-900 sm:text-xl">
              {pageTitle}
            </h1>
          </div>

          <div className="flex min-w-0 max-w-[min(100%,42rem)] shrink items-center justify-end">
            {isDashboard ? (
              <AdminHeaderToolbar adminUser={adminUser} onLogout={handleLogout} />
            ) : null}
          </div>
        </header>

        <main className="min-w-0 overflow-x-hidden p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
