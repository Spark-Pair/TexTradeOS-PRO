import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CircleDollarSign, CreditCard, Loader2, Plus, RefreshCw, ReceiptText, Save } from "lucide-react";
import Button from "../components/Button";
import FilterDrawer from "../components/FilterDrawer";
import Input from "../components/Input";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import StatCard from "../components/StatCard";
import TableToolbar from "../components/table/TableToolbar";
import { useToast } from "../context/ToastContext";
import { createCustomerPayment, createSupplierPayment, fetchCustomers, fetchPayments, fetchSuppliers } from "../api/commerce";

const PAGE_SIZE = 30;
const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => `Rs ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const errorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const emptyForm = () => ({ party_type: "customer", party_id: "", payment_date: today(), method: "cash", amount: "", reference_no: "", bank_name: "", cheque_date: "", slip_date: "" });
const methodLabel = (value) => ({ cash: "Cash", cheque: "Cheque", slip: "Slip", online: "Online" }[value] || value || "-");

export default function Payments() {
  const { showToast } = useToast();
  const tableScrollRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ party_type: "", method: "", date_from: "", date_to: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [customerRows, supplierRows, paymentRows] = await Promise.all([fetchCustomers(), fetchSuppliers(), fetchPayments(appliedFilters)]);
      setCustomers(Array.isArray(customerRows) ? customerRows : []);
      setSuppliers(Array.isArray(supplierRows) ? supplierRows : []);
      setPayments(Array.isArray(paymentRows) ? paymentRows : []);
    } catch (e) {
      setPayments([]);
      setLoadError(errorMessage(e, "Could not load payments"));
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const totals = useMemo(() => payments.reduce((acc, payment) => {
    acc.count += 1;
    if (payment.party_type === "customer") acc.customer += Number(payment.amount || 0);
    if (payment.party_type === "supplier") acc.supplier += Number(payment.amount || 0);
    return acc;
  }, { count: 0, customer: 0, supplier: 0 }), [payments]);
  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const pagePayments = payments.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const parties = form.party_type === "customer" ? customers : suppliers;
  const partyOptions = useMemo(() => parties.map((party) => ({ value: String(party._id), label: party[form.party_type === "customer" ? "customer_name" : "supplier_name"] || "Unnamed account" })), [parties, form.party_type]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const openAddModal = () => { setForm(emptyForm()); setPaymentModalOpen(true); };
  const closeAddModal = () => { if (!isSaving) setPaymentModalOpen(false); };
  const applyFilters = () => { setAppliedFilters(filters); setCurrentPage(1); setIsFilterOpen(false); tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); };
  const resetFilters = () => { const clean = { party_type: "", method: "", date_from: "", date_to: "" }; setFilters(clean); setAppliedFilters(clean); setCurrentPage(1); setIsFilterOpen(false); };

  const submitPayment = async () => {
    if (!form.party_id) { showToast({ type: "error", message: `Select a ${form.party_type} first` }); return; }
    if (Number(form.amount || 0) <= 0) { showToast({ type: "error", message: "Payment amount must be greater than zero" }); return; }
    setIsSaving(true);
    try {
      const payload = { payment_date: form.payment_date, method: form.method, amount: Number(form.amount || 0), reference_no: form.method === "cash" ? "" : form.reference_no, bank_name: form.method === "cheque" ? form.bank_name : "", cheque_date: form.method === "cheque" ? form.cheque_date : "", slip_date: form.method === "slip" ? form.slip_date : "" };
      form.party_type === "customer" ? await createCustomerPayment(form.party_id, payload) : await createSupplierPayment(form.party_id, payload);
      showToast({ type: "success", message: form.party_type === "customer" ? "Customer payment saved" : "Supplier payment saved" });
      setPaymentModalOpen(false);
      setForm(emptyForm());
      await loadPayments();
    } catch (e) {
      showToast({ type: "error", message: errorMessage(e, "Could not save payment") });
    } finally {
      setIsSaving(false);
    }
  };

  const filterConfig = [
    { label: "Type", type: "select", value: filters.party_type, options: [{ label: "All", value: "" }, { label: "Customer", value: "customer" }, { label: "Supplier", value: "supplier" }], onChange: (value) => setFilters((current) => ({ ...current, party_type: value })) },
    { label: "Method", type: "select", value: filters.method, options: [{ label: "All", value: "" }, { label: "Cash", value: "cash" }, { label: "Cheque", value: "cheque" }, { label: "Slip", value: "slip" }, { label: "Online", value: "online" }], onChange: (value) => setFilters((current) => ({ ...current, method: value })) },
    { label: "From Date", type: "date", value: filters.date_from, onChange: (e) => setFilters((current) => ({ ...current, date_from: e.target.value })) },
    { label: "To Date", type: "date", value: filters.date_to, onChange: (e) => setFilters((current) => ({ ...current, date_to: e.target.value })) },
  ];

  const dataState = isLoading ? <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={18} className="animate-spin"/> Loading payments...</div> : loadError ? <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-6 text-center"><AlertTriangle size={24} className="text-amber-500"/><div><p className="text-sm font-semibold text-gray-800">Payments unavailable</p><p className="mt-1 text-sm text-gray-500">{loadError}</p></div><button onClick={loadPayments} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold"><RefreshCw size={15}/> Retry</button></div> : null;

  return <><div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col">
    <PageHeader title="Payments" subtitle="Record and review customer receipts and supplier payments." actionLabel="Add Payment" actionIcon={Plus} onAction={openAddModal}/>
    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3"><StatCard label="Payment Entries" value={totals.count} icon={ReceiptText}/><StatCard label="Customer Received" value={money(totals.customer)} icon={CircleDollarSign} variant="success"/><StatCard label="Supplier Paid" value={money(totals.supplier)} icon={CreditCard} variant="warning"/></div>
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-300 bg-white">
      <TableToolbar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onFilter={() => setIsFilterOpen(true)}/>
      {dataState || <><div className="grid gap-2 overflow-auto p-3 md:hidden">{pagePayments.length ? pagePayments.map((payment) => <PaymentCard key={payment.id} payment={payment}/>) : <div className="py-16 text-center text-sm text-gray-400">No payments found.</div>}</div>
        <div ref={tableScrollRef} className="hidden flex-1 overflow-auto md:block"><table className="w-full min-w-[900px] text-left"><thead className="sticky top-0 z-20 bg-gray-100" style={{ boxShadow: "0 1px 0 0 rgba(209,213,219,1)" }}><tr className="text-sm text-gray-500"><th className="px-5 py-3.5">Id</th><th className="px-5 py-3.5">Date</th><th className="px-5 py-3.5">Account</th><th className="px-5 py-3.5">Type</th><th className="px-5 py-3.5">Method</th><th className="px-5 py-3.5">Reff No</th><th className="px-5 py-3.5">Details</th><th className="px-5 py-3.5 text-right">Amount</th></tr></thead><tbody className="divide-y divide-gray-200">{pagePayments.length ? pagePayments.map((payment, index) => <tr key={payment.id} className="hover:bg-teal-50/40"><td className="px-5 py-4 text-sm text-gray-500">{(currentPage - 1) * PAGE_SIZE + index + 1}</td><td className="px-5 py-4 text-sm text-gray-600">{payment.payment_date || "-"}</td><td className="px-5 py-4 text-sm font-semibold text-gray-800">{payment.party_name || "-"}</td><td className="px-5 py-4 text-sm capitalize text-gray-600">{payment.party_type}</td><td className="px-5 py-4 text-sm text-gray-700">{methodLabel(payment.method)}</td><td className="px-5 py-4 text-sm text-gray-600">{payment.reference_no || "-"}</td><td className="px-5 py-4 text-sm text-gray-500">{detailsOf(payment)}</td><td className="px-5 py-4 text-right text-sm font-bold text-teal-800">{money(payment.amount)}</td></tr>) : <tr><td colSpan={8} className="py-16 text-center text-sm text-gray-400">No payments found.</td></tr>}</tbody></table></div></>}
    </div>
  </div><PaymentModal isOpen={paymentModalOpen} onClose={closeAddModal} form={form} set={set} setForm={setForm} partyOptions={partyOptions} onSubmit={submitPayment} isSaving={isSaving}/><FilterDrawer isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filters={filterConfig} onApply={applyFilters} onReset={resetFilters}/></>;
}

function PaymentModal({ isOpen, onClose, form, set, setForm, partyOptions, onSubmit, isSaving }) {
  const method = form.method || "cash";
  return <Modal isOpen={isOpen} onClose={isSaving ? undefined : onClose} maxWidth="max-w-2xl" title="Add Payment" subtitle="Enter customer receipt or supplier payment" footer={<div className="flex gap-3"><Button outline variant="secondary" onClick={onClose} disabled={isSaving} className="w-1/3">Discard</Button><Button icon={Save} className="grow" onClick={onSubmit} loading={isSaving} disabled={isSaving}>Save Payment</Button></div>}>
    <form className="grid grid-cols-1 gap-3.5 p-0.5 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
      <Select label="Account Type" value={form.party_type} onChange={(value) => setForm((current) => ({ ...current, party_type: value, party_id: "" }))} options={[{ value: "customer", label: "Customer" }, { value: "supplier", label: "Supplier" }]} />
      <Select label={form.party_type === "customer" ? "Customer" : "Supplier"} value={form.party_id} onChange={(value) => set("party_id", value)} options={partyOptions} placeholder={`Select ${form.party_type}`} />
      <Input label="Payment Date" type="date" value={form.payment_date} onChange={(e) => set("payment_date", e.target.value)} />
      <Input label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" />
      <Select label="Method" value={method} onChange={(value) => set("method", value)} options={[{ value: "cash", label: "Cash" }, { value: "cheque", label: "Cheque" }, { value: "slip", label: "Slip" }, { value: "online", label: "Online" }]} />
      {method !== "cash" && <Input label="Reff No" value={form.reference_no} onChange={(e) => set("reference_no", e.target.value)} />}
      {method === "cheque" && <Input label="Bank Name" value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} />}
      {method === "cheque" && <Input label="Cheque Date" type="date" value={form.cheque_date} onChange={(e) => set("cheque_date", e.target.value)} />}
      {method === "slip" && <Input label="Slip Date" type="date" value={form.slip_date} onChange={(e) => set("slip_date", e.target.value)} />}
      <button type="submit" className="hidden" aria-hidden="true" disabled={isSaving} />
    </form>
  </Modal>;
}

function PaymentCard({ payment }) {
  return <div className="rounded-2xl border border-gray-200 bg-white p-4"><div className="flex justify-between gap-3"><div><p className="font-bold text-gray-900">{payment.party_name || "-"}</p><p className="text-xs capitalize text-gray-500">{payment.party_type} · {methodLabel(payment.method)} · {payment.payment_date || "-"}</p></div><b className="text-sm text-teal-800">{money(payment.amount)}</b></div><div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-xs text-gray-500"><span>Reff No</span><span className="font-semibold text-gray-700">{payment.reference_no || "-"}</span></div></div>;
}

function detailsOf(payment) {
  if (payment.method === "cheque") return [payment.bank_name, payment.cheque_date].filter(Boolean).join(" / ") || "-";
  if (payment.method === "slip") return payment.slip_date || "-";
  if (payment.source === "invoice") return "Invoice payment";
  return "-";
}
