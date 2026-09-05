import { ArrowUpRight } from "lucide-react";
import { getModuleMeta } from "../../config/modules";

export default function ModuleActionCard({ module, onClick, prominent = false }) {
  const meta = getModuleMeta(module.key);
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-full w-full overflow-hidden rounded-lg border p-4 text-left transition-[transform,border-color,background-color] duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[#127475]/20 focus:ring-offset-2 active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none ${meta.card}`}
    >
      <span className="relative flex min-w-0 flex-1 flex-col">
        <span className="flex items-start justify-between gap-3">
          <span className={`flex ${prominent ? "h-12 w-12" : "h-10 w-10"} shrink-0 items-center justify-center rounded-lg transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-105 ${meta.tint}`}>
            <Icon size={prominent ? 22 : 19} strokeWidth={1.9} />
          </span>

          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-[transform,background-color] duration-200 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${meta.action}`}>
            <ArrowUpRight size={14} />
          </span>
        </span>

        <span className="mt-auto pt-3">
          <span className={`${prominent ? "text-base" : "text-[15px]"} block font-semibold leading-5 text-gray-900`}>
            {module.label}
          </span>
          <span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-gray-600 transition-colors duration-200 group-hover:text-gray-700 sm:text-xs">
            {meta.description}
          </span>
        </span>
      </span>
    </button>
  );
}
