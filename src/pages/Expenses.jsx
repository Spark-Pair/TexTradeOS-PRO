import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Banknote, CreditCard, Loader2, Plus, ReceiptText, RefreshCw, Save, Trash2 } from "lucide-react";
import Button from "../components/Button";
import ConfirmModal from "../components/ConfirmModal";
import FilterDrawer from "../components/FilterDrawer";
import Input from "../components/Input";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import StatCard from "../components/StatCard";
import TableToolbar from "../components/table/TableToolbar";
import { useToast } from "../context/ToastContext";
import { createExpense, fetchExpenses, removeExpense } from "../api/commerce";

const PAGE_SIZE = 30;
const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => `Rs ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const errorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const emptyForm = () => ({ expense_date: today(), category: "", paid_to: "", method: "cash", amount: "", reference_no: "", bank_name: "", cheque_date: "", slip_date: "", notes: "" });
const methodLabel = (value) => ({ cash: "Cash", cheque: "Cheque", slip: "Slip", online: "Online" }[value] || value || "-");
const categoryOptions = ["Rent", "Salary", "Transport", "Utility", "Office", "Repair", "Food", "Other"].map((value) => ({ label: value, value }));

export default function Expenses() {
  const { showToast } = useToast();
  const tableScrollRef = useRef(null);
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ category: "", method: "", date_from: "", date_to: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [form, setForm] = useState(emptyForm);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadExpenses = useCallback(async () => {
    setIsLoading(true); setLoadError("");
    try { const rows = await fetchExpenses(appliedFilters); setExpenses(Array.isArray(rows) ? rows : []); }
    catch (e) { setExpenses([]); setLoadError(errorMessage(e, "Could not load expenses")); }
    finally { setIsLoading(false); }
  }, [appliedFilters]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const totals = useMemo(() => expenses.reduce((acc, expense) => {
    acc.count += 1;
    acc.amount += Number(expense.amount || 0);
    if (expense.method === "cash") acc.cash += Number(expense.amount || 0);
    return acc;
  }, { count: 0, amount: 0, cash: 0 }), [expenses]);
  const totalPages = Math.max(1, Math.ceil(expenses.length / PAGE_SIZE));
  const pageExpenses = expenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const openModal = () => { setForm(emptyForm()); setModalOpen(true); };
  const closeModal = () => { if (!isSaving) setModalOpen(false); };
  const applyFilters = () => { setAppliedFilters(filters); setCurrentPage(1); setIsFilterOpen(false); tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); };
  const resetFilters = () => { const clean = { category: "", method: "", date_from: "", date_to: "" }; setFilters(clean); setAppliedFilters(clean); setCurrentPage(1); setIsFilterOpen(false); };

  const submitExpense = async () => {
    if (!String(form.category || "").trim()) { showToast({ type: "error", message: "Expense category is required" }); return; }
    if (Number(form.amount || 0) <= 0) { showToast({ type: "error", message: "Expense amount must be greater than zero" }); return; }
    setIsSaving(true);
    try {
      await createExpense({ ...form, amount: Number(form.amount || 0), reference_no: form.method === "cash" ? "" : form.reference_no, bank_name: form.method === "cheque" ? form.bank_name : "", cheque_date: form.method === "cheque" ? form.cheque_date : "", slip_date: form.method === "slip" ? form.slip_date : "" });
      showToast({ type: "success", message: "Expense saved" });
      setModalOpen(false); setForm(emptyForm()); await loadExpenses();
    } catch (e) { showToast({ type: "error", message: errorMessage(e, "Could not save expense") }); }
    finally { setIsSaving(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try { await removeExpense(deleteTarget.id); setExpenses((rows) => rows.filter((row) => row.id !== deleteTarget.id)); setDeleteTarget(null); showToast({ type: "success", message: "Expense deleted" }); }
    catch (e) { showToast({ type: "error", message: errorMessage(e, "Could not delete expense") }); }
    finally { setIsDeleting(false); }
  };

  const filterConfig = [
    { label: "Category", type: "text", value: filters.category, placeholder: "Search category", onChange: (e) => setFilters((current) => ({ ...current, category: e.target.value })) },
    { label: "Method", type: "select", value: filters.method, options: [{ label: "All", value: "" }, { label: "Cash", value: "cash" }, { label: "Cheque", value: "cheque" }, { label: "Slip", value: "slip" }, { label: "Online", value: "online" }], onChange: (value) => setFilters((current) => ({ ...current, method: value })) },
    { label: "From Date", type: "date", value: filters.date_from, onChange: (e) => setFilters((current) => ({ ...current, date_from: e.target.value })) },
    { label: "To Date", type: "date", value: filters.date_to, onChange: (e) => setFilters((current) => ({ ...current, date_to: e.target.value })) },
  ];
  const dataState = isLoading ? <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={18} className="animate-spin"/> Loading expenses...</div> : loadError ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-6 text-center"><AlertTriangle size={24} className="text-amber-500"/><div><p className="text-sm font-semibold text-gray-800">Expenses unavailable</p><p className="mt-1 text-sm text-gray-500">{loadError}</p></div><button onClick={loadExpenses} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold"><RefreshCw size={15}/> Retry</button></div> : null;

  return <><div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col"><PageHeader title="Expenses" subtitle="Record and review business expenses." actionLabel="Add Expense" actionIcon={Plus} onAction={openModal}/><div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3"><StatCard label="Expense Entries" value={totals.count} icon={ReceiptText}/><StatCard label="Total Expenses" value={money(totals.amount)} icon={CreditCard} variant="danger"/><StatCard label="Cash Expenses" value={money(totals.cash)} icon={Banknote} variant="warning"/></div><div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-300 bg-white"><TableToolbar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onFilter={() => setIsFilterOpen(true)}/>{dataState || <><div className="grid gap-2 overflow-auto p-3 md:hidden">{pageExpenses.length ? pageExpenses.map((expense) => <ExpenseCard key={expense.id} expense={expense}/>) : <div className="py-16 text-center text-sm text-gray-400">No expenses found.</div>}</div><div ref={tableScrollRef} className="hidden flex-1 overflow-auto md:block"><table className="w-full min-w-[940px] text-left"><thead className="sticky top-0 z-20 bg-gray-100" style={{ boxShadow: "0 1px 0 0 rgba(209,213,219,1)" }}><tr className="text-sm text-gray-500"><th className="px-5 py-3.5">Id</th><th className="px-5 py-3.5">Date</th><th className="px-5 py-3.5">Category</th><th className="px-5 py-3.5">Paid To</th><th className="px-5 py-3.5">Method</th><th className="px-5 py-3.5">Reff No</th><th className="px-5 py-3.5">Details</th><th className="px-5 py-3.5 text-right">Amount</th><th className="px-5 py-3.5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-200">{pageExpenses.length ? pageExpenses.map((expense, index) => <tr key={expense.id} className="hover:bg-teal-50/40"><td className="px-5 py-4 text-sm text-gray-500">{(currentPage - 1) * PAGE_SIZE + index + 1}</td><td className="px-5 py-4 text-sm text-gray-600">{expense.expense_date || "-"}</td><td className="px-5 py-4 text-sm font-semibold text-gray-800">{expense.category}</td><td className="px-5 py-4 text-sm text-gray-600">{expense.paid_to || "-"}</td><td className="px-5 py-4 text-sm text-gray-700">{methodLabel(expense.method)}</td><td className="px-5 py-4 text-sm text-gray-600">{expense.reference_no || "-"}</td><td className="px-5 py-4 text-sm text-gray-500">{detailsOf(expense)}</td><td className="px-5 py-4 text-right text-sm font-bold text-red-700">{money(expense.amount)}</td><td className="px-5 py-4 text-right"><button onClick={() => setDeleteTarget(expense)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 size={16}/></button></td></tr>) : <tr><td colSpan={9} className="py-16 text-center text-sm text-gray-400">No expenses found.</td></tr>}</tbody></table></div></>}</div></div><ExpenseModal isOpen={modalOpen} onClose={closeModal} form={form} set={set} onSubmit={submitExpense} isSaving={isSaving}/><FilterDrawer isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filters={filterConfig} onApply={applyFilters} onReset={resetFilters}/><ConfirmModal isOpen={Boolean(deleteTarget)} onClose={() => { if (!isDeleting) setDeleteTarget(null); }} onConfirm={confirmDelete} isLoading={isDeleting} closeOnConfirm={false} variant="danger" title="Delete Expense" message={`Delete expense "${deleteTarget?.category || ""}"?`} confirmText="Delete"/></>;
}

function ExpenseModal({ isOpen, onClose, form, set, onSubmit, isSaving }) {
  const method = form.method || "cash";
  return <Modal isOpen={isOpen} onClose={isSaving ? undefined : onClose} maxWidth="max-w-2xl" title="Add Expense" subtitle="Create a business expense entry" footer={<div className="flex gap-3"><Button outline variant="secondary" onClick={onClose} disabled={isSaving} className="w-1/3">Discard</Button><Button icon={Save} className="grow" onClick={onSubmit} loading={isSaving} disabled={isSaving}>Save Expense</Button></div>}><form className="grid grid-cols-1 gap-3.5 p-0.5 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}><Input label="Expense Date" type="date" value={form.expense_date} onChange={(e) => set("expense_date", e.target.value)} /><Select label="Category" value={form.category} onChange={(value) => set("category", value)} options={categoryOptions} placeholder="Select category" /><Input label="Paid To" value={form.paid_to} onChange={(e) => set("paid_to", e.target.value)} placeholder="Person or vendor" required={false} /><Input label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" /><Select label="Method" value={method} onChange={(value) => set("method", value)} options={[{ value: "cash", label: "Cash" }, { value: "cheque", label: "Cheque" }, { value: "slip", label: "Slip" }, { value: "online", label: "Online" }]} />{method !== "cash" && <Input label="Reff No" value={form.reference_no} onChange={(e) => set("reference_no", e.target.value)} />}{method === "cheque" && <Input label="Bank Name" value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} />}{method === "cheque" && <Input label="Cheque Date" type="date" value={form.cheque_date} onChange={(e) => set("cheque_date", e.target.value)} />}{method === "slip" && <Input label="Slip Date" type="date" value={form.slip_date} onChange={(e) => set("slip_date", e.target.value)} />}<Input label="Notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" required={false} className="md:col-span-2" /><button type="submit" className="hidden" aria-hidden="true" disabled={isSaving} /></form></Modal>;
}

function ExpenseCard({ expense }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-gray-900">{expense.category}</p><p className="text-xs text-gray-500">{expense.paid_to || "No paid to"} · {methodLabel(expense.method)} · {expense.expense_date || "-"}</p></div><b className="text-sm text-red-700">{money(expense.amount)}</b></div><div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-xs text-gray-500"><span>Reff No</span><span className="font-semibold text-gray-700">{expense.reference_no || "-"}</span></div></div>;
}

function detailsOf(expense) {
  if (expense.method === "cheque") return [expense.bank_name, expense.cheque_date].filter(Boolean).join(" / ") || "-";
  if (expense.method === "slip") return expense.slip_date || "-";
  if (expense.notes) return expense.notes;
  return "-";
}
