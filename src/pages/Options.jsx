import { Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Input from "../components/Input";
import { getModuleMeta } from "../config/modules";
import { getOptionGroupsByModule } from "../config/optionsRegistry";
import { BUSINESS_ACCESS_ITEMS_MAP } from "../utils/accessConfig";
import { fetchMyReferenceData, updateMyReferenceData } from "../api/business";
import { useToast } from "../context/ToastContext";

export default function OptionsPage() {
  const { showToast } = useToast();
  const [referenceData, setReferenceData] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const groups = useMemo(() => Array.from(getOptionGroupsByModule().entries()), []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetchMyReferenceData();
      if (!response?.reference_data || typeof response.reference_data !== "object") throw new Error("Options response is incomplete");
      setReferenceData(response.reference_data);
    } catch (error) {
      setReferenceData(null);
      const message = error?.response?.data?.message || error?.message || "Failed to load options";
      setLoadError(message);
      showToast({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const persist = async (storageKey, values) => {
    if (!referenceData) return;
    setSavingKey(storageKey);
    try {
      const next = { ...referenceData, [storageKey]: values };
      const response = await updateMyReferenceData(next);
      if (!response?.reference_data || typeof response.reference_data !== "object") throw new Error("Updated options response is incomplete");
      setReferenceData(response.reference_data);
      showToast({ type: "success", message: "Options updated" });
    } catch (error) {
      showToast({ type: "error", message: error?.response?.data?.message || error?.message || "Could not update options" });
    } finally {
      setSavingKey("");
    }
  };

  const addValue = async (option) => {
    if (!referenceData) return;
    const value = String(drafts[option.key] || "").trim();
    if (!value) return;
    const current = Array.isArray(referenceData[option.storageKey]) ? referenceData[option.storageKey] : [];
    if (current.some((item) => String(item).toLowerCase() === value.toLowerCase())) {
      showToast({ type: "error", message: `${value} already exists` });
      return;
    }
    await persist(option.storageKey, [...current, value]);
    setDrafts((prev) => ({ ...prev, [option.key]: "" }));
  };

  const removeValue = async (option, value) => {
    if (!referenceData) return;
    const current = Array.isArray(referenceData[option.storageKey]) ? referenceData[option.storageKey] : [];
    await persist(option.storageKey, current.filter((item) => item !== value));
  };

  return <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col">
    <PageHeader title="Options & Configuration" subtitle="Manage reusable business options stored in the database." />
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8">
      {loading ? <div className="rounded-3xl border border-gray-300 bg-white py-16 text-center text-sm text-gray-400">Loading options from database...</div> : loadError ? <div className="rounded-3xl border border-gray-300 bg-white py-16 text-center"><p className="text-sm font-medium text-red-600">Options could not be loaded from the database.</p><p className="mt-1 text-xs text-gray-400">{loadError}</p><Button className="mt-4" size="sm" variant="secondary" outline onClick={load}>Retry</Button></div> : <div className="space-y-4">{groups.map(([moduleKey, options]) => {
        const module = BUSINESS_ACCESS_ITEMS_MAP.get(moduleKey);
        const Icon = getModuleMeta(moduleKey).icon || SlidersHorizontal;
        return <section key={moduleKey} className="overflow-hidden rounded-3xl border border-gray-300 bg-white">
          <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:px-6"><span className="grid h-9 w-9 place-items-center rounded-xl border border-gray-200 bg-white text-gray-600"><Icon size={17} /></span><div><h2 className="text-sm font-semibold text-gray-800">{module?.label || moduleKey}</h2><p className="text-xs text-gray-400">Values below are loaded from and saved to business reference data.</p></div></div>
          <div className="divide-y divide-gray-200">{options.map((option) => {
            const values = Array.isArray(referenceData?.[option.storageKey]) ? referenceData[option.storageKey] : [];
            const saving = savingKey === option.storageKey;
            return <div key={option.key} className="px-5 py-5 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 lg:max-w-sm"><p className="text-sm font-semibold text-gray-800">{option.label}</p><p className="mt-1 text-xs leading-5 text-gray-500">{option.description}</p></div>
                <div className="w-full lg:max-w-2xl"><div className="flex gap-2"><div className="min-w-0 flex-1"><Input value={drafts[option.key] || ""} placeholder={`Add ${option.label.toLowerCase()}`} disabled={saving} onChange={(event) => setDrafts((prev) => ({ ...prev, [option.key]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addValue(option); } }} /></div><Button size="sm" icon={Plus} loading={saving} disabled={saving || !String(drafts[option.key] || "").trim()} onClick={() => addValue(option)}>Add</Button></div>
                  <div className="mt-3 flex flex-wrap gap-2">{values.length ? values.map((value) => <span key={value} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700">{value}<button type="button" disabled={saving} onClick={() => removeValue(option, value)} className="rounded-md p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label={`Remove ${value}`}><Trash2 size={13} /></button></span>) : <span className="text-xs text-gray-400">No values configured yet.</span>}</div>
                </div>
              </div>
            </div>;
          })}</div>
        </section>;
      })}</div>}
    </div>
  </div>;
}
