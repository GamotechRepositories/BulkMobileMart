export const ADMIN_TAB_OPTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "orders-create", label: "Create Order" },
  { key: "orders", label: "Orders" },
  { key: "categories", label: "Categories" },
  { key: "brands", label: "Brands" },
  { key: "testimonials", label: "Testimonials" },
  { key: "settings", label: "Store Settings" },
  { key: "payments", label: "Payments" },
  { key: "revenue", label: "Revenue" },
  { key: "coupons", label: "Coupons" },
  { key: "promotional", label: "Promotional" },
  { key: "support", label: "Support" },
  { key: "users", label: "Users" },
  { key: "banners", label: "Hero Banners" },
  { key: "offer-banners", label: "Offer Banners" },
];

export const TAB_KEY_TO_DEFAULT_PATH = {
  dashboard: "/",
  products: "/products/show",
  "orders-create": "/orders/create",
  orders: "/orders",
  categories: "/categories/show",
  brands: "/brands/show",
  testimonials: "/testimonials/show",
  settings: "/settings",
  payments: "/payments",
  revenue: "/revenue",
  coupons: "/coupons/show",
  promotional: "/promotional-notifications",
  support: "/support",
  users: "/users",
  banners: "/banners",
  "offer-banners": "/offer-banners",
  "admin-users": "/admin-users",
};

export function isSuperAdmin(user) {
  return user?.role === "admin" && user?.adminType !== "limited";
}

export function canAccessAdminTab(user, tabKey) {
  if (user?.role !== "admin") return false;
  if (tabKey === "profile") return true;
  if (isSuperAdmin(user)) return true;
  return Array.isArray(user.adminTabs) && user.adminTabs.includes(tabKey);
}

export function getTabKeyForPath(pathname) {
  if (!pathname || pathname === "/") return "dashboard";
  if (pathname.startsWith("/admin-users")) return "admin-users";
  if (pathname.startsWith("/products")) return "products";
  if (pathname === "/orders/create") return "orders-create";
  if (pathname.startsWith("/orders")) return "orders";
  if (pathname.startsWith("/categories")) return "categories";
  if (pathname.startsWith("/brands")) return "brands";
  if (pathname.startsWith("/testimonials")) return "testimonials";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/payments")) return "payments";
  if (pathname.startsWith("/revenue") || pathname.startsWith("/payment-proofs")) {
    return "revenue";
  }
  if (pathname.startsWith("/coupons")) return "coupons";
  if (pathname.startsWith("/promotional-notifications")) return "promotional";
  if (pathname.startsWith("/support")) return "support";
  if (pathname.startsWith("/users")) return "users";
  if (pathname.startsWith("/banners")) return "banners";
  if (pathname.startsWith("/offer-banners")) return "offer-banners";
  if (pathname.startsWith("/profile")) return "profile";
  return null;
}

export function getFirstAllowedPath(user) {
  if (isSuperAdmin(user)) return "/";

  for (const option of ADMIN_TAB_OPTIONS) {
    if (canAccessAdminTab(user, option.key)) {
      return TAB_KEY_TO_DEFAULT_PATH[option.key] || "/";
    }
  }

  return "/profile";
}

export function filterNavItemsForUser(items, user) {
  if (isSuperAdmin(user)) return items;

  return items
    .map((item) => {
      if (item.type === "group") {
        if (!item.tabKey || !canAccessAdminTab(user, item.tabKey)) return null;
        return item;
      }

      if (!item.tabKey || !canAccessAdminTab(user, item.tabKey)) return null;
      return item;
    })
    .filter(Boolean);
}

export function getAdminTabLabels(tabKeys = []) {
  const labelByKey = Object.fromEntries(
    ADMIN_TAB_OPTIONS.map((option) => [option.key, option.label])
  );
  return tabKeys.map((key) => labelByKey[key] || key);
}
