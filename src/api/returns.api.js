import { apiClient } from "./apiClient";

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];

export async function fetchSalesReturnable(customerId) {
  if (!customerId) return [];
  const response = await apiClient.get(`/returns/sales/returnable/${encodeURIComponent(customerId)}`);
  return unwrap(response);
}

export async function fetchReturns(type) {
  const response = await apiClient.get(`/returns/${type}`);
  return unwrap(response);
}

export async function createReturn(type, payload) {
  const response = await apiClient.post(`/returns/${type}`, payload);
  return unwrap(response);
}

export async function removeReturn(type, id) {
  return apiClient.delete(`/returns/${type}/${id}`);
}
