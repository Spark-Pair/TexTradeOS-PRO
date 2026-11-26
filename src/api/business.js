import { apiClient } from "./apiClient";

const ACCESS_CACHE_MS = 60_000;
const accessCache = {
  reference: { value: null, expiresAt: 0, request: null },
  rules: { value: null, expiresAt: 0, request: null },
};
let accessCacheSessionId = null;

const fetchCachedAccessData = (key, url) => {
  const sessionId = localStorage.getItem("sessionId");
  if (sessionId !== accessCacheSessionId) {
    Object.values(accessCache).forEach((entry) => {
      entry.value = null;
      entry.expiresAt = 0;
      entry.request = null;
    });
    accessCacheSessionId = sessionId;
  }
  const entry = accessCache[key];
  if (entry.value && entry.expiresAt > Date.now()) return Promise.resolve(entry.value);
  if (entry.request) return entry.request;
  entry.request = apiClient.get(url).then(({ data }) => {
    entry.value = data;
    entry.expiresAt = Date.now() + ACCESS_CACHE_MS;
    return data;
  }).finally(() => { entry.request = null; });
  return entry.request;
};

const clearAccessCache = () => {
  Object.values(accessCache).forEach((entry) => {
    entry.value = null;
    entry.expiresAt = 0;
  });
};

export const fetchMyBusiness = async () => (await apiClient.get("/businesses/me")).data;
export const updateMyBusiness = async (business) => (await apiClient.patch("/businesses/me", { business })).data;

export const fetchMyReferenceData = async () => {
  return fetchCachedAccessData("reference", "/businesses/me/reference-data");
};

export const updateMyReferenceData = async (reference_data) => {
  const res = await apiClient.patch("/businesses/me/reference-data", { reference_data });
  clearAccessCache();
  return res.data;
};

export const fetchMyRuleData = async () => {
  return fetchCachedAccessData("rules", "/businesses/me/rule-data");
};

export const updateMyRuleData = async (rule_data) => {
  const res = await apiClient.patch("/businesses/me/rule-data", { rule_data });
  clearAccessCache();
  return res.data;
};

export const fetchMyInvoiceCounter = async (params = {}) => {
  const res = await apiClient.get("/businesses/me/invoice-counter", { params });
  return res.data;
};
