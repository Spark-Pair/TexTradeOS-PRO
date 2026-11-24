import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpenCheck, CircleDollarSign, Landmark, Loader2, Plus, RefreshCw, UsersRound } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import TableToolbar from "../components/table/TableToolbar";
import FilterDrawer from "../components/FilterDrawer";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Select from "../components/Select";
import Button from "../components/Button";
import Amount from "../components/Amount";
import { useToast } from "../context/ToastContext";
import { createBalanceEntry, fetchBalanceEntries, fetchBankAccounts, fetchCustomers, fetchSuppliers } from "../api/commerce";

const PAGE_SIZE = 30;
const ENTITY_LABELS = { customer: "Customer", supplier: "Supplier", bank_account: "Bank Account" };
const ENTITY_OPTIONS = Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label }));
const ENTRY_TYPE_OPTIONS = [{ value: "opening", label: "Opening Balance" }, { value: "adjustment", label: "Adjustment" }];
const DIRECTION_OPTIONS = [{ value: "debit", label: "Debit · Increase balance" }, { value: "credit", label: "Credit · Decrease balance" }];
const localToday = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const errorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;
const entityName = (row, type) => type === "customer" ? row.customer_name : type === "supplier" ? row.supplier_name : row.account_title;

function BalanceEntryModal({ isOpen, entities, entries, onClose, onSave, saving }) {
  const [form, setForm] = useState({ entity_type: "customer", entity_id: "", entry_type: "opening", entry_date: localToday(), direction: "debit", amount: "", reference: "", description: "", notes: "" });
  const [error, setError] = useState("");
  useEffect(() => {
    if (isOpen) {
      setForm({ entity_type: "customer", entity_id: "", entry_type: "opening", entry_date: localToday(), direction: "debit", amount: "", reference: "", description: "", notes: "" });
      setError("");
    }
  }, [isOpen]);

  const entityRows = entities[form.entity_type] || [];
  const entityOptions = entityRows.map((row) => ({ value: String(row._id), label: `${entityName(row, form.entity_type) || "Unnamed account"} · Balance ${Number(row.balance || 0).toLocaleString()}` }));
  const selectedEntity = entityRows.find((row) => String(row._id) === String(form.entity_id));
  const openingExists = entries.some((entry) => entry.entity_type === form.entity_type && String(entry.entity_id) === String(form.entity_id) && entry.entry_type === "opening");
  const entryTypeOptions = openingExists ? ENTRY_TYPE_OPTIONS.filter((option) => option.value !== "opening") : ENTRY_TYPE_OPTIONS;
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event?.preventDefault?.();
    setError("");
    if (!form.entity_id) return setError(`Select a ${ENTITY_LABELS[form.entity_type].toLowerCase()}.`);
    if (!Number(form.amount) || Number(form.amount) <= 0) return setError("Enter an amount greater than zero.");
    try {
      await onSave({ ...form, amount: Number(String(form.amount).replace(/,/g, "")) });
    } catch (saveError) {
      setError(errorMessage(saveError, "Could not save balance entry."));
    }
  };

  return <Modal isOpen={isOpen} onClose={saving ? undefined : onClose} maxWidth="max-w-2xl" title="New Balance Entry" subtitle="Record an account opening balance or a dated balance adjustment." footer={<div className="flex w-full items-center justify-between gap-3"><p className="min-w-0 flex-1 text-xs font-medium text-red-600">{error}</p><div className="flex gap-2"><Button outline variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button><Button icon={BookOpenCheck} loading={saving} disabled={saving} onClick={save}>Save Entry</Button></div></div>}>
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <Select label="Account Type" value={form.entity_type} options={ENTITY_OPTIONS} onChange={(value) => setForm((current) => ({ ...current, entity_type: value, entity_id: "", entry_type: "opening" }))} />
      <Select label={ENTITY_LABELS[form.entity_type]} value={form.entity_id} options={entityOptions} onChange={(value) => setForm((current) => ({ ...current, entity_id: value, entry_type: entries.some((entry) => entry.entity_type === current.entity_type && String(entry.entity_id) === String(value) && entry.entry_type === "opening") ? "adjustment" : current.entry_type }))} placeholder={`Select ${ENTITY_LABELS[form.entity_type].toLowerCase()}`} disabled={!entityOptions.length} />
      <Select label="Entry Type" value={form.entry_type} options={entryTypeOptions} onChange={(value) => update("entry_type", value)} />
      <Select label="Balance Direction" value={form.direction} options={DIRECTION_OPTIONS} onChange={(value) => update("direction", value)} />
      <Input label="Amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => update("amount", event.target.value)} placeholder="0.00" />
      <Input label="Entry Date" type="date" value={form.entry_date} onChange={(event) => update("entry_date", event.target.value)} />
      <Input label="Reference" required={false} value={form.reference} onChange={(event) => update("reference", event.target.value)} placeholder="Optional reference number" />
      <Input label="Description" required={false} value={form.description} onChange={(event) => update("description", event.target.value)} placeholder={form.entry_type === "opening" ? "Opening Balance" : "Balance Adjustment"} />
      <div className="sm:col-span-2"><Input label="Notes" required={false} value={form.notes} onChange={(event) => update("notes", event.target.value)} placeholder="Optional details" /></div>
      <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-3 py-2.5 text-xs leading-5 text-teal-900 sm:col-span-2">
        Debit increases the displayed account balance; credit decreases it. {selectedEntity && <span className="font-semibold">Current balance: <Amount value={selectedEntity.balance || 0} decimals={2} /></span>}
        {openingExists && <span className="ml-1">An opening balance is already recorded for this account, so this entry will be an adjustment.</span>}
      </div>
      <button type="submit" className="hidden" aria-hidden="true" />
    </form>
  </Modal>;
}

export default function BalanceEntries() {
  const { showToast } = useToast();
  const tableScrollRef = useRef(null);
  const [entries, setEntries] = useState([]);
  const [entities, setEntities] = useState({ customer: [], supplier: [], bank_account: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ name: "", entity_type: "", entry_type: "", direction: "" });
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [entryRows, customers, suppliers, accounts] = await Promise.all([fetchBalanceEntries(), fetchCustomers(), fetchSuppliers(), fetchBankAccounts()]);
      setEntries(Array.isArray(entryRows) ? entryRows : []);
      setEntities({ customer: Array.isArray(customers) ? customers : [], supplier: Array.isArray(suppliers) ? suppliers : [], bank_account: Array.isArray(accounts) ? accounts : [] });
    } catch (error) {
      setLoadError(errorMessage(error, "Could not load balance entries."));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadData(); }, []);

  const saveEntry = async (payload) => {
    if (saving) return;
    setSaving(true);
    try {
      await createBalanceEntry(payload);
      await loadData();
      setModalOpen(false);
      showToast({ type: "success", message: "Balance entry saved and account balance updated." });
    } catch (error) {
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const filteredEntries = useMemo(() => {
    const term = filters.name.trim().toLowerCase();
    return entries.filter((entry) => (!term || `${entry.entity_name} ${entry.entity_type} ${entry.entry_type} ${entry.description} ${entry.reference} ${entry.notes}`.toLowerCase().includes(term)) && (!filters.entity_type || entry.entity_type === filters.entity_type) && (!filters.entry_type || entry.entry_type === filters.entry_type) && (!filters.direction || entry.direction === filters.direction));
  }, [entries, filters]);
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const pageEntries = filteredEntries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const totals = useMemo(() => ({
    customers: entities.customer.reduce((sum, row) => sum + Number(row.balance || 0), 0),
    suppliers: entities.supplier.reduce((sum, row) => sum + Number(row.balance || 0), 0),
    banks: entities.bank_account.reduce((sum, row) => sum + Number(row.balance || 0), 0),
  }), [entities]);
  const filterConfig = [
    { label: "Account / Reference", placeholder: "Search account, entry or reference", type: "text", value: filters.name, onChange: (event) => setFilters((current) => ({ ...current, name: event.target.value })) },
    { label: "Account Type", type: "select", value: filters.entity_type, options: [{ label: "All", value: "" }, ...ENTITY_OPTIONS], onChange: (value) => setFilters((current) => ({ ...current, entity_type: value })) },
    { label: "Entry Type", type: "select", value: filters.entry_type, options: [{ label: "All", value: "" }, ...ENTRY_TYPE_OPTIONS], onChange: (value) => setFilters((current) => ({ ...current, entry_type: value })) },
    { label: "Direction", type: "select", value: filters.direction, options: [{ label: "All", value: "" }, ...DIRECTION_OPTIONS], onChange: (value) => setFilters((current) => ({ ...current, direction: value })) },
  ];
  const applyFilters = () => { setCurrentPage(1); setIsFilterOpen(false); tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); };
  const resetFilters = () => { setFilters({ name: "", entity_type: "", entry_type: "", direction: "" }); setCurrentPage(1); setIsFilterOpen(false); };

  return <>
    <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col">
      <PageHeader title="Balance Entries" subtitle="Set opening balances and record adjustments for customers, suppliers and bank accounts." actionLabel="New Balance Entry" actionIcon={Plus} onAction={() => setModalOpen(true)} />
      <div className="mb-5 grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customer Balances" value={<Amount value={totals.customers} decimals={2} />} icon={UsersRound} />
        <StatCard label="Supplier Balances" value={<Amount value={totals.suppliers} decimals={2} />} icon={CircleDollarSign} variant="warning" />
        <StatCard label="Bank Account Balances" value={<Amount value={totals.banks} decimals={2} />} icon={Landmark} variant="success" />
        <StatCard label="Balance Entries" value={entries.length} icon={BookOpenCheck} variant="normal" />
      </div>
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-300 bg-white">
        <TableToolbar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onFilter={() => setIsFilterOpen(true)} />
        {loading ? <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 size={18} className="animate-spin" /> Loading balance entries...</div> : loadError ? <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"><p className="text-sm text-amber-800">{loadError}</p><Button outline icon={RefreshCw} onClick={loadData}>Retry</Button></div> : <>
          <div className="grid gap-2 overflow-auto p-3 md:hidden">{pageEntries.length ? pageEntries.map((entry) => <article key={`mobile-${entry._id}`} className="rounded-2xl border border-gray-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-gray-800">{entry.entity_name}</p><p className="mt-0.5 text-xs text-gray-500">{ENTITY_LABELS[entry.entity_type]} · {entry.entry_date}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${entry.entry_type === "opening" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700"}`}>{entry.entry_type === "opening" ? "Opening" : "Adjustment"}</span></div><p className="mt-2 text-xs text-gray-500">{entry.description}{entry.reference ? ` · ${entry.reference}` : ""}</p><div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-xs"><span className="text-gray-500">{entry.direction === "debit" ? "Debit" : "Credit"}</span><strong className="text-gray-800"><Amount value={entry.amount} decimals={2} /></strong></div></article>) : <div className="py-12 text-center text-sm text-gray-400">No balance entries found.</div>}</div>
          <div ref={tableScrollRef} className="hidden flex-1 overflow-auto md:block">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead className="sticky top-0 z-20 bg-gray-100" style={{ boxShadow: "0 1px 0 0 rgba(209,213,219,1)" }}>
              <tr className="text-sm text-gray-500">
                <th className="px-5 py-3.5">Id</th>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Account</th>
                <th className="px-5 py-3.5">Entry</th>
                <th className="px-5 py-3.5">Reference / Details</th>
                <th className="px-5 py-3.5 text-right">Debit</th>
                <th className="px-5 py-3.5 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pageEntries.length ? pageEntries.map((entry, index) => <tr key={entry._id} className="hover:bg-teal-50/40">
                <td className="px-5 py-4 text-sm text-gray-500">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-500">{entry.entry_date}</td>
                <td className="px-5 py-4 text-sm font-semibold text-gray-800">{entry.entity_name}<span className="mt-0.5 block text-xs font-normal text-gray-500">{ENTITY_LABELS[entry.entity_type]}</span></td>
                <td className="px-5 py-4 text-sm font-medium text-gray-700">{entry.entry_type === "opening" ? "Opening Balance" : "Adjustment"}<span className="mt-0.5 block text-xs font-normal text-gray-500">{entry.description}</span></td>
                <td className="max-w-sm px-5 py-4 text-sm text-gray-600">{entry.reference && <b className="mr-2 text-gray-800">{entry.reference}</b>}{entry.notes || "-"}</td>
                <td className="px-5 py-4 text-right text-sm font-bold text-teal-800">{entry.direction === "debit" ? <Amount value={entry.amount} decimals={2} /> : "-"}</td>
                <td className="px-5 py-4 text-right text-sm font-bold text-teal-800">{entry.direction === "credit" ? <Amount value={entry.amount} decimals={2} /> : "-"}</td>
              </tr>) : <tr><td colSpan={7} className="py-16 text-center text-sm text-gray-400">No balance entries found.</td></tr>}
            </tbody>
          </table>
          </div>
        </>}
      </section>
    </div>
    <BalanceEntryModal isOpen={modalOpen} entities={entities} entries={entries} onClose={() => { if (!saving) setModalOpen(false); }} onSave={saveEntry} saving={saving} />
    <FilterDrawer isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filters={filterConfig} onApply={applyFilters} onReset={resetFilters} />
  </>;
}
