import { v4 as uuidv4 } from "uuid";
import { apiClient } from "../api/apiClient";

// Transitional compatibility layer. Business records live on the backend only.
// This cache is memory-only and is discarded on refresh; localStorage/demo data is intentionally not used.
const cache = {
  suppliers: [],
  customers: [],
  purchases: [],
  invoices: [],
};

const nowIso = () => new Date().toISOString();
const normalizeText = (value) => String(value || "").trim();
const newestFirst = (rows, dateFields = []) => [...rows].sort((left, right) => {
  for (const field of ["createdAt", ...dateFields]) {
    const leftTime = new Date(left?.[field] || 0).getTime() || 0;
    const rightTime = new Date(right?.[field] || 0).getTime() || 0;
    if (rightTime !== leftTime) return rightTime - leftTime;
  }
  return 0;
});

const replaceCollection = (collection, records) => {
  cache[collection] = Array.isArray(records) ? records : [];
  return cache[collection];
};

const pushSharedCollection = async (collection) => {
  const { data } = await apiClient.put(`/shared-data/${collection}`, { records: cache[collection] });
  replaceCollection(collection, data?.data);
  return cache[collection];
};

export const syncPrototypeData = async () => {
  const [{ data: sharedResponse }, invoiceResponse] = await Promise.all([
    apiClient.get("/shared-data"),
    apiClient.get("/invoices/shared-ledger"),
  ]);
  const shared = sharedResponse?.data || {};
  replaceCollection("suppliers", shared.suppliers);
  replaceCollection("customers", shared.customers);
  replaceCollection("purchases", shared.purchases);
  replaceCollection("invoices", invoiceResponse?.data?.data);
  return cache;
};

export const listSuppliers = () => newestFirst(cache.suppliers);
export const listCustomers = () => newestFirst(cache.customers);
export const listPurchases = () => newestFirst(cache.purchases, ["purchase_date"]);
export const listPrototypeInvoices = () => newestFirst(cache.invoices, ["invoice_date"]);

export const saveSupplier = (payload) => {
  const rows = listSuppliers();
  const id = payload._id || uuidv4();
  const existing = rows.find((row) => row._id === id);
  const record = {
    _id: id,
    supplier_name: normalizeText(payload.supplier_name),
    person_name: normalizeText(payload.person_name),
    urdu_title: normalizeText(payload.urdu_title),
    phone_number: normalizeText(payload.phone_number),
    address: normalizeText(payload.address),
    city: normalizeText(payload.city),
    isActive: payload.isActive ?? true,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  replaceCollection("suppliers", existing ? rows.map((row) => row._id === id ? record : row) : [record, ...rows]);
  void pushSharedCollection("suppliers");
  return record;
};

export const toggleSupplierStatus = (id) => {
  replaceCollection("suppliers", listSuppliers().map((row) => row._id === id ? { ...row, isActive: !row.isActive, updatedAt: nowIso() } : row));
  void pushSharedCollection("suppliers");
  return cache.suppliers.find((row) => row._id === id) || null;
};

export const saveCustomer = (payload) => {
  const rows = listCustomers();
  const id = payload._id || uuidv4();
  const existing = rows.find((row) => row._id === id);
  const record = {
    _id: id,
    customer_name: normalizeText(payload.customer_name),
    person_name: normalizeText(payload.person_name),
    urdu_title: normalizeText(payload.urdu_title),
    phone_number: normalizeText(payload.phone_number),
    address: normalizeText(payload.address),
    city: normalizeText(payload.city),
    isActive: payload.isActive ?? true,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  replaceCollection("customers", existing ? rows.map((row) => row._id === id ? record : row) : [record, ...rows]);
  void pushSharedCollection("customers");
  return record;
};

export const toggleCustomerStatus = (id) => {
  replaceCollection("customers", listCustomers().map((row) => row._id === id ? { ...row, isActive: !row.isActive, updatedAt: nowIso() } : row));
  void pushSharedCollection("customers");
  return cache.customers.find((row) => row._id === id) || null;
};

const nextPurchaseNumber = (rows, year) => {
  const nextSeq = rows.reduce((max, row) => {
    const match = String(row.purchase_number || "").match(/^P-(\d{4})-(\d+)$/);
    return match && Number(match[1]) === Number(year) ? Math.max(max, Number(match[2]) || 0) : max;
  }, 0) + 1;
  return `P-${year}-${String(nextSeq).padStart(4, "0")}`;
};

export const nextArticleNumber = (_purchaseNumber, index = 0) => {
  const highest = cache.purchases.reduce((max, purchase) => Math.max(max, ...(purchase.articles || []).map((article) => Number(String(article.article_no || "").match(/^ART-(\d+)$/i)?.[1] || 0))), 0);
  return `ART-${String(highest + Number(index || 0) + 1).padStart(5, "0")}`;
};

export const savePurchase = (payload) => {
  const rows = listPurchases();
  const id = payload._id || uuidv4();
  const existing = rows.find((row) => row._id === id);
  const year = new Date(payload.purchase_date || Date.now()).getFullYear();
  const purchaseNumber = existing?.purchase_number || nextPurchaseNumber(rows, year);
  const articles = (payload.articles || []).map((article, index) => {
    const articleNo = article.article_no && !String(article.article_no).includes("-PREVIEW") ? article.article_no : nextArticleNumber(purchaseNumber, index);
    const existingArticle = existing?.articles?.find((item) => item.article_no === articleNo);
    return { ...article, article_no: articleNo, qr_id: article.qr_id || existingArticle?.qr_id || uuidv4() };
  });
  const record = {
    ...payload,
    _id: id,
    purchase_number: purchaseNumber,
    articles,
    article_count: articles.length,
    packet_count: articles.reduce((sum, article) => sum + Number(article.quantity_pkt || 0), 0),
    total_amount: articles.reduce((sum, article) => sum + Number(article.amount || 0), 0),
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  replaceCollection("purchases", existing ? rows.map((row) => row._id === id ? record : row) : [record, ...rows]);
  void pushSharedCollection("purchases");
  return record;
};

export const deletePurchase = (id) => {
  replaceCollection("purchases", listPurchases().filter((row) => row._id !== id));
  void pushSharedCollection("purchases");
};

// Invoices are persisted by /api/invoices. These helpers only keep the memory view used by inventory in sync.
export const savePrototypeInvoice = (payload) => {
  const rows = listPrototypeInvoices();
  const existing = rows.find((row) => row._id === payload._id || row.invoice_number === payload.invoice_number);
  const record = { ...payload, _id: existing?._id || payload._id || uuidv4(), createdAt: existing?.createdAt || nowIso(), updatedAt: nowIso() };
  replaceCollection("invoices", existing ? rows.map((row) => row._id === existing._id ? record : row) : [record, ...rows]);
  return record;
};

export const deletePrototypeInvoice = (invoice) => {
  replaceCollection("invoices", listPrototypeInvoices().filter((row) => row._id !== invoice?._id && row.invoice_number !== invoice?.invoice_number));
};

// Kept temporarily for import compatibility. It deliberately does not seed or migrate browser data.
export const ensurePrototypeDemoData = () => {};
