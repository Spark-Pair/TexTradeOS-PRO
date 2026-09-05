import { v4 as uuidv4 } from "uuid";
import { apiClient } from "../api/apiClient";

const SUPPLIERS_KEY = "textradeos_prototype_suppliers";
const CUSTOMERS_KEY = "textradeos_prototype_customers";
const PURCHASES_KEY = "textradeos_prototype_purchases";
const INVOICES_KEY = "textradeos_prototype_invoices";
const DEMO_SEEDED_KEY = "textradeos_prototype_demo_seeded_v1";

const readJson = (key, fallback = []) => {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const nowIso = () => new Date().toISOString();

const COLLECTION_KEYS = {
  suppliers: SUPPLIERS_KEY,
  customers: CUSTOMERS_KEY,
  purchases: PURCHASES_KEY,
};

const pushSharedCollection = (collection, records) => {
  void apiClient.put(`/shared-data/${collection}`, { records }).catch(() => {});
};

export const syncPrototypeData = async () => {
  const [{ data: sharedResponse }, invoiceResponse] = await Promise.all([
    apiClient.get("/shared-data"),
    apiClient.get("/invoices/shared-ledger"),
  ]);
  const shared = sharedResponse?.data || {};
  await Promise.all(Object.entries(COLLECTION_KEYS).map(async ([collection, key]) => {
    const serverRecords = Array.isArray(shared[collection]) ? shared[collection] : [];
    const localRecords = readJson(key);
    if (serverRecords.length) writeJson(key, serverRecords);
    else if (localRecords.length) await apiClient.put(`/shared-data/${collection}`, { records: localRecords });
  }));
  const invoices = invoiceResponse?.data?.data;
  if (Array.isArray(invoices)) writeJson(INVOICES_KEY, invoices);
};

const normalizeText = (value) => String(value || "").trim();

const newestFirst = (rows, dateFields = []) => [...rows].sort((left, right) => {
  for (const field of ["createdAt", ...dateFields]) {
    const leftTime = new Date(left?.[field] || 0).getTime() || 0;
    const rightTime = new Date(right?.[field] || 0).getTime() || 0;
    if (rightTime !== leftTime) return rightTime - leftTime;
  }
  return 0;
});

export const listSuppliers = () => newestFirst(readJson(SUPPLIERS_KEY));

export const saveSupplier = (payload) => {
  const rows = listSuppliers();
  const id = payload._id || uuidv4();
  const existing = rows.find((row) => row._id === id);
  const nextSupplier = {
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
  const nextRows = existing
    ? rows.map((row) => (row._id === id ? nextSupplier : row))
    : [nextSupplier, ...rows];
  writeJson(SUPPLIERS_KEY, nextRows);
  pushSharedCollection("suppliers", nextRows);
  return nextSupplier;
};

export const toggleSupplierStatus = (id) => {
  const rows = listSuppliers();
  const nextRows = rows.map((row) =>
    row._id === id ? { ...row, isActive: !row.isActive, updatedAt: nowIso() } : row
  );
  writeJson(SUPPLIERS_KEY, nextRows);
  pushSharedCollection("suppliers", nextRows);
  return nextRows.find((row) => row._id === id) || null;
};

export const listCustomers = () => newestFirst(readJson(CUSTOMERS_KEY));

export const saveCustomer = (payload) => {
  const rows = listCustomers();
  const id = payload._id || uuidv4();
  const existing = rows.find((row) => row._id === id);
  const nextCustomer = {
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
  const nextRows = existing
    ? rows.map((row) => (row._id === id ? nextCustomer : row))
    : [nextCustomer, ...rows];
  writeJson(CUSTOMERS_KEY, nextRows);
  pushSharedCollection("customers", nextRows);
  return nextCustomer;
};

export const toggleCustomerStatus = (id) => {
  const rows = listCustomers();
  const nextRows = rows.map((row) =>
    row._id === id ? { ...row, isActive: !row.isActive, updatedAt: nowIso() } : row
  );
  writeJson(CUSTOMERS_KEY, nextRows);
  pushSharedCollection("customers", nextRows);
  return nextRows.find((row) => row._id === id) || null;
};

export const listPurchases = () => newestFirst(readJson(PURCHASES_KEY), ["purchase_date"]);

export const savePurchase = (payload) => {
  const rows = listPurchases();
  const id = payload._id || uuidv4();
  const existing = rows.find((row) => row._id === id);
  const purchaseYear = new Date(payload.purchase_date || Date.now()).getFullYear();
  const purchaseNo = existing?.purchase_number || nextPurchaseNumber(rows, purchaseYear);
  const articles = (payload.articles || []).map((article, index) => {
    const articleNo = article.article_no && !String(article.article_no).includes("-PREVIEW")
      ? article.article_no
      : nextArticleNumber(purchaseNo, index);
    const existingArticle = existing?.articles?.find((item) => item.article_no === articleNo);
    return {
      ...article,
      article_no: articleNo,
      qr_id: article.qr_id || existingArticle?.qr_id || uuidv4(),
    };
  });
  const nextPurchase = {
    ...payload,
    _id: id,
    purchase_number: purchaseNo,
    articles,
    article_count: articles.length,
    packet_count: articles.reduce((sum, article) => sum + Number(article.quantity_pkt || 0), 0),
    total_amount: articles.reduce((sum, article) => sum + Number(article.amount || 0), 0),
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  const nextRows = existing
    ? rows.map((row) => (row._id === id ? nextPurchase : row))
    : [nextPurchase, ...rows];
  writeJson(PURCHASES_KEY, nextRows);
  pushSharedCollection("purchases", nextRows);
  return nextPurchase;
};

export const deletePurchase = (id) => {
  const nextRows = listPurchases().filter((row) => row._id !== id);
  writeJson(PURCHASES_KEY, nextRows);
  pushSharedCollection("purchases", nextRows);
};

export const listPrototypeInvoices = () => newestFirst(readJson(INVOICES_KEY), ["invoice_date"]);

export const savePrototypeInvoice = (payload) => {
  const rows = listPrototypeInvoices();
  const id = payload._id || uuidv4();
  const existing = rows.find((row) => row._id === id || row.invoice_number === payload.invoice_number);
  const nextInvoice = {
    ...payload,
    _id: existing?._id || id,
    createdAt: existing?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
  const nextRows = existing
    ? rows.map((row) => (row._id === existing._id ? nextInvoice : row))
    : [nextInvoice, ...rows];
  writeJson(INVOICES_KEY, nextRows);
  return nextInvoice;
};

export const deletePrototypeInvoice = (invoice) => {
  const invoiceId = invoice?._id;
  const invoiceNumber = invoice?.invoice_number;
  writeJson(INVOICES_KEY, listPrototypeInvoices().filter((row) =>
    row._id !== invoiceId && row.invoice_number !== invoiceNumber
  ));
};

const nextPurchaseNumber = (rows, year) => {
  const nextSeq = rows.reduce((max, row) => {
    const match = String(row.purchase_number || "").match(/^P-(\d{4})-(\d+)$/);
    if (!match || Number(match[1]) !== Number(year)) return max;
    return Math.max(max, Number(match[2]) || 0);
  }, 0) + 1;
  return `P-${year}-${String(nextSeq).padStart(4, "0")}`;
};

export const nextArticleNumber = (_purchaseNumber, index = 0) => {
  const highestArticleSequence = readJson(PURCHASES_KEY).reduce((highest, purchase) =>
    Math.max(highest, ...(purchase.articles || []).map((article) => {
      const match = String(article.article_no || "").match(/^ART-(\d+)$/i);
      return match ? Number(match[1]) : 0;
    })), 0);
  return `ART-${String(highestArticleSequence + Number(index || 0) + 1).padStart(5, "0")}`;
};

const migratePurchaseLinkedArticleNumbers = () => {
  const purchases = readJson(PURCHASES_KEY);
  const legacyNumbers = new Map();
  let sequence = purchases.reduce((highest, purchase) => Math.max(highest,
    ...(purchase.articles || []).map((article) => Number(String(article.article_no || "").match(/^ART-(\d+)$/i)?.[1] || 0))
  ), 0);

  const migratedPurchases = purchases.map((purchase) => ({
    ...purchase,
    articles: (purchase.articles || []).map((article) => {
      const oldNumber = String(article.article_no || "");
      if (!/^\d{6}-\d{2}$/.test(oldNumber)) return article;
      if (!legacyNumbers.has(oldNumber)) legacyNumbers.set(oldNumber, `ART-${String(++sequence).padStart(5, "0")}`);
      return { ...article, article_no: legacyNumbers.get(oldNumber), qr_id: uuidv4() };
    }),
  }));

  if (!legacyNumbers.size) return;
  const migratedInvoices = readJson(INVOICES_KEY).map((invoice) => ({
    ...invoice,
    articles: (invoice.articles || []).map((article) => ({
      ...article,
      article_no: legacyNumbers.get(String(article.article_no || "")) || article.article_no,
    })),
  }));
  writeJson(PURCHASES_KEY, migratedPurchases);
  writeJson(INVOICES_KEY, migratedInvoices);
};

export const ensurePrototypeDemoData = () => {
  if (typeof window === "undefined") return;
  migratePurchaseLinkedArticleNumbers();
  if (window.localStorage.getItem(DEMO_SEEDED_KEY) === "true") return;
  const createdAt = "2026-08-20T10:00:00.000Z";

  if (!listSuppliers().length) {
    writeJson(SUPPLIERS_KEY, [
      { _id: "demo-supplier-1", supplier_name: "Karachi Garments Wholesale", person_name: "Imran Siddiqui", urdu_title: "کراچی گارمنٹس", phone_number: "0300-1234567", address: "Jodia Bazaar", city: "Karachi", isActive: true, createdAt, updatedAt: createdAt },
      { _id: "demo-supplier-2", supplier_name: "Lahore Kids Collection", person_name: "Usman Malik", urdu_title: "لاہور کڈز کلیکشن", phone_number: "0321-7654321", address: "Shah Alam Market", city: "Lahore", isActive: true, createdAt, updatedAt: createdAt },
    ]);
  }

  if (!listCustomers().length) {
    writeJson(CUSTOMERS_KEY, [
      { _id: "demo-customer-1", customer_name: "Al Madina Garments", person_name: "Ahmed Raza", urdu_title: "المدینہ گارمنٹس", phone_number: "0301-1112233", address: "Main Bazaar", city: "Rawalpindi", isActive: true, createdAt, updatedAt: createdAt },
      { _id: "demo-customer-2", customer_name: "Bismillah Kids Wear", person_name: "Bilal Khan", urdu_title: "بسم اللہ کڈز وئیر", phone_number: "0333-4445566", address: "Railway Road", city: "Gujranwala", isActive: true, createdAt, updatedAt: createdAt },
      { _id: "demo-customer-3", customer_name: "City Fashion House", person_name: "Saad Ali", urdu_title: "سٹی فیشن ہاؤس", phone_number: "0322-7788990", address: "Saddar", city: "Peshawar", isActive: true, createdAt, updatedAt: createdAt },
    ]);
  }

  if (!listPurchases().length) {
    const purchases = [
      {
        _id: "demo-purchase-1", purchase_number: "P-2026-0001", supplier_id: "demo-supplier-1", supplier_name: "Karachi Garments Wholesale", purchase_date: "2026-08-18",
        articles: [
          { _key: "demo-a1", article_no: "260001-01", description: "Boys Cotton T-Shirt", size: "S-M-L", season: "Summer", category: "Boys", unit: 6, quantity_pkt: 20, quantity_dzn: 10, quantity_pcs: 120, total_pcs: 120, rate: 420, sale_rate: 575, discount: "", discount_amount: 0, amount: 50400 },
          { _key: "demo-a2", article_no: "260001-02", description: "Girls Printed Frock", size: "24-32", season: "Summer", category: "Girls", unit: 4, quantity_pkt: 15, quantity_dzn: 5, quantity_pcs: 60, total_pcs: 60, rate: 680, sale_rate: 850, discount: "5%", discount_amount: 2040, amount: 38760 },
          { _key: "demo-a3", article_no: "260001-03", description: "Kids Denim Jeans", size: "20-30", season: "All Season", category: "Kids", unit: 6, quantity_pkt: 10, quantity_dzn: 5, quantity_pcs: 60, total_pcs: 60, rate: 750, sale_rate: 950, discount: "", discount_amount: 0, amount: 45000 },
        ], article_count: 3, packet_count: 45, total_amount: 134160, createdAt, updatedAt: createdAt,
      },
      {
        _id: "demo-purchase-2", purchase_number: "P-2026-0002", supplier_id: "demo-supplier-2", supplier_name: "Lahore Kids Collection", purchase_date: "2026-08-22",
        articles: [
          { _key: "demo-a4", article_no: "260002-01", description: "Baby Winter Suit", size: "0-3 Years", season: "Winter", category: "Baby", unit: 3, quantity_pkt: 18, quantity_dzn: 4.5, quantity_pcs: 54, total_pcs: 54, rate: 900, sale_rate: 1150, discount: "", discount_amount: 0, amount: 48600 },
          { _key: "demo-a5", article_no: "260002-02", description: "Girls Leggings Pack", size: "22-30", season: "All Season", category: "Girls", unit: 6, quantity_pkt: 12, quantity_dzn: 6, quantity_pcs: 72, total_pcs: 72, rate: 310, sale_rate: 450, discount: "", discount_amount: 0, amount: 22320 },
        ], article_count: 2, packet_count: 30, total_amount: 70920, createdAt, updatedAt: createdAt,
      },
    ];
    writeJson(PURCHASES_KEY, purchases);
  }

  if (!listPrototypeInvoices().length) {
    writeJson(INVOICES_KEY, [
      { _id: "demo-invoice-1", invoice_number: "2026-0001", invoice_date: "2026-08-24", customer_id: "demo-customer-1", customer_name: "Al Madina Garments", salesman_name: "Hamza", articles: [{ _key: "demo-sale-a1", article_no: "260001-01", description: "Boys Cotton T-Shirt", unit: 6, quantity_pkt: 2, dzn: 1, pcs: 12, rate: 575, discount: "", gross_amount: 6900, amount: 6900 }], gross_amount: 6900, net_amount: 6900, total_amount: 6900, received_amount: 5000, balance_amount: 1900, createdAt, updatedAt: createdAt },
      { _id: "demo-invoice-2", invoice_number: "2026-0002", invoice_date: "2026-08-25", customer_id: "demo-customer-2", customer_name: "Bismillah Kids Wear", salesman_name: "Ali", articles: [{ _key: "demo-sale-a2", article_no: "260001-02", description: "Girls Printed Frock", unit: 4, quantity_pkt: 3, dzn: 1, pcs: 12, rate: 850, discount: "5%", gross_amount: 10200, discount_amount: 510, amount: 9690 }], gross_amount: 10200, total_discount_amount: 510, net_amount: 9690, total_amount: 9690, received_amount: 9690, balance_amount: 0, createdAt, updatedAt: createdAt },
    ]);
  }
  migratePurchaseLinkedArticleNumbers();
  window.localStorage.setItem(DEMO_SEEDED_KEY, "true");
};

const SALES_RETURNS_KEY = "textradeos_prototype_sales_returns";
const PURCHASE_RETURNS_KEY = "textradeos_prototype_purchase_returns";
export const listSalesReturns = () => newestFirst(readJson(SALES_RETURNS_KEY), ["return_date"]);
export const listPurchaseReturns = () => newestFirst(readJson(PURCHASE_RETURNS_KEY), ["return_date"]);
const saveReturnRecord = (key, prefix, payload) => { const rows=readJson(key); const id=payload._id||uuidv4(); const existing=rows.find(r=>r._id===id); const year=new Date(payload.return_date||Date.now()).getFullYear(); const seq=rows.filter(r=>String(r.return_number||"").startsWith(`${prefix}-${year}-`)).length+1; const next={...payload,_id:id,return_number:existing?.return_number||`${prefix}-${year}-${String(seq).padStart(4,"0")}`,createdAt:existing?.createdAt||nowIso(),updatedAt:nowIso()}; writeJson(key,existing?rows.map(r=>r._id===id?next:r):[next,...rows]); return next; };
export const saveSalesReturn = payload => saveReturnRecord(SALES_RETURNS_KEY,"SR",payload);
export const savePurchaseReturn = payload => saveReturnRecord(PURCHASE_RETURNS_KEY,"PR",payload);
export const deleteSalesReturn = id => writeJson(SALES_RETURNS_KEY,listSalesReturns().filter(r=>r._id!==id));
export const deletePurchaseReturn = id => writeJson(PURCHASE_RETURNS_KEY,listPurchaseReturns().filter(r=>r._id!==id));
