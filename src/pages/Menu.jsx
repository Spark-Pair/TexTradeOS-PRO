import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
const ACTIONS_PER_PAGE = 12;

const MODULE_ORDER = [
  "invoices",
  "purchases",
  "sales_returns",
  "purchase_returns",
  "inventory",
  "customers",
  "suppliers",
  "dashboard",
  "users_manage",
  "settings",
  "keyboard_shortcuts",
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
  const [page, setPage] = useState(0);
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

  const modules = useMemo(() => {
    const allowed = user?.role === "developer"
      ? BUSINESS_ACCESS_ITEMS.filter((item) => DEVELOPER_MODULES.has(item.key))
      : accessibleModules;
    const order = new Map(MODULE_ORDER.map((key, index) => [key, index]));
    return [...allowed].sort((a, b) => (order.get(a.key) ?? 999) - (order.get(b.key) ?? 999));
  }, [accessibleModules, user?.role]);

  const filteredModules = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return modules;
    return modules.filter((item) => {
      const meta = getModuleMeta(item.key);
      return `${item.label} ${meta.description} ${SEARCH_KEYWORDS[item.key] || ""}`.toLowerCase().includes(term);
    });
  }, [modules, query]);

  useEffect(() => setPage(0), [query, modules.length]);

  const totalPages = Math.max(1, Math.ceil(filteredModules.length / ACTIONS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const visibleModules = filteredModules.slice(safePage * ACTIONS_PER_PAGE, (safePage + 1) * ACTIONS_PER_PAGE);
  const hasPrevious = safePage > 0;
  const hasNext = safePage < totalPages - 1;

  return (
    <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col pb-8">
      <PageHeader title="Business Hub" subtitle="Choose an action and get straight to work." />

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-3 sm:p-4">
        <ModuleSearch value={query} onChange={setQuery} inputRef={searchRef} />
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-4 sm:p-5 lg:p-6">
        {visibleModules.length ? (
          <div className="grid auto-rows-[148px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {visibleModules.map((module) => (
              <ModuleActionCard
                key={module.key}
                module={module}
                prominent={PRIMARY_MODULES.has(module.key)}
                onClick={() => navigate(module.path)}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-gray-700">No matching action found</p>
            <p className="mt-1 text-xs text-gray-400">Try sale, purchase, stock, customer, supplier or users.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            {hasPrevious && (
              <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 transition hover:border-teal-200 hover:text-[#1C7773] focus:outline-none focus:ring-2 focus:ring-teal-100">
                <ChevronLeft size={15} /> Previous
              </button>
            )}
            <span className="px-1 text-[11px] text-gray-400">{safePage + 1} / {totalPages}</span>
            {hasNext && (
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-[#1C7773] transition hover:border-[#1C7773] hover:bg-teal-100/70 focus:outline-none focus:ring-2 focus:ring-teal-100">
                More <ChevronRight size={15} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
