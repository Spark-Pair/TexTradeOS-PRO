import { useEffect, useMemo, useState } from "react";
import { Banknote, PackageCheck, Plus, RotateCcw, Trash2 } from "lucide-react";
import Modal from "../components/Modal";
import Button from "../components/Button";
import Select from "../components/Select";
import Input from "../components/Input";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import ReturnEditor, { returnTotals } from "../components/Returns/ReturnEditor";
import TableToolbar from "../components/table/TableToolbar";
import { fetchSalesReturnable } from "../api/returns.api";
import {
  listCustomers, listSuppliers, listPrototypeInvoices, listPurchases,
  listSalesReturns, listPurchaseReturns, saveSalesReturn, savePurchaseReturn,
  deleteSalesReturn, deletePurchaseReturn,
} from "../utils/prototypeStorage";

const PAGE_SIZE = 12;
const today = () => new Date().toISOString().slice(0, 10);
const n = (value) => Number(value || 0) || 0;

export default function Returns({ type = "sales" }) {
  const sales = type === "sales";
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);
  const [party, setParty] = useState("");
  const [rows, setRows] = useState([]);
  const [adjustment, setAdjustment] = useState({ type: "none", value: "" });
  const [date, setDate] = useState(today());
  const [currentPage, setCurrentPage] = useState(1);
  const [remoteSalesInventory, setRemoteSalesInventory] = useState([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");

  const records = sales ? listSalesReturns() : listPurchaseReturns();
  const parties = sales ? listCustomers() : listSuppliers();
  const partyOptions = parties.map((item) => ({ value: item._id, label: sales ? item.customer_name : item.supplier_name }));

  useEffect(() => {
    let cancelled = false;
    if (!sales || !party) {
      setRemoteSalesInventory([]);
      setInventoryError("");
      return undefined;
    }
    setInventoryLoading(true);
    setInventoryError("");
    fetchSalesReturnable(party)
      .then((items) => { if (!cancelled) setRemoteSalesInventory(Array.isArray(items) ? items : []); })
      .catch((error) => {
        if (!cancelled) {
          setRemoteSalesInventory([]);
          setInventoryError(error?.response?.data?.message || "Could not load this customer's returnable articles.");
        }
      })
      .finally(() => { if (!cancelled) setInventoryLoading(false); });
    return () => { cancelled = true; };
  }, [sales, party, tick]);

  const localPurchaseInventory = useMemo(() => {
    if (sales) return [];
    const selectedParty = parties.find((item) => item._id === party);
    const documents = listPurchases().filter((purchase) => purchase.supplier_id === party || purchase.supplier_name === selectedParty?.supplier_name);
    const map = new Map();
    documents.forEach((document) => (document.articles || []).forEach((article) => {
      const quantity = n(article.quantity_pcs || article.total_pcs || article.pcs);
      const key = `${article.article_no}::${article.purchase_number || ""}`;
      const existing = map.get(key) || { ...article, available_pcs: 0, source_id: document._id };
      existing.available_pcs += quantity;
      map.set(key, existing);
    }));
    listPurchaseReturns().filter((record) => record.party_id === party && record.stock_action !== "keep_goods").forEach((record) => (record.articles || []).forEach((article) => {
      const key = `${article.article_no}::${article.purchase_number || ""}`;
      const current = map.get(key);
      if (current) current.available_pcs = Math.max(0, n(current.available_pcs) - n(article.pcs));
    }));
    return [...map.values()].filter((article) => n(article.available_pcs) > 0);
  }, [sales, party, tick]);

  const inventory = sales ? remoteSalesInventory : localPurchaseInventory;

  const totals = returnTotals(rows, adjustment);
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const pageRecords = records.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totalAmount = records.reduce((sum, record) => sum + n(record.total_amount), 0);
  const totalPcs = records.reduce((sum, record) => sum + n(record.total_pcs), 0);

  const resetForm = () => {
    setParty("");
    setRows([]);
    setAdjustment({ type: "none", value: "" });
    setDate(today());
  };

  const close = () => { setOpen(false); resetForm(); };
  const save = () => {
    if (!party || !rows.length) return;
    const partyObj = parties.find((item) => item._id === party);
    const payload = {
      return_date: date,
      party_id: party,
      party_name: sales ? partyObj?.customer_name : partyObj?.supplier_name,
      articles: rows,
      adjustment,
      total_pcs: totals.pcs,
      gross_amount: totals.gross,
      adjustment_amount: totals.adjustment,
      total_amount: totals.amount,
      stock_action: String(adjustment.type || "").startsWith("keep_") ? "keep_goods" : "return_stock",
    };
    (sales ? saveSalesReturn : savePurchaseReturn)(payload);
    close();
    setTick((value) => value + 1);
  };

  return (
    <>
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col">
        <PageHeader
          title={sales ? "Sales Returns" : "Purchase Returns"}
          subtitle={sales ? "Manage customer returns and return settlements." : "Manage supplier returns, stock returns and allowances."}
          actionLabel={sales ? "Add Sales Return" : "Add Purchase Return"}
          actionIcon={Plus}
          onAction={() => setOpen(true)}
        />

        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="Total Returns" value={records.length} icon={RotateCcw} />
          <StatCard label="Returned Pieces" value={totalPcs} icon={PackageCheck} variant="warning" />
          <StatCard label="Return Amount" value={totalAmount.toFixed(2)} icon={Banknote} variant="success" />
        </div>

        <div className="flex flex-1 flex-col overflow-hidden rounded-3xl border border-gray-300 bg-white">
          <TableToolbar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          <div className="grid gap-2 overflow-auto p-3 md:hidden">
            {pageRecords.length === 0 ? <div className="py-12 text-center text-sm text-gray-400">No returns found.</div> : pageRecords.map((record) => (
              <div key={record._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-gray-900">{record.return_number}</p><p className="mt-0.5 text-xs text-gray-500">{record.return_date}</p></div><span className="rounded-lg bg-red-50 px-2.5 py-1 text-sm font-bold text-red-600">-{n(record.total_amount).toFixed(2)}</span></div>
                <p className="mt-3 truncate text-sm font-semibold text-gray-700">{record.party_name}</p>
                <div className="mt-3 flex items-center gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500"><span><strong className="text-gray-800">{record.total_pcs}</strong> pcs</span><button type="button" onClick={() => { (sales ? deleteSalesReturn : deletePurchaseReturn)(record._id); setTick((value) => value + 1); }} className="ml-auto rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></div>
              </div>
            ))}
          </div>
          <div className="hidden flex-1 overflow-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-20 bg-gray-100" style={{ boxShadow: "0 1px 0 0 rgba(209,213,219,1)" }}>
                <tr className="text-sm tracking-wider text-gray-500"><th className="px-5 py-3.5 font-medium">#</th><th className="px-5 py-3.5 font-medium">Return No</th><th className="px-5 py-3.5 font-medium">Date</th><th className="px-5 py-3.5 font-medium">{sales ? "Customer" : "Supplier"}</th><th className="px-5 py-3.5 font-medium">Pieces</th><th className="px-5 py-3.5 font-medium">Amount</th><th className="px-5 py-3.5 font-medium text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pageRecords.length === 0 ? <tr><td colSpan={7} className="px-7 py-16 text-center text-sm text-gray-400">No returns found.</td></tr> : pageRecords.map((record, index) => (
                  <tr key={record._id} className="hover:bg-teal-50/50"><td className="px-5 py-4 text-sm font-medium text-gray-500">{(currentPage - 1) * PAGE_SIZE + index + 1}</td><td className="px-5 py-4 text-sm font-semibold text-gray-700">{record.return_number}</td><td className="px-5 py-4 text-sm text-gray-600">{record.return_date}</td><td className="px-5 py-4 text-sm font-semibold text-gray-800">{record.party_name}</td><td className="px-5 py-4 text-sm text-gray-600">{record.total_pcs}</td><td className="px-5 py-4 text-sm font-semibold text-red-600">-{n(record.total_amount).toFixed(2)}</td><td className="px-5 py-4 text-right"><button type="button" onClick={() => { (sales ? deleteSalesReturn : deletePurchaseReturn)(record._id); setTick((value) => value + 1); }} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label="Delete return"><Trash2 className="h-4 w-4" /></button></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal isOpen={open} onClose={close} maxWidth="max-w-5xl" title={sales ? "Add Sales Return" : "Add Purchase Return"} subtitle={sales ? "Select the customer, then add the goods being returned." : "Select the supplier, then return stock or record an allowance."} footer={<div className="flex w-full justify-end gap-3"><Button outline variant="secondary" onClick={close}>Discard</Button><Button onClick={save} disabled={!party || !rows.length}>Save Return</Button></div>}>
        <div className="grid gap-5">
          <section><div className="mb-3 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#127475] text-xs font-bold text-white">1</span><div><p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Return Details</p><p className="text-[11px] text-gray-400">Choose who this return belongs to and the return date.</p></div></div><div className="grid gap-3 md:grid-cols-2"><Select label={sales ? "Customer" : "Supplier"} value={party} onChange={(value) => { setParty(value); setRows([]); setAdjustment({ type: "none", value: "" }); }} options={partyOptions} placeholder={`Choose ${sales ? "customer" : "supplier"}`} /><Input label="Return Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div></section>
          <section className={!party ? "pointer-events-none opacity-45" : ""}><div className="mb-3 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#127475] text-xs font-bold text-white">2</span><div><p className="text-xs font-semibold uppercase tracking-wider text-gray-600">Returned Articles</p><p className="text-[11px] text-gray-400">Add actual pieces and choose how the return amount should be settled.</p></div></div>{inventoryError && <p className="mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{inventoryError}</p>}<ReturnEditor title={sales ? "Customer Sold Articles" : "Purchased Articles"} subtitle={inventoryLoading ? "Loading returnable articles..." : sales ? "Search this customer's sold articles or scan a label." : "Search received stock, scan a label, or enter the quantity manually."} inventory={inventory} rows={rows} onChange={setRows} adjustment={adjustment} onAdjustmentChange={setAdjustment} allowKeepGoods={!sales} /></section>
        </div>
      </Modal>
    </>
  );
}
