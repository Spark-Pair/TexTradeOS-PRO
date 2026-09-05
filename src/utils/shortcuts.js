export const SHORTCUT_ACTIONS = [
  { id: "global_search", category: "General", label: "Global Search / Menu Search", description: "Open the Menu and focus global search.", defaultCombo: "Ctrl+K", editable: true },
  { id: "page_header_primary_action", category: "Actions", label: "Primary Page Action", description: "Run the main action shown in the current page header.", defaultCombo: "Ctrl+Space", editable: true },
  { id: "go_menu", category: "Navigation", label: "Open Menu", description: "Go to the main action menu.", defaultCombo: "Alt+M", editable: true, path: "/" },
  { id: "go_dashboard", category: "Navigation", label: "Open Dashboard", description: "Go to Dashboard.", defaultCombo: "Alt+D", editable: true, path: "/dashboard" },
  { id: "go_invoices", category: "Navigation", label: "Open Invoices", description: "Go to Invoices.", defaultCombo: "Alt+I", editable: true, path: "/invoices" },
  { id: "go_customers", category: "Navigation", label: "Open Customers", description: "Go to Customers.", defaultCombo: "Alt+C", editable: true, path: "/customers" },
  { id: "go_suppliers", category: "Navigation", label: "Open Suppliers", description: "Go to Suppliers.", defaultCombo: "Alt+S", editable: true, path: "/suppliers" },
  { id: "go_purchases", category: "Navigation", label: "Open Purchases", description: "Go to Purchases.", defaultCombo: "Alt+P", editable: true, path: "/purchases" },
  { id: "go_inventory", category: "Navigation", label: "Open Inventory", description: "Go to Inventory.", defaultCombo: "Alt+V", editable: true, path: "/inventory" },
  { id: "go_sales_returns", category: "Navigation", label: "Open Sales Returns", description: "Go to Sales Returns.", defaultCombo: "Alt+R", editable: true, path: "/sales-returns" },
  { id: "go_purchase_returns", category: "Navigation", label: "Open Purchase Returns", description: "Go to Purchase Returns.", defaultCombo: "Alt+Shift+R", editable: true, path: "/purchase-returns" },
  { id: "production_add_row", category: "Forms", label: "Add Invoice Row", description: "Add another item row while entering an invoice where supported.", defaultCombo: "ArrowRight", editable: true },
  { id: "close_top_dialog", category: "System", label: "Close Current Dialog", description: "Close only the top-most open dialog. Kept fixed for predictable keyboard behavior.", defaultCombo: "Esc", editable: false },
];

export const DEFAULT_SHORTCUTS = Object.fromEntries(SHORTCUT_ACTIONS.map((action) => [action.id, action.defaultCombo]));
const MODIFIER_KEYS = new Set(["Control", "Shift", "Alt", "Meta"]);
const KEY_ALIASES = { " ": "Space", Spacebar: "Space", Escape: "Esc", ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right" };
export function normalizeKey(key) { if (!key) return ""; if (KEY_ALIASES[key]) return KEY_ALIASES[key]; if (key.length === 1) return key.toUpperCase(); return key; }
export function formatShortcutFromEvent(e) { const parts=[]; if(e.ctrlKey||e.metaKey)parts.push("Ctrl"); if(e.shiftKey)parts.push("Shift"); if(e.altKey)parts.push("Alt"); if(MODIFIER_KEYS.has(e.key)) return {combo:parts.join("+"),display:parts.join(" + "),isModifierOnly:true}; const key=normalizeKey(e.key); return {combo:[...parts,key].join("+"),display:[...parts,key].join(" + "),isModifierOnly:false}; }
function parseShortcutCombo(combo="") { const tokens=combo.split("+").map(t=>t.trim()).filter(Boolean); return {ctrl:tokens.some(t=>t.toLowerCase()==="ctrl"),shift:tokens.some(t=>t.toLowerCase()==="shift"),alt:tokens.some(t=>t.toLowerCase()==="alt"),key:normalizeKey(tokens.find(t=>!["ctrl","shift","alt"].includes(t.toLowerCase()))||"")}; }
export function isEventMatchingShortcut(e,combo){const p=parseShortcutCombo(combo);if(!p.key)return false;if((e.ctrlKey||e.metaKey)!==p.ctrl||e.shiftKey!==p.shift||e.altKey!==p.alt)return false;return normalizeKey(e.key)===p.key;}
export function assignShortcutInMap(shortcutMap,actionId,combo){const map={...shortcutMap};let removedFromActionId=null;Object.entries(map).forEach(([id,c])=>{if(id!==actionId&&c&&c===combo){map[id]="";removedFromActionId=id;}});map[actionId]=combo;return{map,removedFromActionId};}
export function findActionByShortcut(shortcutMap,combo,ignoreActionId=""){return SHORTCUT_ACTIONS.find(a=>a.id!==ignoreActionId&&shortcutMap[a.id]===combo);}
export function getActionLabel(actionId){return SHORTCUT_ACTIONS.find(a=>a.id===actionId)?.label||actionId;}
export function formatComboDisplay(combo=""){if(!combo)return "Not set";return combo.split("+").join(" + ");}
export function shouldIgnoreGlobalShortcutTarget(target){if(!target||!(target instanceof HTMLElement))return false;if(target.closest("[data-shortcut-capture='true']"))return true;const tag=target.tagName;return target.isContentEditable||tag==="INPUT"||tag==="TEXTAREA"||tag==="SELECT";}
