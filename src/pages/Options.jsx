import { SlidersHorizontal } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { getModuleMeta } from "../config/modules";
import { getOptionGroupsByModule } from "../config/optionsRegistry";
import { BUSINESS_ACCESS_ITEMS_MAP } from "../utils/accessConfig";

export default function OptionsPage() {
  const groups = Array.from(getOptionGroupsByModule().entries());
  return <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col">
    <PageHeader title="Options & Configuration" subtitle="Manage reusable field options from one modular registry." />
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8">
      <div className="space-y-4">{groups.map(([moduleKey, options]) => {
        const module = BUSINESS_ACCESS_ITEMS_MAP.get(moduleKey);
        const Icon = getModuleMeta(moduleKey).icon || SlidersHorizontal;
        return <section key={moduleKey} className="overflow-hidden rounded-3xl border border-gray-300 bg-white">
          <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:px-6"><span className="grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-white text-gray-600"><Icon size={17} /></span><div><h2 className="text-sm font-semibold text-gray-800">{module?.label || moduleKey}</h2><p className="text-xs text-gray-400">Configurable option groups registered for this module.</p></div></div>
          <div className="divide-y divide-gray-200">{options.map((option) => <div key={option.key} className="px-5 py-4 sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium text-gray-800">{option.label}</p><p className="mt-0.5 text-xs text-gray-500">{option.description}</p></div><span className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-500">{option.storageKey}</span></div></div>)}</div>
        </section>;
      })}</div>
    </div>
  </div>;
}
