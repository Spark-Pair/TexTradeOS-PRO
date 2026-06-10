import { apiClient } from "./apiClient";
import { fetchDashboardSummaryLocalFirst } from "../offline/dashboardLocalFirst";

export const fetchDashboardSummary = (params) => fetchDashboardSummaryLocalFirst(params);

export const fetchDashboardTrend = async (params = {}) => {
  const res = await apiClient.get("/dashboard/trend", { params });
  return res.data;
};
