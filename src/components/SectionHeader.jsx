export function SectionHeader({ icon: Icon, title, subtitle, step, right, color = "text-gray-500" }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
            {Icon && <Icon className={`h-4 w-4 ${color}`} />}
            {step && <div className="flex items-center justify-center w-7 h-7 rounded-full bg-[#127475] text-white text-xs font-bold shrink-0">
                {step}
            </div>}
            <div className="min-w-0 pt-0.5">
                <span className="block text-xs font-semibold uppercase leading-4 tracking-wider text-gray-600">{title}</span>
                {subtitle && <p className="mt-0.5 hidden text-[11px] leading-4 text-gray-400 sm:block">{subtitle}</p>}
            </div>
        </div>
        {!right && <div className="h-px flex-1 bg-gray-300" />}
        {right && <div className="flex shrink-0 justify-end">{right}</div>}
    </div>
  );
}
