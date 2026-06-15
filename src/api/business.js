import { apiClient } from "./apiClient";

export const fetchMyReferenceData = async () => {
  const res = await apiClient.get("/businesses/me/reference-data");
  return res.data;
};

export const fetchMyRuleData = async () => {
  const res = await apiClient.get("/businesses/me/rule-data");
  return res.data;
};

export const updateMyRuleData = async (rule_data) => {
  const res = await apiClient.patch("/businesses/me/rule-data", { rule_data });
  return res.data;
};

export const fetchMyInvoiceCounter = async (params = {}) => {
  const res = await apiClient.get("/businesses/me/invoice-counter", { params });
  return res.data;
};
