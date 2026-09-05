import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { getModuleMeta } from "../../config/modules";

export default function ModuleActionCard({ module, onClick, prominent = false }) {
  const meta = getModuleMeta(module.key);
  const Icon = meta.icon;
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={reduceMotion ? undefined : { y: -4, scale: 1.012 }}
      whileTap={reduceMotion ? undefined : { scale: 0.985 }}
      transition={{ type: "spring", stiffness: 360, damping: 26, mass: 0.55 }}
      className={`group relative flex h-full w-full overflow-hidden rounded-xl border p-5 text-left transition-[border-color,background-color] duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-[#127475]/20 focus:ring-offset-2 sm:p-6 ${meta.card}`}
    >
      <span className="relative flex min-w-0 flex-1 flex-col">
        <span className="flex items-start justify-between gap-5">
          <motion.span
            whileHover={reduceMotion ? undefined : { scale: 1.08, rotate: -2 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
            className={`flex ${prominent ? "h-14 w-14" : "h-12 w-12"} shrink-0 items-center justify-center rounded-xl ${meta.tint}`}
          >
            <Icon size={prominent ? 27 : 23} strokeWidth={1.85} />
          </motion.span>

          <motion.span
            animate={{ x: 0, y: 0 }}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors duration-300 ${meta.action}`}
          >
            <ArrowUpRight size={15} className="transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </motion.span>
        </span>

        <span className="mt-auto pt-5">
          <span className={`${prominent ? "text-base" : "text-[15px]"} block font-semibold leading-5 text-gray-900`}>
            {module.label}
          </span>
          <span className="mt-2 block line-clamp-2 text-[11px] leading-4 text-gray-600 transition-colors duration-300 group-hover:text-gray-700 sm:text-xs">
            {meta.description}
          </span>
        </span>
      </span>
    </motion.button>
  );
}
