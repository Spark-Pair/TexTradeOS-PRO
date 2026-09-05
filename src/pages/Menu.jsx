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
      return `${item.label} ${meta.description}`.toLowerCase().includes(term);
    });
  }, [modules, query]);

  return (
    <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col">
      <PageHeader title="Menu" subtitle="Find a module or jump straight to an action." />

      <div className="mb-6 rounded-3xl border border-gray-300 bg-white p-4">
        <ModuleSearch value={query} onChange={setQuery} inputRef={searchRef} />
      </div>

      <div className="rounded-3xl border border-gray-300 bg-white p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-800">{query ? "Search Results" : "All Modules"}</h2>
          <p className="mt-0.5 text-xs text-gray-400">{filteredModules.length} available actions</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredModules.map((module) => (
            <ModuleActionCard key={module.key} module={module} onClick={() => navigate(module.path)} />
          ))}
        </div>
        {!filteredModules.length && <div className="py-14 text-center text-sm text-gray-400">No matching module found.</div>}
      </div>
    </div>
  );
}
