import { Check } from "lucide-react";

export default function Checkbox({ checked = false, onChange, label, id, disabled = false, className = "" }) {
  const inputId = id || `checkbox-${String(label || "option").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <label htmlFor={inputId} className={`inline-flex select-none items-center gap-2.5 text-xs font-medium text-gray-700 ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"} ${className}`}>
      <input id={inputId} type="checkbox" className="peer sr-only" checked={Boolean(checked)} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border border-gray-300 bg-white text-transparent transition-all duration-150 peer-checked:border-[#127475] peer-checked:bg-[#127475] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#127475]/20 peer-focus-visible:ring-offset-2 peer-disabled:bg-gray-100">
        <Check size={12} strokeWidth={3} />
      </span>
      {label != null && <span>{label}</span>}
    </label>
  );
}
