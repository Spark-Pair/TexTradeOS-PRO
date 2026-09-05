import { Search, X } from "lucide-react";

export default function ModuleSearch({ value, onChange, inputRef }) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={19} />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search modules and actions..."
        className="h-12 w-full rounded-xl border border-gray-300 bg-gray-50 pl-11 pr-20 text-sm outline-none transition focus:border-[#1C7773] focus:bg-white focus:ring-2 focus:ring-teal-100"
      />
      {value ? (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 hover:bg-gray-100">
          <X size={16} />
        </button>
      ) : (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-400">Ctrl K</span>
      )}
    </div>
  );
}
