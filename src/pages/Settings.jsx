import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ShieldCheck, SlidersHorizontal } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import { useToast } from "../context/ToastContext";
import { fetchMyReferenceData, fetchMyRuleData, updateMyRuleData } from "../api/business";
import { normalizeRuleData } from "../utils/businessRuleData";
import { BUSINESS_ACCESS_ITEMS, defaultAccessRules, normalizeBusinessUserRoles } from "../utils/accessConfig";
import Checkbox from "../components/Checkbox";
import { getModuleMeta } from "../config/modules";

const emptyReferenceData = () => ({ user_roles: normalizeBusinessUserRoles([]) });
const emptyRuleData = () => ({ access_rules: defaultAccessRules() });
function RuleCheckbox({ checked, onChange, label, id }) { return <Checkbox id={id} checked={checked} onChange={onChange} label={label} />; }

export default function SettingsPage() {
  const { showToast } = useToast();
  const [referenceData, setReferenceData] = useState(emptyReferenceData());
  const [ruleDataDraft, setRuleDataDraft] = useState(emptyRuleData());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const availableUserRoles = useMemo(() => normalizeBusinessUserRoles(referenceData.user_roles || []), [referenceData.user_roles]);
  const loadAccessRules = useCallback(async () => {
    try {
      setLoading(true);
      const [referenceRes, ruleRes] = await Promise.all([fetchMyReferenceData(), fetchMyRuleData()]);
      const nextReference = { ...emptyReferenceData(), ...(referenceRes?.reference_data || {}) };
      const normalized = normalizeRuleData({ ...(ruleRes?.rule_data || {}), access_rules: ruleRes?.rule_data?.access_rules || defaultAccessRules(nextReference.user_roles) }, nextReference);
      setReferenceData(nextReference);
      setRuleDataDraft({ ...normalized, access_rules: normalized.access_rules || defaultAccessRules(nextReference.user_roles) });
    } catch { showToast({ type: "error", message: "Failed to load access rules" }); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { loadAccessRules(); }, [loadAccessRules]);

  const updateAccessRule = (index, patch) => setRuleDataDraft((prev) => {
    const currentRules = prev.access_rules || defaultAccessRules(referenceData.user_roles);
    return { ...prev, access_rules: currentRules.map((rule, idx) => idx === index ? { ...rule, ...patch } : rule) };
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = normalizeRuleData(ruleDataDraft, referenceData);
      const res = await updateMyRuleData(payload);
      setRuleDataDraft(normalizeRuleData(res?.rule_data || payload, referenceData));
      showToast({ type: "success", message: "Access rules saved" });
    } catch { showToast({ type: "error", message: "Failed to save access rules" }); }
    finally { setSaving(false); }
  };

  const rules = ruleDataDraft.access_rules || defaultAccessRules(referenceData.user_roles);

  return (
    <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col">
      <PageHeader title="Settings" subtitle="Manage module visibility and role access." rightContent={<Button icon={ShieldCheck} onClick={handleSave} disabled={loading || saving}>{saving ? "Saving..." : "Save Access Rules"}</Button>} />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8">
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="overflow-hidden rounded-3xl border border-gray-300 bg-white">
            <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-5 py-4 sm:px-6">
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-gray-300 bg-white text-gray-600"><ShieldCheck size={17} /></span>
              <div><h2 className="text-sm font-semibold text-gray-800">Access Rules</h2><p className="mt-0.5 text-xs text-gray-400">Choose where each module appears and which roles can open it.</p></div>
              <span className="ml-auto hidden text-xs text-gray-400 sm:block">{rules.length} modules</span>
            </div>

            {loading ? <div className="py-12 text-center text-sm text-gray-400">Loading access rules...</div> : (
              <div className="divide-y divide-gray-200">
                {rules.map((rule, index) => {
                  const item = BUSINESS_ACCESS_ITEMS.find((entry) => entry.key === rule.key);
                  const meta = getModuleMeta(rule.key);
                  const Icon = meta?.icon || Box;
                  return (
                    <div key={`access-rule-${rule.key}`} className="px-5 py-4 transition-colors hover:bg-gray-50/70 sm:px-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600"><Icon size={18} /></span>
                          <div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800">{rule.label || item?.label || rule.key}</p><p className="mt-0.5 truncate text-xs text-gray-400">{item?.path || rule.key}</p></div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end">
                          <RuleCheckbox checked={rule.show_in_sidebar !== false} onChange={(value) => updateAccessRule(index, { show_in_sidebar: value })} label="Sidebar" id={`sidebar-${rule.key}`} />
                          <span className="hidden h-5 w-px bg-gray-200 sm:block" />
                          {availableUserRoles.map((role) => <RuleCheckbox key={`${rule.key}-${role}`} checked={(rule.roles || []).includes(role)} onChange={(value) => { const current = new Set(rule.roles || []); if (value) current.add(role); else current.delete(role); updateAccessRule(index, { roles: Array.from(current) }); }} label={role} id={`role-${rule.key}-${role}`} />)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4 xl:sticky xl:top-0">
            <div className="rounded-3xl border border-gray-300 bg-white p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-gray-200 bg-gray-50 text-gray-600"><SlidersHorizontal size={18} /></span>
              <h3 className="mt-4 text-sm font-semibold text-gray-900">How access works</h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">Sidebar controls visibility. Role access controls whether that user type can open the module. Save once after making your changes.</p>
            </div>
            <div className="rounded-3xl border border-gray-300 bg-gray-50 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Tip</p>
              <p className="mt-2 text-sm leading-5 text-gray-600">Keep only daily-use modules in the sidebar. Everything else remains available from Menu when the role has access.</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
