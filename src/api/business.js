// api/business.js
import { apiClient } from "./apiClient";
import {
  createBusinessLocalFirst,
  fetchBusinessesLocalFirst,
  fetchBusinessStatsLocalFirst,
  toggleBusinessStatusLocalFirst,
  updateBusinessLocalFirst,
} from "../offline/adminEntitiesLocalFirst";
import {
  fetchBusinessLocalFirst,
  fetchMyInvoiceBannerLocalFirst,
  fetchMyMachineOptionsLocalFirst,
  fetchMyReferenceDataLocalFirst,
  updateMyInvoiceBannerLocalFirst,
  updateMyMachineOptionsLocalFirst,
  updateMyReferenceDataLocalFirst,
  fetchMyInvoiceCounterLocalFirst,
  updateMyInvoiceCounterLocalFirst,
  fetchMyRuleDataLocalFirst,
  updateMyRuleDataLocalFirst,
} from "../offline/businessLocalFirst";

export const fetchBusinesses = async (params = {}) => {
  const res = await apiClient.get("/businesses", { params });
  return res.data;
};

export const fetchBusinessStats = async () => {
  const res = await apiClient.get("/businesses/stats");
  return res.data;
};

export const fetchBusiness = async (id) => {
  return fetchBusinessLocalFirst(id);
};

export const createBusiness = async (data) => {
  return createBusinessLocalFirst(data);
};

export const updateBusiness = async (id, data) => {
  return updateBusinessLocalFirst(id, data);
};

export const toggleBusinessStatus = async (id) => {
  return toggleBusinessStatusLocalFirst(id);
};

export const fetchMyInvoiceBanner = async () => {
  const res = await apiClient.get("/businesses/me/invoice-banner");
  return res.data;
};

export const updateMyInvoiceBanner = async (invoice_banner_data) => {
  const res = await apiClient.patch("/businesses/me/invoice-banner", { invoice_banner_data });
  return res.data;
};

export const fetchMyMachineOptions = async () => {
  const res = await apiClient.get("/businesses/me/machine-options");
  return res.data;
};

export const updateMyMachineOptions = async (machine_options) => {
  const res = await apiClient.patch("/businesses/me/machine-options", { machine_options });
  return res.data;
};

export const fetchMyReferenceData = async () => {
  const res = await apiClient.get("/businesses/me/reference-data");
  return res.data;
};

export const updateMyReferenceData = async (reference_data) => {
  const res = await apiClient.patch("/businesses/me/reference-data", { reference_data });
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

export const updateMyInvoiceCounter = async (payload) => {
  const res = await apiClient.patch("/businesses/me/invoice-counter", payload);
  return res.data;
};
