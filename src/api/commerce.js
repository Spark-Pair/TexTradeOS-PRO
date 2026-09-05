import apiClient from "./apiClient";

const unwrap = (response) => response?.data?.data ?? response?.data;

export const fetchCustomers = async () => unwrap(await apiClient.get("/customers"));
export const createCustomer = async (payload) => unwrap(await apiClient.post("/customers", payload));
export const updateCustomer = async (id, payload) => unwrap(await apiClient.put(`/customers/${id}`, payload));
export const toggleCustomer = async (id) => unwrap(await apiClient.patch(`/customers/${id}/toggle-status`));

export const fetchSuppliers = async () => unwrap(await apiClient.get("/suppliers"));
export const createSupplier = async (payload) => unwrap(await apiClient.post("/suppliers", payload));
export const updateSupplier = async (id, payload) => unwrap(await apiClient.put(`/suppliers/${id}`, payload));
export const toggleSupplier = async (id) => unwrap(await apiClient.patch(`/suppliers/${id}/toggle-status`));

export const fetchPurchases = async () => unwrap(await apiClient.get("/purchases"));
export const fetchPurchase = async (id) => unwrap(await apiClient.get(`/purchases/${id}`));
export const createPurchase = async (payload) => unwrap(await apiClient.post("/purchases", payload));
export const updatePurchase = async (id, payload) => unwrap(await apiClient.put(`/purchases/${id}`, payload));
export const removePurchase = async (id) => unwrap(await apiClient.delete(`/purchases/${id}`));
export const fetchPurchaseArticleUsage = async (articleNo, purchaseNumber) => unwrap(await apiClient.get(
  `/purchases/articles/${encodeURIComponent(articleNo)}/usage`,
  { params: { purchase_number: purchaseNumber } },
));

export const fetchInventory = async () => unwrap(await apiClient.get("/inventory"));
export const fetchInventoryMovements = async (articleNo, purchaseNumber) => unwrap(await apiClient.get(
  `/inventory/${encodeURIComponent(articleNo)}/movements`,
  { params: { purchase_number: purchaseNumber } },
));
