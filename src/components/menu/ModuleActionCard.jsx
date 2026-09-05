import { ArrowRight } from "lucide-react";
import { getModuleMeta } from "../../config/modules";

export default function ModuleActionCard({ module, onClick, prominent = false }) {
  const meta = getModuleMeta(module.key);
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex min-h-[132px] w-full flex-col items-start rounded-2xl border bg-white p-4 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-teal-100 sm:p-5 ${
        prominent
          ? "border-teal-200 shadow-sm shadow-teal-100/60 hover:-translate-y-0.5 hover:border-[#1C7773] hover:shadow-md"
          : "border-gray-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-sm"
      }`}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${meta.tint}`}>
          <Icon size={20} strokeWidth={1.8} />
        </span>
        {prominent && (
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#1C7773]">
            Quick action
          </span>
        )}
      </div>

      <span className="mt-4 block text-sm font-semibold text-gray-900">{module.label}</span>
      <span className="mt-1 block text-xs leading-5 text-gray-500">{meta.description}</span>

      <span className="mt-auto flex w-full justify-end pt-3">
        <ArrowRight size={16} className="text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[#1C7773]" />
      </span>
    </button>
  );
}
