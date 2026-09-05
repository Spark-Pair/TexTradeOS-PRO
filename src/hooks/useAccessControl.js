import { useEffect, useMemo, useState } from "react";
import { fetchMyReferenceData, fetchMyRuleData } from "../api/business";
import { BUSINESS_ACCESS_ITEMS, hasAccessForRole } from "../utils/accessConfig";

/** Shared permission/reference-data loader for navigation and permission-aware UI. */
export default function useAccessControl(user) {
  const [referenceData, setReferenceData] = useState(null);
  const [ruleData, setRuleData] = useState(null);
  const [loading, setLoading] = useState(Boolean(user && user.role !== "developer"));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user || user.role === "developer") {
      setReferenceData(null);
      setRuleData(null);
      setError(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchMyReferenceData(),
      fetchMyRuleData(),
    ]).then(([referenceResponse, ruleResponse]) => {
      if (!active) return;
      setReferenceData(referenceResponse?.reference_data || {});
      setRuleData(ruleResponse?.rule_data || {});
    }).catch((requestError) => {
      if (!active) return;
      setReferenceData(null);
      setRuleData(null);
      setError(requestError);
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [user]);

  const accessReady = user?.role === "developer" || (!loading && !error && referenceData && ruleData);
  const canAccess = (key) => user?.role === "developer" || Boolean(accessReady && hasAccessForRole(ruleData, referenceData, key, user?.role));

  const accessibleModules = useMemo(() => {
    if (user?.role === "developer") return BUSINESS_ACCESS_ITEMS;
    if (!accessReady) return [];
    return BUSINESS_ACCESS_ITEMS.filter((item) => hasAccessForRole(ruleData, referenceData, item.key, user?.role));
  }, [accessReady, referenceData, ruleData, user?.role]);

  return { referenceData, ruleData, loading, error, accessReady, canAccess, accessibleModules };
}
