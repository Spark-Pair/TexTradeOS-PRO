import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ShieldCheck } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import { useToast } from "../context/ToastContext";
import { fetchMyReferenceData, fetchMyRuleData, updateMyRuleData } from "../api/business";
import { normalizeRuleData } from "../utils/businessRuleData";
import { BUSINESS_ACCESS_ITEMS_MAP, normalizeBusinessUserRoles } from "../utils/accessConfig";
import Checkbox from "../components/Checkbox";
import { getModuleMeta } from "../config/modules";

function RuleCheckbox({ checked, onChange, label, id }) { return <Checkbox id={id} checked={checked} onChange={onChange} label={label} />; }

export default function SettingsPage() {
  const { showToast } = useToast();
  const [referenceData, setReferenceData] = useState(null);
  const [ruleDataDraft, setRuleDataDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const availableUserRoles = useMemo(() => referenceData ? normalizeBusinessUserRoles(referenceData.user_roles || []) : [], [referenceData]);

  const loadAccessRules = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const [referenceRes, ruleRes] = await Promise.all([fetchMyReferenceData(), fetchMyRuleData()]);
      const nextReference = referenceRes?.reference_data;
      const nextRules = ruleRes?.rule_data;
      if (!nextReference || !Array.isArray(nextRules?.access_rules)) throw new Error("Access rules response is incomplete");
      setReferenceData(nextReference);
      setRuleDataDraft(normalizeRuleData(nextRules, nextReference));
    } catch (error) {
      setReferenceData(null);
      setRuleDataDraft(null);
      setLoadError(error?.response?.data?.message || error?.message || "Failed to load access rules");
      showToast({ type: "error", message: "Failed to load access rules" });
    } finally { setLoading(false); }
  }, [showToast]);
  useEffect(() => { loadAccessRules(); }, [loadAccessRules]);

  const updateAccessRule = (index, patch) => setRuleDataDraft((prev) => prev ? ({ ...prev, access_rules: prev.access_rules.map((rule, idx) => idx === index ? { ...rule, ...patch } : rule) }) : prev);
  const handleSave = async () => {
    if (!ruleDataDraft || !referenceData) return;
    try {
      setSaving(true);
      const payload = normalizeRuleData(ruleDataDraft, referenceData);
      const res = await updateMyRuleData(payload);
      if (!Array.isArray(res?.rule_data?.access_rules)) throw new Error("Saved access rules response is incomplete");
      setRuleDataDraft(normalizeRuleData(res.rule_data, referenceData));
      showToast({ type: "success", message: "Access rules saved" });
    } catch { showToast({ type: "error", message: "Failed to save access rules" }); }
    finally { setSaving(false); }
  };
  const rules = ruleDataDraft?.access_rules || [];

  return (
    <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col">
      <PageHeader title="Settings" subtitle="Manage module visibility and role access." rightContent={<Button icon={ShieldCheck} onClick={handleSave} disabled={loading || saving || Boolean(loadError) || !ruleDataDraft}>{saving ? "Saving..." : "Save Access Rules"}</Button>} />
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-300 bg-white">
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:px-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-gray-300 bg-white text-gray-600"><ShieldCheck size={17} /></span>
          <div><h2 className="text-sm font-semibold text-gray-800">Access Rules</h2><p className="mt-0.5 text-xs text-gray-400">Choose where each registered module appears and which roles can open it.</p></div>
          <span className="ml-auto hidden text-xs text-gray-400 sm:block">{rules.length} modules</span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading ? <div className="py-12 text-center text-sm text-gray-400">Loading access rules from database...</div> : loadError ? <div className="py-12 text-center"><p className="text-sm font-medium text-red-600">Access rules could not be loaded.</p><p className="mt-1 text-xs text-gray-400">{loadError}</p><Button className="mt-4" size="sm" variant="secondary" outline onClick={loadAccessRules}>Retry</Button></div> : <div className="divide-y divide-gray-200">{rules.map((rule, index) => {
            const item = BUSINESS_ACCESS_ITEMS_MAP.get(rule.key);
            const Icon = getModuleMeta(rule.key)?.icon || Box;
            return <div key={`access-rule-${rule.key}`} className="px-5 py-4 transition-colors hover:bg-gray-50/70 sm:px-6"><div className="flex flex-col gap-4 lg:flex-row lg:items-center"><div className="flex min-w-0 flex-1 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600"><Icon size={18} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800">{rule.label || item?.label || rule.key}</p><p className="mt-0.5 truncate text-xs text-gray-400">{item?.path || rule.key}</p></div></div><div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end"><RuleCheckbox checked={rule.show_in_sidebar !== false} onChange={(value) => updateAccessRule(index, { show_in_sidebar: value })} label="Sidebar" id={`sidebar-${rule.key}`} /><span className="hidden h-5 w-px bg-gray-200 sm:block" />{availableUserRoles.map((role) => <RuleCheckbox key={`${rule.key}-${role}`} checked={(rule.roles || []).includes(role)} onChange={(value) => { const current = new Set(rule.roles || []); value ? current.add(role) : current.delete(role); updateAccessRule(index, { roles: Array.from(current) }); }} label={role} id={`role-${rule.key}-${role}`} />)}</div></div></div>;
          })}</div>}
        </div>
      </section>
    </div>
  );
}
