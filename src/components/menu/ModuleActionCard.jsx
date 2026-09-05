import { ArrowRight } from "lucide-react";
import { getModuleMeta } from "../../config/modules";

export default function ModuleActionCard({ module, onClick, prominent = false }) {
  const meta = getModuleMeta(module.key);
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-full w-full overflow-hidden rounded-xl border bg-white p-5 text-left transition-[transform,border-color,background-color] duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[#127475]/20 focus:ring-offset-2 active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none ${
        prominent
          ? "border-[#127475]/25 hover:-translate-y-0.5 hover:border-[#127475]/55 hover:bg-[#127475]/[0.025]"
          : "border-gray-200 hover:-translate-y-0.5 hover:border-[#127475]/30 hover:bg-gray-50/50"
      }`}
    >
      <span className="relative flex min-w-0 flex-1 flex-col">
        <span className="flex items-start justify-between gap-4">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-[transform,background-color] duration-200 ease-out group-hover:-translate-y-0.5 ${
              prominent ? "bg-[#127475]/10 text-[#127475]" : meta.tint
            }`}
          >
            <Icon size={20} strokeWidth={1.8} className="transition-transform duration-200 ease-out group-hover:scale-110" />
          </span>

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-300 transition-[color,background-color,transform] duration-200 ease-out group-hover:translate-x-0.5 group-hover:bg-[#127475]/5 group-hover:text-[#127475]">
            <ArrowRight size={15} />
          </span>
        </span>

        <span className="mt-auto pt-4">
          <span className="block text-[15px] font-semibold leading-5 text-gray-900 transition-colors duration-200 group-hover:text-[#0a6465]">
            {module.label}
          </span>
          <span className="mt-1.5 block line-clamp-2 text-xs leading-[1.15rem] text-gray-500 transition-colors duration-200 group-hover:text-gray-600">
            {meta.description}
          </span>
        </span>
      </span>
    </button>
  );
}
