const VARIANTS = {
  normal: {
    bg: "bg-teal-100/60",
    text: "text-teal-700",
  },
  success: {
    bg: "bg-emerald-100/60",
    text: "text-emerald-700",
  },
  danger: {
    bg: "bg-rose-100/60",
    text: "text-rose-700",
  },
  warning: {
    bg: "bg-amber-100/60",
    text: "text-amber-700",
  },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  variant = "normal",
  meta = "",
  negative = false,
}) {
  const styles = VARIANTS[variant] || VARIANTS.normal;
  const isNegative = negative ||
    (typeof value === "string" && /(?:^|\s)-\s*\d/.test(value));
  const isNegativeMeta = typeof meta === "string" && /^\s*-\s*\d/.test(meta);

  return (
    <div className="stat-card bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl border border-gray-300 flex items-center gap-3 sm:gap-5 min-w-0">
      <div
        className={`w-10 h-10 sm:w-13 sm:h-13 rounded-xl flex items-center justify-center ${styles.bg} ${styles.text} shrink-0`}
      >
        <Icon size={22} className="sm:hidden" strokeWidth={1.5} />
        <Icon size={26} className="hidden sm:block" strokeWidth={1.5} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1">
          <p className="min-w-0 flex-1 text-[10px] sm:text-xs font-medium uppercase tracking-wider text-gray-400 truncate">
            {label}
          </p>
          {meta && (
            <span
              title={meta}
              className={`max-w-[5.75rem] shrink-0 truncate rounded-md px-2 py-1 text-[12px] font-semibold leading-none sm:text-[13px] ${isNegativeMeta ? "bg-red-50 text-red-600" : "bg-gray-200/65 text-gray-600"}`}
            >
              {meta}
            </span>
          )}
        </div>
        <p className={`truncate text-lg sm:text-2xl ${isNegative ? "text-red-600" : "text-gray-900"}`}>{value}</p>
      </div>
    </div>
  );
}
