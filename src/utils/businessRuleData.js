import { defaultAccessRules, normalizeAccessRules } from "./accessConfig";

export const normalizeRuleData = (raw = {}, referenceData = {}) => ({
  access_rules: normalizeAccessRules(
    raw?.access_rules || defaultAccessRules(referenceData?.user_roles || []),
    referenceData?.user_roles || []
  ),
});

export const getAccessRules = (ruleData, referenceData = {}) =>
  normalizeRuleData(ruleData, referenceData).access_rules;
