const money = (value) => Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const date = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB") : "-";
const signedBalance = (value) => {
  const amount = Number(value || 0);
  if (!amount) return "Rs 0.00";
  return `Rs ${money(Math.abs(amount))} ${amount < 0 ? "Cr" : "Dr"}`;
};

export default function StatementPaper({ data, type }) {
  const customer = type === "customer";
  const party = data?.party || {};
  const totals = data?.totals || {};
  const period = data?.period || {};
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const name = party[customer ? "customer_name" : "supplier_name"] || "-";
  const range = period.full_statement ? "Complete account history" : `${period.date_from ? date(period.date_from) : "Beginning"} — ${period.date_to ? date(period.date_to) : "Present"}`;

  return <article className="statement-paper bg-white text-slate-900">
    <header className="statement-header flex items-start justify-between gap-8 border-b-2 border-slate-900 pb-4">
      <div>
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#127475] text-lg font-black text-white">T</div><div><h1 className="text-xl font-black tracking-tight">TexTradeOS PRO</h1><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Business Account Statement</p></div></div>
      </div>
      <div className="text-right"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#127475]">{customer ? "Customer" : "Supplier"} Ledger</p><h2 className="mt-1 text-xl font-black">Account Statement</h2><p className="mt-1 text-[10px] text-slate-500">{range}</p></div>
    </header>

    <section className="mt-4 grid grid-cols-[1.35fr_1fr] gap-4">
      <div className="rounded-xl border border-slate-200 p-4"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Account Details</p><div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-[10px]"><Info label={customer ? "Customer" : "Supplier"} value={name}/><Info label="Contact Person" value={party.person_name || "-"}/><Info label="Phone" value={party.phone_number || "-"}/><Info label="City" value={party.city || "-"}/><div className="col-span-2"><Info label="Address" value={party.address || "-"}/></div>{party.urdu_title && <div className="col-span-2"><Info label="Urdu Title" value={party.urdu_title}/></div>}</div></div>
      <div className="rounded-xl border border-slate-200 p-4"><div className="grid h-full grid-cols-2 gap-x-5 gap-y-3"><Metric label="Opening Balance" value={data?.opening_balance}/><Metric label="Closing Balance" value={data?.closing_balance} strong/><Metric label="Total Debit" value={totals.debit}/><Metric label="Total Credit" value={totals.credit}/></div></div>
    </section>

    <section className="mt-4 overflow-hidden rounded-xl border border-slate-300">
      <table className="w-full table-fixed border-collapse text-[9px]">
        <colgroup><col className="w-[4%]"/><col className="w-[9%]"/><col className="w-[15%]"/><col className="w-[34%]"/><col className="w-[12%]"/><col className="w-[12%]"/><col className="w-[14%]"/></colgroup>
        <thead><tr className="bg-slate-100 text-left text-[8px] font-bold uppercase tracking-[0.09em] text-slate-500"><th className="border-b border-slate-300 px-2 py-2.5 text-center">#</th><th className="border-b border-slate-300 px-2 py-2.5">Date</th><th className="border-b border-slate-300 px-2 py-2.5">Document / Ref</th><th className="border-b border-slate-300 px-2 py-2.5">Transaction Details</th><th className="border-b border-slate-300 px-2 py-2.5 text-right">Debit (Rs)</th><th className="border-b border-slate-300 px-2 py-2.5 text-right">Credit (Rs)</th><th className="border-b border-slate-300 px-2 py-2.5 text-right">Running Balance</th></tr></thead>
        <tbody>{rows.length ? rows.map((row, index) => <tr key={`${row.type}-${row.id}-${index}`} className="statement-row border-b border-slate-200 last:border-b-0"><td className="px-2 py-2 text-center align-top text-slate-400">{index + 1}</td><td className="px-2 py-2 align-top whitespace-nowrap">{date(row.date)}</td><td className="px-2 py-2 align-top"><p className="font-bold text-slate-800">{row.reference || "-"}</p>{row.reference_no && <p className="mt-0.5 text-[8px] text-slate-400">Ref: {row.reference_no}</p>}</td><td className="px-2 py-2 align-top"><p className="font-semibold text-slate-800">{row.description || "Transaction"}</p><div className="mt-0.5 flex flex-wrap gap-x-3 text-[8px] text-slate-400">{row.method && <span>Method: {row.method}</span>}{row.total_pcs != null && <span>PCs: {row.total_pcs}</span>}{row.article_count != null && <span>Articles: {row.article_count}</span>}{row.packet_count != null && <span>Packets: {row.packet_count}</span>}</div>{row.notes && <p className="mt-0.5 text-[8px] leading-3 text-slate-500">{row.notes}</p>}</td><td className="px-2 py-2 text-right align-top font-medium tabular-nums">{row.debit ? money(row.debit) : "—"}</td><td className="px-2 py-2 text-right align-top font-medium tabular-nums">{row.credit ? money(row.credit) : "—"}</td><td className="px-2 py-2 text-right align-top font-bold tabular-nums">{signedBalance(row.running_balance)}</td></tr>) : <tr><td colSpan="7" className="px-4 py-14 text-center text-xs text-slate-400">No account transactions found for this period.</td></tr>}</tbody>
        <tfoot><tr className="bg-slate-50 font-bold"><td colSpan="4" className="border-t-2 border-slate-800 px-3 py-3 text-right text-[9px] uppercase tracking-wide">Period Totals</td><td className="border-t-2 border-slate-800 px-2 py-3 text-right tabular-nums">{money(totals.debit)}</td><td className="border-t-2 border-slate-800 px-2 py-3 text-right tabular-nums">{money(totals.credit)}</td><td className="border-t-2 border-slate-800 px-2 py-3 text-right tabular-nums">{signedBalance(data?.closing_balance)}</td></tr></tfoot>
      </table>
    </section>

    <section className="mt-4 flex items-center justify-between gap-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><div><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">Statement Summary</p><p className="mt-1 text-[9px] text-slate-600">{rows.length} transaction{rows.length === 1 ? "" : "s"} · {range}</p></div><div className="text-right"><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">Closing Balance</p><p className="mt-1 text-base font-black text-slate-900">{signedBalance(data?.closing_balance)}</p></div></section>
    <footer className="mt-5 flex items-center justify-between border-t border-slate-200 pt-3 text-[8px] text-slate-400"><span>TexTradeOS PRO · Computer generated account statement</span><span>Generated {new Date().toLocaleString()}</span></footer>
  </article>;
}
function Info({ label, value }) { return <div className="min-w-0"><span className="text-slate-400">{label}</span><p className="mt-0.5 break-words font-semibold text-slate-800">{value}</p></div>; }
function Metric({ label, value, strong }) { return <div><p className="text-[8px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p><p className={`mt-1 whitespace-nowrap text-[12px] font-black tabular-nums ${strong ? "text-[#127475]" : "text-slate-800"}`}>{signedBalance(value)}</p></div>; }
