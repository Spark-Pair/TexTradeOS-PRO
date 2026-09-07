import { useEffect, useState } from "react";
import { AlertTriangle, BookOpen, Loader2, RefreshCw } from "lucide-react";
import Modal from "../Modal";
import Button from "../Button";
import { fetchCustomerStatement, fetchSupplierStatement } from "../../api/commerce";

const money = (value) => `Rs ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const date = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString() : "-";

export default function PartyStatementModal({ isOpen, onClose, party, type = "customer" }) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  const isCustomer = type === "customer";
  const load = async () => { if (!party?._id) return; setLoading(true); setError(""); try { setData(await (isCustomer ? fetchCustomerStatement(party._id) : fetchSupplierStatement(party._id))); } catch (e) { setData(null); setError(e?.response?.data?.message || e?.message || "Could not load statement"); } finally { setLoading(false); } };
  useEffect(() => { if (isOpen) load(); else { setData(null); setError(""); } }, [isOpen, party?._id, type]);
  const name = party?.[isCustomer ? "customer_name" : "supplier_name"] || "Party";
  const totals = data?.totals || {};
  return <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-6xl" title={`${isCustomer ? "Customer" : "Supplier"} Statement`} subtitle={`${name} · Complete account ledger`}>
    {loading ? <div className="flex min-h-72 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="animate-spin" size={18}/> Loading statement...</div> : error ? <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center"><AlertTriangle className="text-amber-500"/><p className="text-sm font-semibold text-gray-800">Statement unavailable</p><p className="text-xs text-gray-500">{error}</p><Button size="sm" outline icon={RefreshCw} onClick={load}>Retry</Button></div> : data ? <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3"><Summary label={isCustomer ? "Total Sales" : "Total Purchases"} value={totals.debit}/><Summary label={isCustomer ? "Payments + Returns" : "Returns / Allowances"} value={totals.credit}/><Summary label="Current Balance" value={totals.balance} strong/></div>
      <div className="overflow-hidden rounded-2xl border border-gray-200"><div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3"><BookOpen size={16} className="text-gray-500"/><p className="text-sm font-semibold text-gray-800">Ledger Entries</p></div><div className="max-h-[52vh] overflow-auto"><table className="w-full min-w-[760px] text-left"><thead className="sticky top-0 bg-white text-xs uppercase tracking-wide text-gray-400"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3">Particulars</th><th className="px-4 py-3 text-right">Debit</th><th className="px-4 py-3 text-right">Credit</th><th className="px-4 py-3 text-right">Balance</th></tr></thead><tbody className="divide-y divide-gray-100">{data.rows?.length ? data.rows.map((row, index) => <tr key={`${row.type}-${row.id}-${index}`} className="text-sm"><td className="px-4 py-3 text-gray-500">{date(row.date)}</td><td className="px-4 py-3 font-medium text-gray-700">{row.reference || "-"}</td><td className="px-4 py-3 text-gray-600"><p>{row.description}</p>{row.reference_no && <p className="mt-0.5 text-xs text-gray-400">Ref: {row.reference_no}</p>}{row.notes && <p className="mt-0.5 max-w-xs truncate text-xs text-gray-400">{row.notes}</p>}</td><td className="px-4 py-3 text-right font-medium text-gray-700">{row.debit ? money(row.debit) : "-"}</td><td className="px-4 py-3 text-right font-medium text-gray-700">{row.credit ? money(row.credit) : "-"}</td><td className="px-4 py-3 text-right font-semibold text-gray-900">{money(row.running_balance)}</td></tr>) : <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-gray-400">No transactions yet.</td></tr>}</tbody><tfoot className="border-t border-gray-200 bg-gray-50 text-sm font-bold text-gray-800"><tr><td colSpan={3} className="px-4 py-3">Totals</td><td className="px-4 py-3 text-right">{money(totals.debit)}</td><td className="px-4 py-3 text-right">{money(totals.credit)}</td><td className="px-4 py-3 text-right">{money(totals.balance)}</td></tr></tfoot></table></div></div>
    </div> : null}
  </Modal>;
}

function Summary({ label, value, strong }) { return <div className={`rounded-2xl border p-4 ${strong ? "border-teal-200 bg-teal-50" : "border-gray-200 bg-gray-50"}`}><p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p><p className={`mt-2 text-xl font-bold ${strong ? "text-teal-800" : "text-gray-900"}`}>{money(value)}</p></div>; }
