import { apiClient } from "./apiClient";

export const fetchDashboardTrend = async (params = {}) => {
  const res = await apiClient.get("/dashboard/trend", { params });
  return res.data;
};
export const fetchDashboardSummary = async (params = {}) => {
  const res = await apiClient.get("/dashboard/summary", { params });
  return res.data;
};
