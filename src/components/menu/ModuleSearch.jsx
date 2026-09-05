import { Search, X } from "lucide-react";

export default function ModuleSearch({ value, onChange, inputRef }) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={19} />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search sale, purchase, stock, customer..."
        aria-label="Search business actions"
        className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50/70 pl-11 pr-20 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-300 focus:border-[#1C7773] focus:bg-white focus:ring-2 focus:ring-teal-100"
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            requestAnimationFrame(() => inputRef?.current?.focus());
          }}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-100"
        >
          <X size={16} />
        </button>
      ) : (
        <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-400 sm:block">Ctrl K</span>
      )}
    </div>
  );
}
