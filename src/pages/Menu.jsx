import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import ModuleActionCard from "../components/menu/ModuleActionCard";
import ModuleSearch from "../components/menu/ModuleSearch";
import useAuth from "../hooks/useAuth";
import { BUSINESS_ACCESS_ITEMS } from "../utils/accessConfig";
import useAccessControl from "../hooks/useAccessControl";
import { getModuleMeta } from "../config/modules";

const DEVELOPER_MODULES = new Set(["dashboard", "users_manage", "settings", "keyboard_shortcuts"]);
const PRIMARY_MODULES = new Set(["invoices", "purchases"]);

const HUB_SECTIONS = [
  { key: "daily", title: "Daily Operations", modules: ["invoices", "purchases", "sales_returns", "purchase_returns"] },
  { key: "inventory", title: "Inventory & Parties", modules: ["inventory", "customers", "suppliers"] },
  { key: "management", title: "Management", modules: ["dashboard"] },
  { key: "system", title: "System", modules: ["users_manage", "settings", "keyboard_shortcuts"] },
];

const SEARCH_KEYWORDS = {
  invoices: "sale sales invoice billing bill new sale create invoice print",
  purchases: "purchase buying stock intake supplier entry",
  sales_returns: "sale sales return customer refund adjustment",
  purchase_returns: "purchase return supplier allowance adjustment",
  inventory: "inventory stock article articles barcode qr label labels",
  customers: "customer customers party parties account",
  suppliers: "supplier suppliers party parties account",
  dashboard: "dashboard overview summary performance numbers",
  users_manage: "users team staff roles permissions access",
  settings: "settings configuration preferences access rules",
  keyboard_shortcuts: "keyboard shortcuts hotkeys keys productivity",
};

export default function Menu() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const searchRef = useRef(null);
  const [query, setQuery] = useState("");
  const { accessibleModules } = useAccessControl(user);

  useEffect(() => {
    const focusSearch = () => requestAnimationFrame(() => searchRef.current?.focus());
    window.addEventListener("textrade:focus-global-search", focusSearch);
    if (location.state?.focusGlobalSearch) {
      focusSearch();
      navigate(location.pathname, { replace: true, state: {} });
    }
    return () => window.removeEventListener("textrade:focus-global-search", focusSearch);
  }, [location.pathname, location.state, navigate]);

  const modules = useMemo(() => (
    user?.role === "developer"
      ? BUSINESS_ACCESS_ITEMS.filter((item) => DEVELOPER_MODULES.has(item.key))
      : accessibleModules
  ), [accessibleModules, user?.role]);

  const filteredModules = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return modules;
    return modules.filter((item) => {
      const meta = getModuleMeta(item.key);
      return `${item.label} ${meta.description} ${SEARCH_KEYWORDS[item.key] || ""}`.toLowerCase().includes(term);
    });
  }, [modules, query]);

  const sections = useMemo(() => {
    const visible = new Map(filteredModules.map((module) => [module.key, module]));
    return HUB_SECTIONS.map((section) => ({
      ...section,
      items: section.modules.map((key) => visible.get(key)).filter(Boolean),
    })).filter((section) => section.items.length);
  }, [filteredModules]);

  return (
    <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col pb-8">
      <PageHeader title="Business Hub" subtitle="Choose an action and get straight to work." />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="min-w-0 flex-1">
          <ModuleSearch value={query} onChange={setQuery} inputRef={searchRef} />
        </div>
        <div className="hidden shrink-0 border-l border-gray-200 pl-4 text-right lg:block">
          <p className="text-xs font-semibold text-gray-700">Quick access</p>
          <p className="text-[11px] text-gray-400">{modules.length} actions available</p>
        </div>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-5 lg:p-6">
        <div className="space-y-7">
          {sections.map((section) => (
            <section key={section.key} aria-labelledby={`hub-${section.key}`}>
              <div className="mb-3 flex items-center gap-3">
                <h2 id={`hub-${section.key}`} className="shrink-0 text-xs font-semibold uppercase tracking-[0.13em] text-gray-500">{section.title}</h2>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              <div className="grid auto-rows-[148px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {section.items.map((module) => (
                  <ModuleActionCard
                    key={module.key}
                    module={module}
                    prominent={PRIMARY_MODULES.has(module.key)}
                    onClick={() => navigate(module.path)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        {!filteredModules.length && (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-gray-700">No matching action found</p>
            <p className="mt-1 text-xs text-gray-400">Try sale, purchase, stock, customer, supplier or users.</p>
          </div>
        )}
      </div>
    </div>
  );
}
