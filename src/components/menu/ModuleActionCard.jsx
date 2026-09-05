import { ArrowUpRight } from "lucide-react";
import { getModuleMeta } from "../../config/modules";

export default function ModuleActionCard({ module, onClick, prominent = false }) {
  const meta = getModuleMeta(module.key);
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-full w-full overflow-hidden rounded-2xl border text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-teal-100 ${
        prominent
          ? "border-teal-200 bg-teal-50/40 hover:-translate-y-0.5 hover:border-[#1C7773] hover:shadow-md"
          : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-sm"
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${prominent ? "bg-[#1C7773]" : "bg-gray-100 group-hover:bg-teal-200"}`} />

      <span className="flex min-w-0 flex-1 flex-col p-4 pl-5 sm:p-5 sm:pl-6">
        <span className="flex items-start justify-between gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${meta.tint}`}>
            <Icon size={23} strokeWidth={1.7} />
          </span>
          <ArrowUpRight size={17} className="mt-1 text-gray-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#1C7773]" />
        </span>

        <span className="mt-auto pt-3">
          <span className={`block font-semibold text-gray-900 ${prominent ? "text-base" : "text-sm"}`}>{module.label}</span>
          <span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-gray-500 sm:text-xs">{meta.description}</span>
        </span>
      </span>
    </button>
  );
}
