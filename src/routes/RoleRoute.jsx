import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { fetchMyReferenceData, fetchMyRuleData } from "../api/business";
import { hasAccessForRole } from "../utils/accessConfig";

export default function RoleRoute({ allow, accessKey, children }) {
  const { user, loading } = useAuth();
  const [referenceData, setReferenceData] = useState(null);
  const [ruleData, setRuleData] = useState(null);
  const [accessLoading, setAccessLoading] = useState(Boolean(accessKey));
  const [accessFailed, setAccessFailed] = useState(false);

  useEffect(() => {
    if (!accessKey || !user || user.role === "developer") {
      setAccessLoading(false);
      setAccessFailed(false);
      return;
    }
    let isMounted = true;

    const loadAccessData = async () => {
      try {
        setAccessLoading(true);
        setAccessFailed(false);
        const [referenceRes, ruleRes] = await Promise.all([
          fetchMyReferenceData(),
          fetchMyRuleData(),
        ]);
        if (!isMounted) return;
        setReferenceData(referenceRes?.reference_data || {});
        setRuleData(ruleRes?.rule_data || {});
      } catch {
        if (!isMounted) return;
        setReferenceData(null);
        setRuleData(null);
        setAccessFailed(true);
      } finally {
        if (isMounted) setAccessLoading(false);
      }
    };

    loadAccessData();
    return () => {
      isMounted = false;
    };
  }, [user, accessKey]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (accessKey && user.role === "developer") return children;
  if (Array.isArray(allow) && allow.includes(user.role)) return children;
  if (!accessKey && !Array.isArray(allow)) return children;
  if (accessKey && user.role !== "developer") {
    if (accessLoading) return null;
    if (accessFailed || !referenceData || !ruleData) return <Navigate to="/dashboard" replace />;
    if (hasAccessForRole(ruleData, referenceData, accessKey, user.role)) return children;
  }
  if (!accessKey && Array.isArray(allow) && !allow.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
