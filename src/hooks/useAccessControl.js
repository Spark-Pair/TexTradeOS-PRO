import { useEffect, useMemo, useState } from "react";
import { fetchMyReferenceData, fetchMyRuleData } from "../api/business";
import { BUSINESS_ACCESS_ITEMS, hasAccessForRole } from "../utils/accessConfig";

/** Shared permission/reference-data loader for navigation and permission-aware UI. */
export default function useAccessControl(user) {
  const [referenceData, setReferenceData] = useState({});
  const [ruleData, setRuleData] = useState({});
  const [loading, setLoading] = useState(Boolean(user && user.role !== "developer"));

  useEffect(() => {
    if (!user || user.role === "developer") {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      fetchMyReferenceData().catch(() => ({ reference_data: {} })),
      fetchMyRuleData().catch(() => ({ rule_data: {} })),
    ]).then(([referenceResponse, ruleResponse]) => {
      if (!active) return;
      setReferenceData(referenceResponse?.reference_data || {});
      setRuleData(ruleResponse?.rule_data || {});
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user]);

  const canAccess = (key) => user?.role === "developer" || hasAccessForRole(ruleData, referenceData, key, user?.role);

  const accessibleModules = useMemo(() => (
    user?.role === "developer"
      ? BUSINESS_ACCESS_ITEMS
      : BUSINESS_ACCESS_ITEMS.filter((item) => hasAccessForRole(ruleData, referenceData, item.key, user?.role))
  ), [referenceData, ruleData, user?.role]);

  return { referenceData, ruleData, loading, canAccess, accessibleModules };
}
