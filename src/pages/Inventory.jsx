import { useMemo, useRef, useState } from "react";
import { Archive, Boxes, Hash, PackageCheck, Printer, ShoppingCart, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import TableToolbar from "../components/table/TableToolbar";
import FilterDrawer from "../components/FilterDrawer";
import Modal from "../components/Modal";
import Button from "../components/Button";
import PurchaseFormModal from "../components/Purchase/PurchaseFormModal";
import { formatDate, formatNumbers } from "../utils";
import { listPrototypeInvoices, listPurchases } from "../utils/prototypeStorage";

const PAGE_SIZE = 30;

const numberValue = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildInventoryRows = () => {
  const soldByArticle = new Map();

  listPrototypeInvoices().forEach((invoice) => {
    (invoice.articles || []).forEach((article) => {
      const articleNo = String(article.article_no || "").trim();
      if (!articleNo) return;
      soldByArticle.set(articleNo, (soldByArticle.get(articleNo) || 0) + numberValue(article.pcs));
    });
  });

  return listPurchases()
    .flatMap((purchase) => (purchase.articles || []).map((article) => {
      const purchasedPcs = numberValue(article.quantity_pcs || article.total_pcs);
      const soldPcs = soldByArticle.get(article.article_no) || 0;
      const unit = numberValue(article.unit);
      const stockPcs = Math.max(0, purchasedPcs - soldPcs);

      return {
        _key: `${purchase._id}-${article.article_no}`,
        article_no: article.article_no,
        qr_id: article.qr_id,
        purchase_number: purchase.purchase_number,
        purchase_id: purchase._id,
        purchase_date: purchase.purchase_date,
        supplier_name: purchase.supplier_name,
        description: article.description || "",
        size: article.size || "",
        category: article.category || "",
        season: article.season || "",
        unit,
        purchased_pcs: purchasedPcs,
        sold_pcs: soldPcs,
        stock_pcs: stockPcs,
        stock_dzn: stockPcs / 12,
        stock_pkt: unit > 0 ? stockPcs / unit : 0,
        purchase_rate: numberValue(article.rate),
        sale_rate: numberValue(article.sale_rate || article.rate),
      };
    }))
    .sort((a, b) => {
      const dateDifference = new Date(b.purchase_date || 0) - new Date(a.purchase_date || 0);
      return dateDifference || String(b.article_no || "").localeCompare(String(a.article_no || ""), undefined, { numeric: true });
    });
};

export default function Inventory() {
  const tableScrollRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ article: "", supplier: "", stock: "" });
  const [rows] = useState(() => buildInventoryRows());
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [printPurchase, setPrintPurchase] = useState(null);

  const articleMovements = useMemo(() => {
    if (!selectedArticle) return [];
    const purchaseMovement = {
      key: `purchase-${selectedArticle.purchase_id}`,
      type: "Purchased",
      date: selectedArticle.purchase_date,
      reference: selectedArticle.purchase_number,
      party: selectedArticle.supplier_name,
      pcs: selectedArticle.purchased_pcs,
      rate: selectedArticle.purchase_rate,
    };
    const sales = listPrototypeInvoices().flatMap((invoice) => (invoice.articles || [])
      .filter((article) => String(article.article_no || "").trim() === selectedArticle.article_no)
      .map((article, index) => ({
        key: `sale-${invoice._id || invoice.invoice_number}-${index}`,
        type: "Sold",
        date: invoice.invoice_date || invoice.createdAt,
        reference: invoice.invoice_number || "Sales Invoice",
        party: invoice.customer_name || invoice.customer?.customer_name || "Customer",
        pcs: numberValue(article.pcs),
        rate: numberValue(article.rate),
      })));
    return [purchaseMovement, ...sales].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [selectedArticle]);

  const openArticleLabelPrint = () => {
    if (!selectedArticle) return;
    const purchase = listPurchases().find((item) => item._id === selectedArticle.purchase_id);
    const article = purchase?.articles?.find((item) => item.article_no === selectedArticle.article_no);
    if (!purchase || !article) return;
    setPrintPurchase({ ...purchase, articles: [{ ...article, available_packets: Math.max(0, Math.floor(selectedArticle.stock_pkt)) }] });
    setSelectedArticle(null);
  };

  const openBatchLabelPrint = () => {
    const rowByArticle = new Map(rows.map((row) => [row.article_no, row]));
    const articles = listPurchases().flatMap((purchase) => (purchase.articles || []).map((article) => {
      const inventory = rowByArticle.get(article.article_no);
      return {
        ...article,
        purchase_number: purchase.purchase_number,
        supplier_name: purchase.supplier_name,
        available_packets: Math.max(0, Math.floor(numberValue(inventory?.stock_pkt))),
        stock_pcs: numberValue(inventory?.stock_pcs),
      };
    })).filter((article) => article.available_packets > 0);
    setPrintPurchase({ _id: "inventory-label-batch", purchase_number: "MULTI", supplier_name: "", articles });
  };

  const filteredRows = useMemo(() => {
    const article = filters.article.trim().toLowerCase();
    const supplier = filters.supplier.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesArticle = !article
        || row.article_no.toLowerCase().includes(article)
        || row.description.toLowerCase().includes(article)
        || row.size.toLowerCase().includes(article);
      const matchesSupplier = !supplier || row.supplier_name.toLowerCase().includes(supplier);
      const matchesStock = !filters.stock
        || (filters.stock === "available" ? row.stock_pcs > 0 : row.stock_pcs <= 0);
      return matchesArticle && matchesSupplier && matchesStock;
    });
  }, [filters, rows]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const stockPcs = rows.reduce((sum, row) => sum + row.stock_pcs, 0);
    return {
      totalArticles: rows.length,
      stockPcs,
      stockPackets: rows.reduce((sum, row) => sum + row.stock_pkt, 0),
      stockValue: rows.reduce((sum, row) => sum + (row.stock_pcs * row.purchase_rate), 0),
    };
  }, [rows]);

  const filterConfig = [
    {
      label: "Article",
      placeholder: "Article no, description, size",
      type: "text",
      value: filters.article,
      onChange: (e) => setFilters((prev) => ({ ...prev, article: e.target.value })),
    },
    {
      label: "Supplier",
      placeholder: "Supplier name",
      type: "text",
      value: filters.supplier,
      onChange: (e) => setFilters((prev) => ({ ...prev, supplier: e.target.value })),
    },
    {
      label: "Stock",
      type: "select",
      value: filters.stock,
      options: [
        { label: "All", value: "" },
        { label: "Available", value: "available" },
        { label: "Out of Stock", value: "out" },
      ],
      onChange: (value) => setFilters((prev) => ({ ...prev, stock: value })),
    },
  ];

  const applyFilters = () => {
    setCurrentPage(1);
    setIsFilterOpen(false);
    tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetFilters = () => {
    setFilters({ article: "", supplier: "", stock: "" });
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  return (
    <>
      <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col">
        <PageHeader title="Inventory" subtitle="Track purchased articles, sold quantity, and current stock." actionLabel="Print QR Labels" actionIcon={Printer} onAction={openBatchLabelPrint} />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Articles" value={formatNumbers(stats.totalArticles, 0)} icon={Archive} />
          <StatCard label="Stock Pieces" value={formatNumbers(stats.stockPcs, 0)} icon={PackageCheck} variant="success" />
          <StatCard label="Stock Packets" value={formatNumbers(stats.stockPackets, 2)} icon={Boxes} variant="warning" />
          <StatCard label="Stock Value" value={formatNumbers(stats.stockValue, 2)} icon={Wallet} />
        </div>

        <div className="rounded-3xl bg-white border border-gray-300 overflow-hidden flex-1 flex flex-col">
          <TableToolbar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onFilter={() => setIsFilterOpen(true)} />

          <div className="grid gap-2 overflow-auto p-3 md:hidden">
            {pageRows.length === 0 ? <div className="py-12 text-center text-sm text-gray-400">No inventory articles found.</div> : pageRows.map((row) => (
              <button key={row._key} type="button" onClick={() => setSelectedArticle(row)} className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm active:bg-teal-50"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-bold text-teal-700">{row.article_no}</p><p className="mt-1 truncate text-sm font-semibold text-gray-800">{row.description || "Untitled article"}</p><p className="mt-0.5 text-xs text-gray-500">{row.size || "No size"} · {row.supplier_name}</p></div><span className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ${row.stock_pcs > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{formatNumbers(row.stock_pcs, 0)} pcs</span></div><div className="mt-3 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 text-xs"><div><span className="text-gray-400">Purchased</span><p className="font-semibold">{formatNumbers(row.purchased_pcs, 0)}</p></div><div><span className="text-gray-400">Sold</span><p className="font-semibold">{formatNumbers(row.sold_pcs, 0)}</p></div><div className="text-right"><span className="text-gray-400">Packets left</span><p className="font-bold text-emerald-700">{formatNumbers(row.stock_pkt, 2)}</p></div></div></button>
            ))}
          </div>

          <div ref={tableScrollRef} className="hidden flex-1 overflow-auto md:block">
            <table className="w-full min-w-[1160px] text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-gray-100" style={{ boxShadow: "0 1px 0 0 rgba(209,213,219,1)" }}>
                <tr className="text-sm tracking-wider text-gray-500">
                  <th className="px-5 py-3.5 font-medium">#</th>
                  <th className="px-5 py-3.5 font-medium">Article No</th>
                  <th className="px-5 py-3.5 font-medium">Description</th>
                  <th className="px-5 py-3.5 font-medium">Size</th>
                  <th className="px-5 py-3.5 font-medium">Supplier</th>
                  <th className="px-5 py-3.5 font-medium">Purchased</th>
                  <th className="px-5 py-3.5 font-medium">Sold</th>
                  <th className="px-5 py-3.5 font-medium">Stock</th>
                  <th className="px-5 py-3.5 font-medium">Stock Pkt</th>
                  <th className="px-5 py-3.5 font-medium">Purchase Rate</th>
                  <th className="px-5 py-3.5 font-medium">Sale Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pageRows.length === 0 ? (
                  <tr><td colSpan={11} className="px-7 py-16 text-center text-sm text-gray-400">No inventory articles found.</td></tr>
                ) : pageRows.map((row, index) => (
                  <tr key={row._key} onClick={() => setSelectedArticle(row)} className="cursor-pointer hover:bg-teal-50/50" title="View article purchase and sale history">
                    <td className="px-5 py-4 text-sm font-medium text-gray-500">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-800"><Hash className="inline h-3.5 w-3.5 mr-1 text-gray-400" />{row.article_no}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.description || "-"}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.size || "-"}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.supplier_name || "-"}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-gray-600">{formatNumbers(row.purchased_pcs, 0)}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-gray-600">{formatNumbers(row.sold_pcs, 0)}</td>
                    <td className={`px-5 py-4 text-sm font-semibold tabular-nums ${row.stock_pcs > 0 ? "text-emerald-700" : "text-red-600"}`}>{formatNumbers(row.stock_pcs, 0)}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-gray-600">{formatNumbers(row.stock_pkt, 2)}</td>
                    <td className="px-5 py-4 text-sm tabular-nums text-gray-600">{formatNumbers(row.purchase_rate, 2)}</td>
                    <td className="px-5 py-4 text-sm font-semibold tabular-nums text-emerald-700">{formatNumbers(row.sale_rate, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <FilterDrawer isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filters={filterConfig} onApply={applyFilters} onReset={resetFilters} />
      <Modal
        isOpen={Boolean(selectedArticle)}
        onClose={() => setSelectedArticle(null)}
        title={selectedArticle?.article_no || "Article Details"}
        subtitle={`${selectedArticle?.description || "Article"} · Complete purchase and sale history`}
        maxWidth="max-w-5xl"
        footer={<div className="flex justify-end"><Button icon={Printer} disabled={!selectedArticle || selectedArticle.stock_pkt < 1} onClick={openArticleLabelPrint}>Print Stock QR Labels</Button></div>}
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ["Purchased", `${formatNumbers(selectedArticle?.purchased_pcs || 0, 0)} pcs`, TrendingUp, "text-sky-700"],
              ["Sold", `${formatNumbers(selectedArticle?.sold_pcs || 0, 0)} pcs`, TrendingDown, "text-amber-700"],
              ["Current Stock", `${formatNumbers(selectedArticle?.stock_pcs || 0, 0)} pcs`, PackageCheck, "text-emerald-700"],
              ["Stock Packets", formatNumbers(selectedArticle?.stock_pkt || 0, 2), Boxes, "text-teal-700"],
            ].map(([label, value, Icon, color]) => <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-4"><div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /><p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p></div><p className={`mt-2 text-lg font-bold ${color}`}>{value}</p></div>)}
          </div>
          <div className="grid gap-2 md:hidden">{articleMovements.map((movement) => <div key={movement.key} className="rounded-xl border border-gray-200 bg-gray-50 p-3"><div className="flex items-center justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${movement.type === "Purchased" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>{movement.type}</span><span className="text-xs text-gray-500">{formatDate(movement.date, "DD MMM yyyy")}</span></div><p className="mt-2 text-sm font-semibold text-gray-800">{movement.reference}</p><p className="text-xs text-gray-500">{movement.party}</p><div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-sm"><span><strong>{formatNumbers(movement.pcs, 0)}</strong> pcs</span><span>Rate <strong>{formatNumbers(movement.rate, 2)}</strong></span></div></div>)}</div>
          <div className="hidden overflow-x-auto rounded-xl border border-gray-300 md:block">
            <table className="w-full min-w-[700px] text-left"><thead className="bg-gray-50 text-xs font-semibold text-gray-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Movement</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Supplier / Customer</th><th className="px-4 py-3 text-right">Quantity</th><th className="px-4 py-3 text-right">Rate</th></tr></thead>
              <tbody className="divide-y divide-gray-200">{articleMovements.map((movement) => <tr key={movement.key}><td className="px-4 py-3 text-sm text-gray-600">{formatDate(movement.date, "DD MMM yyyy")}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${movement.type === "Purchased" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"}`}>{movement.type === "Purchased" ? <TrendingUp className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}{movement.type}</span></td><td className="px-4 py-3 text-sm font-semibold text-gray-800">{movement.reference}</td><td className="px-4 py-3 text-sm text-gray-600">{movement.party}</td><td className="px-4 py-3 text-right text-sm font-semibold tabular-nums text-gray-800">{formatNumbers(movement.pcs, 0)} pcs</td><td className="px-4 py-3 text-right text-sm tabular-nums text-gray-600">{formatNumbers(movement.rate, 2)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </Modal>
      <PurchaseFormModal isOpen={Boolean(printPurchase)} purchase={printPurchase} initialStep="labels" allowBack={false} suppliers={[]} onSubmit={() => null} onClose={() => setPrintPurchase(null)} />
    </>
  );
}
