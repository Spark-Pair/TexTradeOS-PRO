import { ArrowRight } from "lucide-react";
import { getModuleMeta } from "../../config/modules";

export default function ModuleActionCard({ module, onClick }) {
  const meta = getModuleMeta(module.key);
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-teal-200 hover:bg-teal-50/30 focus:outline-none focus:ring-2 focus:ring-teal-100"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.tint}`}>
        <Icon size={19} strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900">{module.label}</span>
        <span className="mt-1 block truncate text-xs text-gray-500">{meta.description}</span>
      </span>
      <ArrowRight size={16} className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#1C7773]" />
    </button>
  );
}
