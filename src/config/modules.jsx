import {
  Boxes, FileText, Gauge, Keyboard, LayoutGrid, Settings, ShoppingCart,
  RotateCcw, Undo2, Store, UserRound, Users2,
} from "lucide-react";

export const MODULE_META = {
  dashboard: { icon: Gauge, description: "Business overview and key numbers", tint: "bg-teal-100 text-teal-700", card: "bg-teal-50/45 border-teal-100 hover:bg-teal-50/80 hover:border-teal-200", action: "bg-teal-100/70 text-teal-700 group-hover:bg-teal-100" },
  users_manage: { icon: Users2, description: "Team members, roles and access", tint: "bg-sky-100 text-sky-700", card: "bg-sky-50/45 border-sky-100 hover:bg-sky-50/80 hover:border-sky-200", action: "bg-sky-100/70 text-sky-700 group-hover:bg-sky-100" },
  customers: { icon: UserRound, description: "Customer profiles and accounts", tint: "bg-emerald-100 text-emerald-700", card: "bg-emerald-50/45 border-emerald-100 hover:bg-emerald-50/80 hover:border-emerald-200", action: "bg-emerald-100/70 text-emerald-700 group-hover:bg-emerald-100" },
  suppliers: { icon: Store, description: "Supplier profiles and accounts", tint: "bg-amber-100 text-amber-700", card: "bg-amber-50/45 border-amber-100 hover:bg-amber-50/80 hover:border-amber-200", action: "bg-amber-100/70 text-amber-700 group-hover:bg-amber-100" },
  purchases: { icon: ShoppingCart, description: "Purchase entries and stock intake", tint: "bg-orange-100 text-orange-700", card: "bg-orange-50/45 border-orange-100 hover:bg-orange-50/80 hover:border-orange-200", action: "bg-orange-100/70 text-orange-700 group-hover:bg-orange-100" },
  inventory: { icon: Boxes, description: "Articles, stock and labels", tint: "bg-cyan-100 text-cyan-700", card: "bg-cyan-50/45 border-cyan-100 hover:bg-cyan-50/80 hover:border-cyan-200", action: "bg-cyan-100/70 text-cyan-700 group-hover:bg-cyan-100" },
  invoices: { icon: FileText, description: "Create, view and print invoices", tint: "bg-violet-100 text-violet-700", card: "bg-violet-50/45 border-violet-100 hover:bg-violet-50/80 hover:border-violet-200", action: "bg-violet-100/70 text-violet-700 group-hover:bg-violet-100" },
  sales_returns: { icon: RotateCcw, description: "Customer returns and adjustments", tint: "bg-rose-100 text-rose-700", card: "bg-rose-50/45 border-rose-100 hover:bg-rose-50/80 hover:border-rose-200", action: "bg-rose-100/70 text-rose-700 group-hover:bg-rose-100" },
  purchase_returns: { icon: Undo2, description: "Supplier returns and allowances", tint: "bg-yellow-100 text-yellow-700", card: "bg-yellow-50/45 border-yellow-100 hover:bg-yellow-50/80 hover:border-yellow-200", action: "bg-yellow-100/70 text-yellow-700 group-hover:bg-yellow-100" },
  settings: { icon: Settings, description: "Access rules and system settings", tint: "bg-slate-100 text-slate-700", card: "bg-slate-50/60 border-slate-200/70 hover:bg-slate-100/60 hover:border-slate-200", action: "bg-slate-100 text-slate-700 group-hover:bg-slate-200/70" },
  keyboard_shortcuts: { icon: Keyboard, description: "Customize app shortcuts", tint: "bg-pink-100 text-pink-700", card: "bg-pink-50/45 border-pink-100 hover:bg-pink-50/80 hover:border-pink-200", action: "bg-pink-100/70 text-pink-700 group-hover:bg-pink-100" },
};

export const MENU_MODULE = {
  key: "menu", label: "Menu", path: "/", icon: LayoutGrid,
  description: "All modules and actions", tint: "bg-teal-50 text-teal-700",
};

export const getModuleMeta = (key) => MODULE_META[key] || {
  icon: FileText, description: "Open module", tint: "bg-gray-100 text-gray-700",
  card: "bg-gray-50/60 border-gray-200 hover:bg-gray-100/60 hover:border-gray-300",
  action: "bg-gray-100 text-gray-700 group-hover:bg-gray-200/70",
};
