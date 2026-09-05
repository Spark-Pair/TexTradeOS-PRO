import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Keyboard, Pencil, RotateCcw, Search } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Modal from "../components/Modal";
import Input from "../components/Input";
import { useShortcutActions, useShortcutMap } from "../hooks/useShortcuts";
import { SHORTCUT_ACTIONS, DEFAULT_SHORTCUTS, findActionByShortcut, formatComboDisplay, formatShortcutFromEvent, getActionLabel } from "../utils/shortcuts";
import { useToast } from "../context/ToastContext";

function EditShortcutModal({ isOpen, onClose, action, currentShortcut, allShortcuts, onSave, onReset }) {
  const [capturedCombo, setCapturedCombo] = useState("");
  const [capturedDisplay, setCapturedDisplay] = useState("");
  const [modifierOnly, setModifierOnly] = useState(false);
  const conflict = useMemo(() => capturedCombo ? findActionByShortcut(allShortcuts, capturedCombo, action?.id) : null, [allShortcuts, capturedCombo, action?.id]);

  useEffect(() => {
    if (!isOpen) return;
    setCapturedCombo(currentShortcut || "");
    setCapturedDisplay(formatComboDisplay(currentShortcut || ""));
    setModifierOnly(false);
  }, [isOpen, currentShortcut]);

  useEffect(() => {
    if (!isOpen) return;
    const capture = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") { onClose(); return; }
      const p = formatShortcutFromEvent(e);
      setCapturedCombo(p.combo);
      setCapturedDisplay(p.display || "Press keys...");
      setModifierOnly(p.isModifierOnly);
    };
    window.addEventListener("keydown", capture, true);
    return () => window.removeEventListener("keydown", capture, true);
  }, [isOpen, onClose]);

  if (!action) return null;
  return <Modal isOpen={isOpen} onClose={onClose} closeOnEscape={false} title={`Edit: ${action.label}`} subtitle="Press the key combination you want to use." maxWidth="max-w-xl" footer={<div className="flex flex-wrap items-center justify-between gap-2"><Button variant="secondary" outline icon={RotateCcw} onClick={onReset}>Use Default</Button><div className="flex gap-2"><Button variant="secondary" outline onClick={onClose}>Cancel</Button><Button onClick={() => onSave(capturedCombo)} disabled={!capturedCombo || modifierOnly}>Save Shortcut</Button></div></div>}><div data-shortcut-capture="true" className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-gray-200 bg-gray-50 p-4"><p className="mb-2 text-xs text-gray-500">Default</p><kbd className="text-sm font-semibold text-gray-800">{formatComboDisplay(DEFAULT_SHORTCUTS[action.id])}</kbd></div><div className="rounded-2xl border border-teal-200 bg-teal-50 p-4"><p className="mb-2 text-xs text-[#1C7773]">Press new shortcut</p><kbd className="text-base font-semibold text-[#155e5b]">{capturedDisplay || "Press keys..."}</kbd></div></div>{modifierOnly && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">A modifier key cannot be assigned by itself.</p>}{conflict && <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">Already assigned to <b>{conflict.label}</b>. Saving will unassign it there.</p>}<p className="text-xs leading-5 text-gray-400">Shortcuts are ignored while you are typing in inputs, textareas and selects, so normal form entry stays safe.</p></div></Modal>;
}

export default function KeyboardShortcuts() {
  const { showToast } = useToast();
  const { assignShortcut, resetShortcut, resetShortcuts } = useShortcutActions();
  const shortcuts = useShortcutMap();
  const [editing, setEditing] = useState(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const cats = ["All", ...new Set(SHORTCUT_ACTIONS.map((a) => a.category))];
  const visible = SHORTCUT_ACTIONS.filter((a) => (category === "All" || a.category === category) && `${a.label} ${a.description} ${a.category}`.toLowerCase().includes(query.toLowerCase().trim()));

  const save = async (combo) => { const { removedFromActionId } = await assignShortcut(editing.id, combo); showToast({ type: removedFromActionId ? "warning" : "success", message: removedFromActionId ? `Saved. ${getActionLabel(removedFromActionId)} was unassigned to avoid a conflict.` : `Shortcut saved for ${editing.label}.` }); setEditing(null); };
  const resetOne = async (action = editing) => { if (!action) return; const { removedFromActionId } = await resetShortcut(action.id); showToast({ type: removedFromActionId ? "warning" : "success", message: `${action.label} restored to default${removedFromActionId ? `; ${getActionLabel(removedFromActionId)} was unassigned.` : "."}` }); setEditing(null); };
  const resetAll = async () => { await resetShortcuts(); showToast({ type: "success", message: "All keyboard shortcuts restored to defaults." }); };

  return <>
    <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col">
      <PageHeader title="Keyboard Shortcuts" subtitle="View, customize and restore keyboard controls across TexTradeOS." rightContent={<Button variant="secondary" outline icon={RotateCcw} onClick={resetAll}>Reset all defaults</Button>} />

      <div className="mb-4 rounded-3xl border border-gray-300 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search shortcuts..." icon={Search} />
          </div>
          <div className="max-w-[60%] shrink-0 overflow-x-auto scrollbar-none">
            <div className="relative flex w-max items-center gap-1 rounded-xl bg-gray-100/80 p-1">
              {cats.map((c) => {
                const active = category === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`relative z-0 shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors duration-200 ${active ? "text-[#1C7773]" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    {active && (
                      <motion.span
                        layoutId="shortcut-category-active"
                        className="absolute inset-0 -z-10 rounded-lg border border-gray-200 bg-white"
                        transition={{ type: "spring", stiffness: 430, damping: 34, mass: 0.7 }}
                      />
                    )}
                    <span className="relative z-10">{c}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-300 bg-white">
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white"><Keyboard size={17} className="text-gray-500" /></div>
          <div><h2 className="text-sm font-semibold text-gray-800">Shortcut assignments</h2><p className="text-xs text-gray-400">Editable shortcuts are saved to your user account.</p></div>
          <span className="ml-auto hidden text-xs text-gray-400 sm:block">{visible.length} shortcuts</span>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="divide-y divide-gray-200">
            {visible.map((a) => <div key={a.id} className="flex flex-col gap-3 px-5 py-4 transition-colors duration-150 hover:bg-gray-50/80 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="min-w-0"><div className="flex items-center gap-2"><p className="text-sm font-medium text-gray-800">{a.label}</p><span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{a.category}</span>{!a.editable && <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Fixed</span>}</div><p className="mt-0.5 text-xs text-gray-500">{a.description}</p></div><div className="flex items-center gap-2"><kbd className="min-w-32 rounded-lg border border-gray-300 bg-gray-50 px-3 py-1.5 text-center font-mono text-sm font-medium text-gray-700">{formatComboDisplay(shortcuts[a.id])}</kbd>{a.editable && <><Button variant="secondary" outline icon={Pencil} size="sm" onClick={() => setEditing(a)}>Edit</Button>{shortcuts[a.id] !== DEFAULT_SHORTCUTS[a.id] && <Button variant="secondary" outline icon={RotateCcw} size="sm" onClick={() => resetOne(a)} aria-label={`Reset ${a.label}`} />}</>}</div></div>)}
            {!visible.length && <div className="px-6 py-12 text-center text-sm text-gray-400">No shortcuts match your search.</div>}
          </div>
        </div>
      </div>
    </div>
    <EditShortcutModal isOpen={Boolean(editing)} onClose={() => setEditing(null)} action={editing} currentShortcut={editing ? shortcuts[editing.id] : ""} allShortcuts={shortcuts} onSave={save} onReset={() => resetOne(editing)} />
  </>;
}
