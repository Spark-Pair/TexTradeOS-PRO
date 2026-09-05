import {
  Boxes, FileText, Gauge, Keyboard, LayoutGrid, Settings, ShoppingCart,
  RotateCcw, Undo2, Store, UserRound, Users2,
} from "lucide-react";

export const MODULE_META = {
  dashboard: { icon: Gauge, description: "Business overview and key numbers", tint: "bg-teal-200/80 text-teal-800", card: "bg-teal-100/80 border-teal-300/80 hover:bg-teal-200/70 hover:border-teal-400", action: "bg-teal-200/80 text-teal-800 group-hover:bg-teal-300/80" },
  users_manage: { icon: Users2, description: "Team members, roles and access", tint: "bg-sky-200/80 text-sky-800", card: "bg-sky-100/80 border-sky-300/80 hover:bg-sky-200/70 hover:border-sky-400", action: "bg-sky-200/80 text-sky-800 group-hover:bg-sky-300/80" },
  customers: { icon: UserRound, description: "Customer profiles and accounts", tint: "bg-emerald-200/80 text-emerald-800", card: "bg-emerald-100/80 border-emerald-300/80 hover:bg-emerald-200/70 hover:border-emerald-400", action: "bg-emerald-200/80 text-emerald-800 group-hover:bg-emerald-300/80" },
  suppliers: { icon: Store, description: "Supplier profiles and accounts", tint: "bg-amber-200/80 text-amber-800", card: "bg-amber-100/80 border-amber-300/80 hover:bg-amber-200/70 hover:border-amber-400", action: "bg-amber-200/80 text-amber-800 group-hover:bg-amber-300/80" },
  purchases: { icon: ShoppingCart, description: "Purchase entries and stock intake", tint: "bg-orange-200/80 text-orange-800", card: "bg-orange-100/80 border-orange-300/80 hover:bg-orange-200/70 hover:border-orange-400", action: "bg-orange-200/80 text-orange-800 group-hover:bg-orange-300/80" },
  inventory: { icon: Boxes, description: "Articles, stock and labels", tint: "bg-cyan-200/80 text-cyan-800", card: "bg-cyan-100/80 border-cyan-300/80 hover:bg-cyan-200/70 hover:border-cyan-400", action: "bg-cyan-200/80 text-cyan-800 group-hover:bg-cyan-300/80" },
  invoices: { icon: FileText, description: "Create, view and print invoices", tint: "bg-violet-200/80 text-violet-800", card: "bg-violet-100/80 border-violet-300/80 hover:bg-violet-200/70 hover:border-violet-400", action: "bg-violet-200/80 text-violet-800 group-hover:bg-violet-300/80" },
  sales_returns: { icon: RotateCcw, description: "Customer returns and adjustments", tint: "bg-rose-200/80 text-rose-800", card: "bg-rose-100/80 border-rose-300/80 hover:bg-rose-200/70 hover:border-rose-400", action: "bg-rose-200/80 text-rose-800 group-hover:bg-rose-300/80" },
  purchase_returns: { icon: Undo2, description: "Supplier returns and allowances", tint: "bg-yellow-200/80 text-yellow-800", card: "bg-yellow-100/80 border-yellow-300/80 hover:bg-yellow-200/70 hover:border-yellow-400", action: "bg-yellow-200/80 text-yellow-800 group-hover:bg-yellow-300/80" },
  settings: { icon: Settings, description: "Access rules and system settings", tint: "bg-slate-200 text-slate-800", card: "bg-slate-100 border-slate-300 hover:bg-slate-200/80 hover:border-slate-400", action: "bg-slate-200 text-slate-800 group-hover:bg-slate-300" },
  keyboard_shortcuts: { icon: Keyboard, description: "Customize app shortcuts", tint: "bg-pink-200/80 text-pink-800", card: "bg-pink-100/80 border-pink-300/80 hover:bg-pink-200/70 hover:border-pink-400", action: "bg-pink-200/80 text-pink-800 group-hover:bg-pink-300/80" },
};

export const MENU_MODULE = {
  key: "menu", label: "Menu", path: "/", icon: LayoutGrid,
  description: "All modules and actions", tint: "bg-teal-50 text-teal-700",
};

export const getModuleMeta = (key) => MODULE_META[key] || {
  icon: FileText, description: "Open module", tint: "bg-gray-200 text-gray-800",
  card: "bg-gray-100 border-gray-300 hover:bg-gray-200 hover:border-gray-400",
  action: "bg-gray-200 text-gray-800 group-hover:bg-gray-300",
};
