import { apiClient } from "./apiClient";

export const fetchInvoiceOrderGroups = async (params = {}) => {
  const res = await apiClient.get("/invoices/order-groups", { params });
  return res.data;
};

export const fetchInvoices = async (params = {}) => {
  const res = await apiClient.get("/invoices", { params });
  return res.data;
};

export const fetchInvoice = async (id) => {
  const res = await apiClient.get(`/invoices/${id}`);
  return res.data;
};

export const createInvoice = async (data) => {
  const res = await apiClient.post("/invoices", data);
  return res.data;
};

export const deleteInvoice = async (id) => {
  const res = await apiClient.delete(`/invoices/${id}`);
  return res.data;
};
