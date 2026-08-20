export const ADMIN_TAB_KEYS = [
  "dashboard",
  "products",
  "orders-create",
  "orders",
  "categories",
  "brands",
  "testimonials",
  "settings",
  "payments",
  "revenue",
  "coupons",
  "promotional",
  "support",
  "users",
  "banners",
  "offer-banners",
];

export const SUPER_ONLY_ADMIN_TAB_KEYS = ["admin-users"];

const ASSIGNABLE_TAB_KEYS = new Set(ADMIN_TAB_KEYS);

export function isSuperAdmin(user) {
  return user?.role === "admin" && user?.adminType !== "limited";
}

export function normalizeAdminType(user) {
  if (user?.role !== "admin") return null;
  return user.adminType === "limited" ? "limited" : "super";
}

export function sanitizeAdminTabs(tabs = []) {
  const unique = [];
  for (const tab of tabs) {
    const key = String(tab || "").trim();
    if (!ASSIGNABLE_TAB_KEYS.has(key) || unique.includes(key)) continue;
    unique.push(key);
  }
  return unique;
}

export function canAccessAdminTab(user, tabKey) {
  if (user?.role !== "admin") return false;
  if (tabKey === "profile") return true;
  if (isSuperAdmin(user)) return true;
  return sanitizeAdminTabs(user.adminTabs).includes(tabKey);
}

export function validateLimitedAdminTabs(adminTabs) {
  const tabs = sanitizeAdminTabs(adminTabs);
  if (!tabs.length) {
    return { ok: false, message: "Select at least one sidebar tab for limited admin access" };
  }
  return { ok: true, tabs };
}

export function formatAdminPermissions(user) {
  if (user?.role !== "admin") {
    return { adminType: null, adminTabs: [] };
  }

  const adminType = normalizeAdminType(user);
  return {
    adminType,
    adminTabs: adminType === "limited" ? sanitizeAdminTabs(user.adminTabs) : [],
  };
}
