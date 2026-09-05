import { ArrowRight } from "lucide-react";
import { getModuleMeta } from "../../config/modules";

export default function ModuleActionCard({ module, onClick }) {
  const meta = getModuleMeta(module.key);
  const Icon = meta.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex h-full w-full overflow-hidden rounded-xl border p-5 text-left transition-[transform,border-color,background-color] duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[#127475]/20 focus:ring-offset-2 active:scale-[0.985] motion-reduce:transform-none motion-reduce:transition-none ${meta.card}`}
    >
      <span className="relative flex min-w-0 flex-1 flex-col">
        <span className="flex items-start justify-between gap-4">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-[1.04] ${meta.tint}`}>
            <Icon size={20} strokeWidth={1.8} />
          </span>

          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-200 ease-out group-hover:translate-x-0.5 ${meta.action}`}>
            <ArrowRight size={15} />
          </span>
        </span>

        <span className="mt-auto pt-4">
          <span className="block text-[15px] font-semibold leading-5 text-gray-900">
            {module.label}
          </span>
          <span className="mt-1.5 block line-clamp-2 text-xs leading-[1.15rem] text-gray-600 transition-colors duration-200 group-hover:text-gray-700">
            {meta.description}
          </span>
        </span>
      </span>
    </button>
  );
}
