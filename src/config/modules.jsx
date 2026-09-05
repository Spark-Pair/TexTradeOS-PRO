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
  },
  users_manage: {
    icon: Users2,
    description: "Team members, roles and access",
    tint: "bg-sky-50 text-sky-700",
  },
  customers: {
    icon: UserRound,
    description: "Customer profiles and accounts",
    tint: "bg-emerald-50 text-emerald-700",
  },
  suppliers: {
    icon: Store,
    description: "Supplier profiles and accounts",
    tint: "bg-amber-50 text-amber-700",
  },
  purchases: {
    icon: ShoppingCart,
    description: "Purchase entries and stock intake",
    tint: "bg-orange-50 text-orange-700",
  },
  inventory: {
    icon: Boxes,
    description: "Articles, stock and labels",
    tint: "bg-cyan-50 text-cyan-700",
  },
  invoices: {
    icon: FileText,
    description: "Create, view and print invoices",
    tint: "bg-violet-50 text-violet-700",
  },
  sales_returns: { icon: RotateCcw, description: "Customer returns and adjustments", tint: "bg-rose-50 text-rose-700" },
  purchase_returns: { icon: Undo2, description: "Supplier returns and allowances", tint: "bg-amber-50 text-amber-700" },
  settings: {
    icon: Settings,
    description: "Access rules and system settings",
    tint: "bg-slate-100 text-slate-700",
  },
  keyboard_shortcuts: {
    icon: Keyboard,
    description: "Customize app shortcuts",
    tint: "bg-rose-50 text-rose-700",
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
};
