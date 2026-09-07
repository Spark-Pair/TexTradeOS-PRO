import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarRange, FileDown, FileText, Loader2, Printer, Search, UsersRound } from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Select from "../components/Select";
import StatementPaper from "../components/Reports/StatementPaper";
import { fetchCustomers, fetchCustomerStatement, fetchSuppliers, fetchSupplierStatement } from "../api/commerce";

const money = (value) => `Rs ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const CATEGORY_OPTIONS = [{ label: "Customer", value: "customer" }, { label: "Supplier", value: "supplier" }];

export default function Reports() {
  const [category, setCategory] = useState("customer");
  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    const loadParties = async () => {
      setPartiesLoading(true); setPartyId(""); setData(null); setError("");
      try {
        const rows = category === "customer" ? await fetchCustomers() : await fetchSuppliers();
        if (live) setParties(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (live) { setParties([]); setError(e?.response?.data?.message || e?.message || "Could not load accounts"); }
      } finally { if (live) setPartiesLoading(false); }
    };
    loadParties();
    return () => { live = false; };
  }, [category]);

  const partyOptions = useMemo(() => parties.map((party) => ({ value: String(party._id), label: party[category === "customer" ? "customer_name" : "supplier_name"] || "Unnamed account" })), [parties, category]);
  const selected = useMemo(() => parties.find((party) => String(party._id) === String(partyId)), [parties, partyId]);
  const selectedName = selected?.[category === "customer" ? "customer_name" : "supplier_name"] || "Account";

  const generate = async () => {
    if (!partyId) { setError(`Select a ${category} first`); return; }
    if (dateFrom && dateTo && dateFrom > dateTo) { setError("From date cannot be after To date"); return; }
    setLoading(true); setError("");
    try {
      const params = {}; if (dateFrom) params.date_from = dateFrom; if (dateTo) params.date_to = dateTo;
      setData(await (category === "customer" ? fetchCustomerStatement(partyId, params) : fetchSupplierStatement(partyId, params)));
    } catch (e) { setData(null); setError(e?.response?.data?.message || e?.message || "Could not generate statement"); }
    finally { setLoading(false); }
  };

  const clearPreview = () => setData(null);
  useEffect(() => () => removeStatementPrintClone(), []);

  const print = () => {
    if (!data) return;
    const source = document.querySelector(".statement-sheet");
    if (!source) {
      window.print();
      return;
    }
    removeStatementPrintClone();
    const printContainer = document.createElement("div");
    printContainer.id = "statement-print-clone-root";
    printContainer.appendChild(source.cloneNode(true));
    document.body.appendChild(printContainer);
    document.body.classList.add("printing-statement");
    const cleanup = () => {
      removeStatementPrintClone();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.setTimeout(() => window.print(), 0);
    window.setTimeout(cleanup, 2000);
  };
  const exportPdf = () => print();

  return <div className="reports-page relative z-10 mx-auto flex h-full max-w-7xl flex-col">
    <PageHeader title="Reporting" subtitle="Generate, review and print detailed account statements." />
    <div className="min-h-0 flex-1 overflow-auto pb-8">
      <section className="overflow-visible rounded-3xl border border-gray-300 bg-white">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6"><div className="flex items-center gap-2"><div className="rounded-xl bg-teal-50 p-2 text-[#127475]"><FileText size={18}/></div><div><h2 className="text-sm font-bold text-gray-900">Account Statement</h2><p className="mt-0.5 text-xs text-gray-500">Select an account and optional reporting period.</p></div></div><div className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-medium text-gray-500">Blank dates generate full history</div></div>
        <div className="grid gap-4 p-5 sm:p-6 xl:grid-cols-[180px_minmax(260px,1fr)_170px_170px_auto]"><Select label="Category" options={CATEGORY_OPTIONS} value={category} onChange={(value) => { setCategory(value); clearPreview(); }} /><Select label={category === "customer" ? "Customer" : "Supplier"} options={partyOptions} value={partyId} disabled={partiesLoading} placeholder={partiesLoading ? "Loading accounts..." : `Select ${category}`} onChange={(value) => { setPartyId(value); clearPreview(); setError(""); }} /><DateField label="From Date" value={dateFrom} onChange={(value) => { setDateFrom(value); clearPreview(); }} /><DateField label="To Date" value={dateTo} onChange={(value) => { setDateTo(value); clearPreview(); }} /><div className="flex items-end"><Button icon={Search} onClick={generate} disabled={loading || partiesLoading} className="w-full xl:min-w-32">{loading ? "Generating..." : "Generate"}</Button></div></div>
        {error && <div className="mx-5 mb-5 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:mx-6"><AlertTriangle size={16}/>{error}</div>}
      </section>
      {!data && !loading && <section className="mt-5 grid min-h-64 place-items-center rounded-3xl border border-dashed border-gray-300 bg-white/70 p-8 text-center"><div><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400"><FileText size={22}/></div><p className="mt-4 text-sm font-bold text-gray-700">Statement preview</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-400">Choose Customer or Supplier, select an account and generate the complete ledger or a specific date range.</p></div></section>}
      {loading && <div className="mt-5 flex min-h-64 items-center justify-center gap-2 rounded-3xl border border-gray-200 bg-white text-sm text-gray-500"><Loader2 size={18} className="animate-spin"/> Preparing detailed account statement...</div>}
      {data && <section className="mt-5 overflow-hidden rounded-3xl border border-gray-300 bg-white"><div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6"><div className="min-w-0"><div className="flex items-center gap-2"><span className="rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#127475]">{category}</span><p className="truncate text-sm font-bold text-gray-900">{selectedName}</p></div><p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><CalendarRange size={13}/>{data.period?.full_statement ? "Full account statement" : `${data.period?.date_from || "Beginning"} to ${data.period?.date_to || "Present"}`} · {data.rows?.length || 0} transactions</p></div><div className="flex flex-wrap gap-2"><Button outline icon={Printer} onClick={print}>Print</Button><Button icon={FileDown} onClick={exportPdf}>Save PDF</Button></div></div><div className="grid grid-cols-2 gap-px border-b border-gray-200 bg-gray-200 lg:grid-cols-4"><Summary label="Opening Balance" value={data.opening_balance}/><Summary label="Total Debit" value={data.totals?.debit}/><Summary label="Total Credit" value={data.totals?.credit}/><Summary label="Closing Balance" value={data.closing_balance} highlight/></div><div className="statement-preview-stage overflow-auto bg-[#e9eeed] p-4 sm:p-5 lg:p-6"><div className="statement-sheet mx-auto min-h-[297mm] w-[210mm] max-w-none bg-white px-[7mm] py-[6mm] shadow-[0_12px_40px_rgba(15,23,42,0.14)]"><StatementPaper data={data} type={category}/></div></div></section>}
    </div>
    <style>{`@media print{@page{size:A4 portrait;margin:6mm}html,body,#root{width:100%!important;max-width:none!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff!important}body.printing-statement>*:not(#statement-print-clone-root){display:none!important}#statement-print-clone-root{display:block!important;width:100%!important;margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important}#statement-print-clone-root,#statement-print-clone-root *{visibility:visible!important}.statement-preview-stage{display:block!important;position:static!important;box-sizing:border-box!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff!important}.statement-sheet{display:block!important;position:static!important;box-sizing:border-box!important;width:100%!important;max-width:none!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;background:#fff!important;box-shadow:none!important;overflow:visible!important}.statement-paper{box-sizing:border-box!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0!important;background:#fff!important;color:#111827!important;overflow:visible!important;break-inside:auto!important;page-break-inside:auto!important}.statement-paper .statement-head,.statement-paper .party-block,.statement-paper .statement-final,.statement-paper .statement-footer{box-sizing:border-box!important;max-width:100%!important}.statement-paper table{box-sizing:border-box!important;width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:separate!important}.statement-paper thead{display:table-header-group!important}.statement-paper tbody{break-inside:auto!important;page-break-inside:auto!important}.statement-paper th,.statement-paper td{box-sizing:border-box!important;min-width:0!important}.statement-row{break-inside:avoid!important;page-break-inside:avoid!important}.statement-head,.party-block{break-after:avoid!important;page-break-after:avoid!important}.statement-final,.statement-footer{break-inside:avoid!important;page-break-inside:avoid!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`}</style>
  </div>;
}
function removeStatementPrintClone() { document.getElementById("statement-print-clone-root")?.remove(); document.body.classList.remove("printing-statement"); }
function DateField({ label, value, onChange }) { return <label className="block"><span className="mb-1.5 block text-sm text-gray-700">{label}</span><input type="date" value={value} onChange={(e) => onChange(e.target.value)} className="h-[42px] w-full rounded-xl border border-gray-400 bg-gray-50 px-3 text-sm text-gray-800 outline-none transition hover:border-gray-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-300" /></label>; }
function Summary({ label, value, highlight }) { return <div className="bg-white px-5 py-4"><div className="flex items-center gap-2"><UsersRound size={13} className={highlight ? "text-[#127475]" : "text-gray-400"}/><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">{label}</p></div><p className={`mt-1.5 text-base font-black tabular-nums ${highlight ? "text-[#127475]" : "text-gray-800"}`}>{money(value)}</p></div>; }
