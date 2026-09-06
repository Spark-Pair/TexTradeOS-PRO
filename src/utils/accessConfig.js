const normalizeText = (value) => String(value || "").trim();
const uniqueList = (value = []) => { const seen = new Set(); return (Array.isArray(value) ? value : []).map(normalizeText).filter(Boolean).filter((item) => { const key = item.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; }); };
export const DEFAULT_BUSINESS_USER_ROLES = ["admin", "staff"];
export const normalizeBusinessUserRoles = (value = []) => uniqueList(value);

// UI registry only. Permission decisions must come from backend-provided rule data.
export const BUSINESS_ACCESS_ITEMS = [
  { key: "dashboard", label: "Dashboard", path: "/dashboard", show_in_sidebar: true },
  { key: "users_manage", label: "Users", path: "/users", show_in_sidebar: true },
  { key: "customers", label: "Customers", path: "/customers", show_in_sidebar: true },
  { key: "suppliers", label: "Suppliers", path: "/suppliers", show_in_sidebar: true },
  { key: "purchases", label: "Purchases", path: "/purchases", show_in_sidebar: true },
  { key: "inventory", label: "Inventory", path: "/inventory", show_in_sidebar: true },
  { key: "invoices", label: "Invoices", path: "/invoices", show_in_sidebar: true },
  { key: "sales_returns", label: "Sales Returns", path: "/sales-returns", show_in_sidebar: true },
  { key: "purchase_returns", label: "Purchase Returns", path: "/purchase-returns", show_in_sidebar: true },
  { key: "settings", label: "Settings", path: "/settings", show_in_sidebar: false },
  { key: "options", label: "Options & Configuration", path: "/options", show_in_sidebar: false },
  { key: "keyboard_shortcuts", label: "Keyboard Shortcuts", path: "/keyboard-shortcuts", show_in_sidebar: false },
];
export const BUSINESS_ACCESS_ITEMS_MAP = new Map(BUSINESS_ACCESS_ITEMS.map((item) => [item.key, item]));

// Settings may normalize rules already returned by the backend, but missing rules are never synthesized.
export const normalizeAccessRules = (value = [], roles = []) => {
  const safeRoles = new Set(normalizeBusinessUserRoles(roles));
  if (!Array.isArray(value)) return [];
  return value.map((rule) => ({
    key: normalizeText(rule?.key),
    label: normalizeText(rule?.label),
    roles: uniqueList(rule?.roles || []).filter((role) => safeRoles.has(role)),
    show_in_sidebar: rule?.show_in_sidebar !== false,
  })).filter((rule) => rule.key && BUSINESS_ACCESS_ITEMS_MAP.has(rule.key));
};

export const getAccessRule = (ruleData = {}, referenceData = {}, key = "") => {
  const normalizedKey = normalizeText(key);
  if (!normalizedKey || !Array.isArray(ruleData?.access_rules) || !Array.isArray(referenceData?.user_roles)) return null;
  return normalizeAccessRules(ruleData.access_rules, referenceData.user_roles).find((rule) => rule.key === normalizedKey) || null;
};
export const hasAccessForRole = (ruleData = {}, referenceData = {}, key = "", role = "") => {
  const normalizedRole = normalizeText(role);
  if (!normalizedRole || normalizedRole === "developer") return false;
  const rule = getAccessRule(ruleData, referenceData, key);
  return Boolean(rule && rule.roles.includes(normalizedRole));
};
