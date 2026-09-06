import { normalizeAccessRules } from "./accessConfig";

export const normalizeRuleData = (raw = {}, referenceData = {}) => ({
  access_rules: normalizeAccessRules(
    Array.isArray(raw?.access_rules) ? raw.access_rules : [],
    Array.isArray(referenceData?.user_roles) ? referenceData.user_roles : []
  ),
});

export const getAccessRules = (ruleData, referenceData = {}) =>
  normalizeRuleData(ruleData, referenceData).access_rules;
