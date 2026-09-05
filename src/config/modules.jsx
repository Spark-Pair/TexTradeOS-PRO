import {
  Boxes,
  FileText,
  Gauge,
  Keyboard,
  LayoutGrid,
  Settings,
  ShoppingCart,
  RotateCcw,
  Undo2,
  Store,
  UserRound,
  Users2,
} from "lucide-react";

/**
 * Single visual registry for application modules.
 * Navigation, menu/action hub and future permission-aware UI should consume
 * this registry instead of declaring their own icons/labels.
 */
export const MODULE_META = {
  dashboard: {
    icon: Gauge,
    description: "Business overview and key numbers",
    tint: "bg-teal-50 text-teal-700",
    card: "bg-teal-50/80 border-teal-200/80 hover:bg-teal-100/70 hover:border-teal-300",
    action: "bg-teal-100/80 text-teal-700 group-hover:bg-teal-200/80",
  },
  users_manage: {
    icon: Users2,
    description: "Team members, roles and access",
    tint: "bg-sky-100/80 text-sky-700",
    card: "bg-sky-50/80 border-sky-200/80 hover:bg-sky-100/70 hover:border-sky-300",
    action: "bg-sky-100/80 text-sky-700 group-hover:bg-sky-200/80",
  },
  customers: {
    icon: UserRound,
    description: "Customer profiles and accounts",
    tint: "bg-emerald-100/80 text-emerald-700",
    card: "bg-emerald-50/80 border-emerald-200/80 hover:bg-emerald-100/70 hover:border-emerald-300",
    action: "bg-emerald-100/80 text-emerald-700 group-hover:bg-emerald-200/80",
  },
  suppliers: {
    icon: Store,
    description: "Supplier profiles and accounts",
    tint: "bg-amber-100/80 text-amber-700",
    card: "bg-amber-50/80 border-amber-200/80 hover:bg-amber-100/70 hover:border-amber-300",
    action: "bg-amber-100/80 text-amber-700 group-hover:bg-amber-200/80",
  },
  purchases: {
    icon: ShoppingCart,
    description: "Purchase entries and stock intake",
    tint: "bg-orange-100/80 text-orange-700",
    card: "bg-orange-50/80 border-orange-200/80 hover:bg-orange-100/70 hover:border-orange-300",
    action: "bg-orange-100/80 text-orange-700 group-hover:bg-orange-200/80",
  },
  inventory: {
    icon: Boxes,
    description: "Articles, stock and labels",
    tint: "bg-cyan-100/80 text-cyan-700",
    card: "bg-cyan-50/80 border-cyan-200/80 hover:bg-cyan-100/70 hover:border-cyan-300",
    action: "bg-cyan-100/80 text-cyan-700 group-hover:bg-cyan-200/80",
  },
  invoices: {
    icon: FileText,
    description: "Create, view and print invoices",
    tint: "bg-violet-100/80 text-violet-700",
    card: "bg-violet-50/80 border-violet-200/80 hover:bg-violet-100/70 hover:border-violet-300",
    action: "bg-violet-100/80 text-violet-700 group-hover:bg-violet-200/80",
  },
  sales_returns: {
    icon: RotateCcw,
    description: "Customer returns and adjustments",
    tint: "bg-rose-100/80 text-rose-700",
    card: "bg-rose-50/80 border-rose-200/80 hover:bg-rose-100/70 hover:border-rose-300",
    action: "bg-rose-100/80 text-rose-700 group-hover:bg-rose-200/80",
  },
  purchase_returns: {
    icon: Undo2,
    description: "Supplier returns and allowances",
    tint: "bg-yellow-100/80 text-yellow-700",
    card: "bg-yellow-50/80 border-yellow-200/80 hover:bg-yellow-100/70 hover:border-yellow-300",
    action: "bg-yellow-100/80 text-yellow-700 group-hover:bg-yellow-200/80",
  },
  settings: {
    icon: Settings,
    description: "Access rules and system settings",
    tint: "bg-slate-200/80 text-slate-700",
    card: "bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300",
    action: "bg-slate-200/70 text-slate-700 group-hover:bg-slate-200",
  },
  keyboard_shortcuts: {
    icon: Keyboard,
    description: "Customize app shortcuts",
    tint: "bg-pink-100/80 text-pink-700",
    card: "bg-pink-50/80 border-pink-200/80 hover:bg-pink-100/70 hover:border-pink-300",
    action: "bg-pink-100/80 text-pink-700 group-hover:bg-pink-200/80",
  },
};

export const MENU_MODULE = {
  key: "menu",
  label: "Menu",
  path: "/",
  icon: LayoutGrid,
  description: "All modules and actions",
  tint: "bg-teal-50 text-teal-700",
};

export const getModuleMeta = (key) => MODULE_META[key] || {
  icon: FileText,
  description: "Open module",
  tint: "bg-gray-100 text-gray-700",
  card: "bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300",
  action: "bg-gray-100 text-gray-700 group-hover:bg-gray-200",
};
