import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import { useToast } from "../context/ToastContext";
import { fetchMyReferenceData, fetchMyRuleData, updateMyRuleData } from "../api/business";
import { normalizeRuleData } from "../utils/businessRuleData";
import {
  BUSINESS_ACCESS_ITEMS,
  defaultAccessRules,
  normalizeBusinessUserRoles,
} from "../utils/accessConfig";
import useAuth from "../hooks/useAuth";
import SystemManagement from "../components/SystemManagement";

const emptyReferenceData = () => ({
  user_roles: normalizeBusinessUserRoles([]),
});

const emptyRuleData = () => ({
  access_rules: defaultAccessRules(),
});

function RuleCheckbox({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-gray-700">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-400"
      />
      <span>{label}</span>
    </label>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [referenceData, setReferenceData] = useState(emptyReferenceData());
  const [ruleDataDraft, setRuleDataDraft] = useState(emptyRuleData());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const availableUserRoles = useMemo(
    () => normalizeBusinessUserRoles(referenceData.user_roles || []),
    [referenceData.user_roles]
  );

  const loadAccessRules = useCallback(async () => {
    try {
      setLoading(true);
      const [referenceRes, ruleRes] = await Promise.all([
        fetchMyReferenceData(),
        fetchMyRuleData(),
      ]);
      const nextReference = {
        ...emptyReferenceData(),
        ...(referenceRes?.reference_data || {}),
      };
      const normalized = normalizeRuleData(
        {
          ...(ruleRes?.rule_data || {}),
          access_rules: ruleRes?.rule_data?.access_rules || defaultAccessRules(nextReference.user_roles),
        },
        nextReference
      );

      setReferenceData(nextReference);
      setRuleDataDraft({
        ...normalized,
        access_rules: normalized.access_rules || defaultAccessRules(nextReference.user_roles),
      });
    } catch {
      showToast({ type: "error", message: "Failed to load access rules" });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAccessRules();
  }, [loadAccessRules]);

  const updateAccessRule = (index, patch) => {
    setRuleDataDraft((prev) => {
      const currentRules = prev.access_rules || defaultAccessRules(referenceData.user_roles);
      return {
        ...prev,
        access_rules: currentRules.map((rule, idx) =>
          idx === index ? { ...rule, ...patch } : rule
        ),
      };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = normalizeRuleData(ruleDataDraft, referenceData);
      const res = await updateMyRuleData(payload);
      const savedRules = normalizeRuleData(res?.rule_data || payload, referenceData);
      setRuleDataDraft(savedRules);
      showToast({ type: "success", message: "Access rules saved" });
    } catch {
      showToast({ type: "error", message: "Failed to save access rules" });
    } finally {
      setSaving(false);
    }
  };

  const rules = ruleDataDraft.access_rules || defaultAccessRules(referenceData.user_roles);

  return (
    <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col">
      <PageHeader
        title="Settings"
        subtitle="Access Rules"
        actionLabel="Save Access Rules"
        actionIcon={ShieldCheck}
        onAction={handleSave}
      />

      <div className="rounded-3xl bg-white border border-gray-300 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-300 bg-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-gray-200">
              <ShieldCheck size={17} className="text-gray-500" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Access Rules</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Control which roles can open each remaining page.
              </p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">Loading access rules...</div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, index) => {
                const item = BUSINESS_ACCESS_ITEMS.find((entry) => entry.key === rule.key);
                return (
                  <div key={`access-rule-${rule.key}`} className="rounded-2xl border border-gray-300 bg-white p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {rule.label || item?.label || rule.key}
                        </p>
                        <p className="text-xs text-gray-400">{item?.path || rule.key}</p>
                      </div>
                      <RuleCheckbox
                        checked={rule.show_in_sidebar !== false}
                        onChange={(value) => updateAccessRule(index, { show_in_sidebar: value })}
                        label="Show in sidebar"
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4">
                      {availableUserRoles.map((role) => (
                        <RuleCheckbox
                          key={`${rule.key}-${role}`}
                          checked={(rule.roles || []).includes(role)}
                          onChange={(value) => {
                            const current = new Set(rule.roles || []);
                            if (value) current.add(role);
                            else current.delete(role);
                            updateAccessRule(index, { roles: Array.from(current) });
                          }}
                          label={role}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {(user?.role === "developer" || user?.role === "admin") && <SystemManagement />}
    </div>
  );
}
