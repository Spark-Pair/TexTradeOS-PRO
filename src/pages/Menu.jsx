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

const HUB_SECTIONS = [
  {
    key: "daily",
    title: "Daily Operations",
    description: "The actions your team uses to keep business moving.",
    modules: ["invoices", "purchases", "sales_returns", "purchase_returns"],
  },
  {
    key: "inventory",
    title: "Inventory & Parties",
    description: "Manage stock and the people you buy from and sell to.",
    modules: ["inventory", "customers", "suppliers"],
  },
  {
    key: "management",
    title: "Management",
    description: "Review performance and stay on top of the business.",
    modules: ["dashboard"],
  },
  {
    key: "system",
    title: "System",
    description: "Manage access, preferences and productivity tools.",
    modules: ["users_manage", "settings", "keyboard_shortcuts"],
  },
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
      const haystack = `${item.label} ${meta.description} ${SEARCH_KEYWORDS[item.key] || ""}`.toLowerCase();
      return haystack.includes(term);
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
      <PageHeader title="Business Hub" subtitle="Everything you need to run today's business, in one place." />

      <div className="mb-7 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100/70 sm:p-5">
        <div className="mb-3 flex items-end justify-between gap-4 px-1">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1C7773]">Quick access</p>
            <p className="mt-1 text-sm text-gray-500">Search by module, action or business task.</p>
          </div>
          <span className="hidden text-xs text-gray-400 sm:block">{modules.length} actions available</span>
        </div>
        <ModuleSearch value={query} onChange={setQuery} inputRef={searchRef} />
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.key} aria-labelledby={`hub-${section.key}`}>
            <div className="mb-3 flex items-end justify-between gap-4 px-1">
              <div>
                <h2 id={`hub-${section.key}`} className="text-base font-semibold text-gray-900">{section.title}</h2>
                <p className="mt-0.5 text-xs text-gray-500">{section.description}</p>
              </div>
              <span className="text-xs text-gray-400">{section.items.length}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {section.items.map((module) => (
                <ModuleActionCard
                  key={module.key}
                  module={module}
                  prominent={module.key === "invoices" || module.key === "purchases"}
                  onClick={() => navigate(module.path)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {!filteredModules.length && (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-gray-700">No matching action found</p>
          <p className="mt-1 text-xs text-gray-400">Try a module name or a task such as sale, barcode, stock or users.</p>
        </div>
      )}
    </div>
  );
}
