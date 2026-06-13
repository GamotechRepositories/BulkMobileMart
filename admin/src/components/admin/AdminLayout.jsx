import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { LOGO_URL } from "../../constants/brand";
import {
  IconBanner,
  IconCategory,
  IconDashboard,
  IconOrder,
  IconPayment,
  IconProduct,
  IconSupport,
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
  "/users": "Users",
  "/orders": "Orders",
  "/payments": "Payments",
  "/support": "Support Messages",
};

const NAV_ITEMS = [
  { type: "link", to: "/", label: "Dashboard", end: true, icon: IconDashboard },
  { type: "link", to: "/banners", label: "Hero Banners", icon: IconBanner },
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
    label: "Products",
    icon: IconProduct,
    basePath: "/products",
    children: [
      { to: "/products/add", label: "Add Product" },
      { to: "/products/show", label: "Show Product" },
    ],
  },
  { type: "link", to: "/orders", label: "Orders", icon: IconOrder },
  { type: "link", to: "/payments", label: "Payments", icon: IconPayment },
  { type: "link", to: "/support", label: "Support", icon: IconSupport },
  { type: "link", to: "/users", label: "Users", icon: IconUsers },
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

function NavGroup({ item, location, onNavigate, collapsed, onExpand }) {
  const isGroupActive = location.pathname.startsWith(item.basePath);
  const [open, setOpen] = useState(isGroupActive);
  const Icon = item.icon;

  useEffect(() => {
    if (isGroupActive) setOpen(true);
  }, [isGroupActive]);

  const handleToggle = () => {
    if (collapsed) {
      onExpand?.();
      setOpen(true);
      return;
    }
    setOpen((prev) => !prev);
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
  onLogout,
  user,
  collapsed,
  onCollapse,
  onExpand,
}) {
  return (
    <>
      <div
        className={`mb-6 ${collapsed ? "flex justify-center px-1" : "flex items-center justify-between gap-2 px-1"}`}
      >
        <div className={`relative ${collapsed ? "" : "flex w-full items-center justify-between gap-2"}`}>
          <img
            src={LOGO_URL}
            alt="BulkMobileMart"
            className={`object-contain brightness-0 invert ${
              collapsed ? "h-10 w-10" : "h-14 w-auto"
            }`}
          />
          {!collapsed ? (
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
          ) : (
            <button
              type="button"
              onClick={onExpand}
              aria-label="Expand sidebar"
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded text-[10px] text-neutral-400 transition hover:text-white"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
        </div>
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
              />
            );
          }

          const Icon = item.icon;
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
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && item.label}
            </NavLink>
          );
        })}
      </nav>

      {user && (
        <div className={`mt-6 border-t border-neutral-800 pt-4 ${collapsed ? "space-y-2" : ""}`}>
          {!collapsed && (
            <p className="mb-2 truncate px-3 text-xs text-neutral-500">{user.email}</p>
          )}
          <button
            type="button"
            title="Logout"
            onClick={onLogout}
            className={`flex w-full items-center rounded-lg text-sm font-medium text-red-400 transition hover:bg-neutral-800 hover:text-red-300 ${
              collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
            }`}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            {!collapsed && "Logout"}
          </button>
        </div>
      )}
    </>
  );
}

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { adminUser, adminLogout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const pageTitle = /^\/orders\/[^/]+$/.test(location.pathname)
    ? "Order Details"
    : PAGE_TITLES[location.pathname] || "Dashboard";

  const isDashboard = location.pathname === "/" || location.pathname === "";

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
          onLogout={handleLogout}
          user={adminUser}
          collapsed={sidebarCollapsed && !sidebarOpen}
          onCollapse={collapseSidebar}
          onExpand={expandSidebar}
        />
      </aside>

      <div
        className={`min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64"
        }`}
      >
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-neutral-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-neutral-900 truncate">
              {pageTitle}
            </h1>
          </div>

          {isDashboard && (
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                to="/"
                className="rounded-lg border border-neutral-200 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-700 transition hover:border-accent hover:text-accent"
              >
                ← Back to Site
              </Link>
              {adminUser ? (
                <>
                  <span className="hidden md:inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 max-w-[140px] truncate">
                    <IconUser className="w-4 h-4 shrink-0" />
                    {adminUser.name.split(" ")[0]}
                  </span>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700">
                  <IconUser className="w-4 h-4" />
                  Admin
                </span>
              )}
            </div>
          )}
        </header>

        <main className="min-w-0 overflow-x-hidden p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
