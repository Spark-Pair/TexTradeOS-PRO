import { useMemo, useRef, useState } from "react";
import { Edit3, Hash, MoreVertical, Package, Plus, Printer, ReceiptText, Sigma, Trash2, Wallet } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import TableToolbar from "../components/table/TableToolbar";
import FilterDrawer from "../components/FilterDrawer";
import ContextMenu from "../components/ContextMenu";
import ConfirmModal from "../components/ConfirmModal";
import PurchaseFormModal from "../components/Purchase/PurchaseFormModal";
import PurchaseDetailsModal from "../components/Purchase/PurchaseDetailsModal";
import { useToast } from "../context/ToastContext";
import { formatDate, formatNumbers } from "../utils";
import { deletePurchase, listPurchases, listSuppliers, savePurchase } from "../utils/prototypeStorage";

const PAGE_SIZE = 30;

export default function Purchases() {
  const { showToast } = useToast();
  const tableScrollRef = useRef(null);
  const [purchases, setPurchases] = useState(() => listPurchases());
  const [suppliers, setSuppliers] = useState(() => listSuppliers());
  const [activeMenu, setActiveMenu] = useState(null);
  const [formModal, setFormModal] = useState({ isOpen: false, purchase: null, initialStep: "entry" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [detailsPurchase, setDetailsPurchase] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ supplier_name: "", date_from: "", date_to: "" });

  const refresh = () => {
    setPurchases(listPurchases());
    setSuppliers(listSuppliers());
  };

  const filteredPurchases = useMemo(() => {
    const supplierName = filters.supplier_name.trim().toLowerCase();
    const from = filters.date_from ? new Date(filters.date_from).getTime() : 0;
    const to = filters.date_to ? new Date(filters.date_to).getTime() : 0;
    return purchases.filter((purchase) => {
      const purchaseTime = new Date(purchase.purchase_date).getTime();
      return (!supplierName || purchase.supplier_name.toLowerCase().includes(supplierName))
        && (!from || purchaseTime >= from)
        && (!to || purchaseTime <= to);
    });
  }, [filters, purchases]);

  const totalPages = Math.max(1, Math.ceil(filteredPurchases.length / PAGE_SIZE));
  const pagePurchases = filteredPurchases.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => {
    const totalAmount = purchases.reduce((sum, purchase) => sum + Number(purchase.total_amount || 0), 0);
    const packetCount = purchases.reduce((sum, purchase) => sum + Number(purchase.packet_count || 0), 0);
    return {
      totalPurchases: purchases.length,
      packetCount,
      totalAmount,
      avgPurchase: purchases.length ? totalAmount / purchases.length : 0,
    };
  }, [purchases]);

  const handleSubmit = (payload) => {
    const saved = savePurchase(payload);
    refresh();
    showToast({ type: "success", message: payload._id ? "Purchase updated successfully" : "Purchase saved successfully" });
    return saved;
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deletePurchase(deleteTarget._id);
    setDeleteTarget(null);
    refresh();
    showToast({ type: "success", message: "Purchase deleted successfully" });
  };

  const filterConfig = [
    {
      label: "Supplier Name",
      placeholder: "Search by supplier",
      type: "text",
      value: filters.supplier_name,
      onChange: (e) => setFilters((prev) => ({ ...prev, supplier_name: e.target.value })),
    },
    {
      label: "Date From",
      type: "date",
      value: filters.date_from,
      onChange: (e) => setFilters((prev) => ({ ...prev, date_from: e.target.value })),
    },
    {
      label: "Date To",
      type: "date",
      value: filters.date_to,
      onChange: (e) => setFilters((prev) => ({ ...prev, date_to: e.target.value })),
    },
  ];

  const applyFilters = () => {
    setCurrentPage(1);
    setIsFilterOpen(false);
    tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetFilters = () => {
    setFilters({ supplier_name: "", date_from: "", date_to: "" });
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  return (
    <>
      <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col">
        <PageHeader title="Purchases" subtitle="Create and manage supplier purchase invoices." actionLabel="Add Purchase" actionIcon={Plus} onAction={() => setFormModal({ isOpen: true, purchase: null, initialStep: "entry" })} />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Purchases" value={formatNumbers(stats.totalPurchases, 0)} icon={ReceiptText} />
          <StatCard label="Packet Labels" value={formatNumbers(stats.packetCount, 0)} icon={Package} variant="warning" />
          <StatCard label="Total Amount" value={formatNumbers(stats.totalAmount, 2)} icon={Wallet} variant="success" />
          <StatCard label="Avg Purchase" value={formatNumbers(stats.avgPurchase, 2)} icon={Sigma} />
        </div>

        <div className="rounded-3xl bg-white border border-gray-300 overflow-hidden flex-1 flex flex-col">
          <TableToolbar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onFilter={() => setIsFilterOpen(true)} />
          <div className="grid gap-2 overflow-auto p-3 md:hidden">
            {pagePurchases.length === 0 ? <div className="py-12 text-center text-sm text-gray-400">No purchases found.</div> : pagePurchases.map((purchase) => (
              <button key={purchase._id} type="button" onClick={() => setDetailsPurchase(purchase)} className="rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-sm active:bg-teal-50"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-gray-900">{purchase.purchase_number}</p><p className="mt-0.5 text-xs text-gray-500">{formatDate(purchase.purchase_date, "DD MMM yyyy")}</p></div><span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">{formatNumbers(purchase.total_amount, 2)}</span></div><p className="mt-3 truncate text-sm font-semibold text-gray-700">{purchase.supplier_name}</p><div className="mt-3 flex gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500"><span><strong className="text-gray-800">{purchase.article_count}</strong> articles</span><span><strong className="text-gray-800">{purchase.packet_count}</strong> packets</span><span className="ml-auto font-semibold text-teal-700">Tap for details →</span></div></button>
            ))}
          </div>
          <div ref={tableScrollRef} className="hidden flex-1 overflow-auto md:block">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-gray-100" style={{ boxShadow: "0 1px 0 0 rgba(209,213,219,1)" }}>
                <tr className="text-sm tracking-wider text-gray-500">
                  <th className="px-5 py-3.5 font-medium">#</th>
                  <th className="px-5 py-3.5 font-medium">Purchase No</th>
                  <th className="px-5 py-3.5 font-medium">Date</th>
                  <th className="px-5 py-3.5 font-medium">Supplier</th>
                  <th className="px-5 py-3.5 font-medium">Articles</th>
                  <th className="px-5 py-3.5 font-medium">Packets</th>
                  <th className="px-5 py-3.5 font-medium">Total Amount</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagePurchases.length === 0 ? (
                  <tr><td colSpan={8} className="px-7 py-16 text-center text-sm text-gray-400">No purchases found.</td></tr>
                ) : pagePurchases.map((purchase, index) => (
                  <tr key={purchase._id} onClick={() => setDetailsPurchase(purchase)} className="cursor-pointer hover:bg-teal-50/50" title="View purchase details">
                    <td className="px-5 py-4 font-medium text-gray-500">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-700">{purchase.purchase_number}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{formatDate(purchase.purchase_date, "DD MMM yyyy")}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-800">{purchase.supplier_name}</td>
                    <td className="px-5 py-4 text-sm text-gray-600"><Hash className="inline h-3.5 w-3.5 mr-1 text-gray-400" />{formatNumbers(purchase.article_count, 0)}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{formatNumbers(purchase.packet_count, 0)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-emerald-700">{formatNumbers(purchase.total_amount, 2)}</td>
                    <td className="px-5 py-4 text-right relative" onClick={(event) => event.stopPropagation()}>
                      <button onClick={() => setActiveMenu(activeMenu === purchase._id ? null : purchase._id)} className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100" aria-label="Open actions menu">
                        <MoreVertical size={18} />
                      </button>
                      <ContextMenu isOpen={activeMenu === purchase._id}>
                        <button onClick={() => { setFormModal({ isOpen: true, purchase, initialStep: "entry" }); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-gray-600 hover:bg-gray-200 cursor-pointer">
                          <Edit3 size={16} strokeWidth={2.5} /> Edit Purchase
                        </button>
                        <button onClick={() => { setFormModal({ isOpen: true, purchase, initialStep: "labels" }); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-gray-600 hover:bg-gray-200 cursor-pointer">
                          <Printer size={16} strokeWidth={2.5} /> Print Barcode Labels
                        </button>
                        <div className="h-[1px] bg-gray-200 my-1.5" />
                        <button onClick={() => { setDeleteTarget(purchase); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-red-600 hover:bg-red-50 cursor-pointer">
                          <Trash2 size={16} strokeWidth={2.5} /> Delete Purchase
                        </button>
                      </ContextMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PurchaseFormModal isOpen={formModal.isOpen} purchase={formModal.purchase} initialStep={formModal.initialStep} suppliers={suppliers} onSubmit={handleSubmit} onClose={() => setFormModal({ isOpen: false, purchase: null, initialStep: "entry" })} />
      <PurchaseDetailsModal
        purchase={detailsPurchase}
        onClose={() => setDetailsPurchase(null)}
        onPrintLabels={() => {
          setFormModal({ isOpen: true, purchase: detailsPurchase, initialStep: "labels" });
          setDetailsPurchase(null);
        }}
      />
      <FilterDrawer isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filters={filterConfig} onApply={applyFilters} onReset={resetFilters} />
      <ConfirmModal isOpen={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Purchase" message={`Delete purchase "${deleteTarget?.purchase_number || ""}"? This cannot be undone.`} confirmText="Delete Purchase" variant="danger" />
    </>
  );
}
