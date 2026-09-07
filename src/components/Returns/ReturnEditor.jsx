import { useMemo, useState } from "react";
import { Plus, ScanLine, Trash2 } from "lucide-react";
import Button from "../Button";
import Input from "../Input";
import Select from "../Select";
import { SectionHeader } from "../SectionHeader";
import InvoiceScanModal, { unlockScanAudio } from "../Scanner/InvoiceScanModal";

const n = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};
const keyOf = (item) => `${item.article_no}::${item.purchase_number || ""}`;
const discountAmount = (input, base, pcs = 1) => {
  const raw = String(input || "").trim();
  if (!raw) return 0;
  if (raw.endsWith("%")) return base * Math.min(100, Math.max(0, n(raw.slice(0, -1)))) / 100;
  return Math.min(base, Math.max(0, n(raw)) * Math.max(1, n(pcs)));
};

export const returnTotals = (rows = [], adjustment = {}) => {
  const keepGoods = adjustment.type === "keep_goods";
  const calculatedRows = rows.map((row) => {
    const gross = n(row.pcs) * n(row.rate);
    const discount = keepGoods ? 0 : discountAmount(row.discount, gross, row.pcs);
    return { gross, amount: Math.max(0, gross - discount), discount };
  });
  const gross = calculatedRows.reduce((sum, row) => sum + row.gross, 0);
  const pcs = rows.reduce((sum, row) => sum + n(row.pcs), 0);
  const raw = String(adjustment.value || "").trim();

  if (keepGoods) {
    const allowance = raw.endsWith("%")
      ? gross * Math.min(100, Math.max(0, n(raw.slice(0, -1)))) / 100
      : Math.min(gross, Math.max(0, n(raw)) * pcs);
    return { pcs, gross, itemDiscount: 0, totalDiscount: allowance, adjustment: allowance, calculatedAmount: allowance, amount: allowance };
  }

  const itemDiscount = calculatedRows.reduce((sum, row) => sum + row.discount, 0);
  const afterItems = calculatedRows.reduce((sum, row) => sum + row.amount, 0);
  const totalDiscount = raw.endsWith("%")
    ? afterItems * Math.min(100, Math.max(0, n(raw.slice(0, -1)))) / 100
    : Math.min(afterItems, Math.max(0, n(raw)));
  const calculatedAmount = Math.max(0, afterItems - totalDiscount);
  const manual = String(adjustment.total_amount ?? "").trim() !== "";
  const amount = manual ? Math.max(0, Math.min(afterItems, n(adjustment.total_amount))) : calculatedAmount;
  return { pcs, gross, itemDiscount, totalDiscount, adjustment: gross - amount, calculatedAmount, amount };
};

export default function ReturnEditor({
  title = "Returned Articles",
  subtitle = "Select an article or scan its label",
  inventory = [],
  rows = [],
  onChange,
  adjustment = { value: "", total_amount: "" },
  onAdjustmentChange,
  allowKeepGoods = false,
}) {
  const [articleNo, setArticleNo] = useState("");
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [error, setError] = useState("");
  const keepGoods = allowKeepGoods && adjustment.type === "keep_goods";
  const totals = returnTotals(rows, adjustment);
  const options = useMemo(() => inventory.map((article) => ({
    value: keyOf(article),
    label: `${article.article_no} | ${article.description || "Article"} | ${n(article.available_pcs ?? article.pcs ?? article.quantity_pcs)} pcs`,
  })), [inventory]);

  const add = (code) => {
    const article = inventory.find((item) => keyOf(item) === code);
    if (!article) {
      setError(code ? "Selected article is not available for this return." : "Select an article first.");
      return;
    }
    const max = n(article.available_pcs ?? article.pcs ?? article.quantity_pcs);
    const rowKey = keyOf(article);
    const existing = rows.find((row) => keyOf(row) === rowKey);
    if (existing) onChange(rows.map((row) => keyOf(row) === rowKey ? { ...row, pcs: Math.min(max || 999999, n(row.pcs) + 1) } : row));
    else onChange([...rows, { article_no: article.article_no, purchase_number: article.purchase_number || "", description: article.description || "", pcs: 1, available_pcs: max, rate: n(article.sale_rate || article.rate), discount: article.discount || "" }]);
    setError("");
    setArticleNo("");
  };

  const updateRow = (index, field, value) => onChange(rows.map((row, i) => i !== index ? row : field === "pcs" ? { ...row, pcs: Math.min(n(row.available_pcs) || 999999, Math.max(0, n(value))) } : { ...row, [field]: value }));
  const scanInventory = useMemo(() => inventory.map((article) => {
    const added = rows.find((row) => keyOf(row) === keyOf(article));
    const available = n(article.available_pcs ?? article.pcs ?? article.quantity_pcs);
    return { ...article, stock_pcs: Math.max(0, available - n(added?.pcs)), unit: Math.max(1, n(article.unit) || 1), sale_rate: n(article.sale_rate || article.rate) };
  }).filter((article) => article.stock_pcs > 0), [inventory, rows]);

  const mergeScannedRows = (scannedRows) => {
    let next = [...rows];
    for (const scanned of scannedRows) {
      const source = inventory.find((article) => article.article_no === scanned.article_no);
      if (!source) continue;
      const max = n(source.available_pcs ?? source.pcs ?? source.quantity_pcs);
      const index = next.findIndex((row) => keyOf(row) === keyOf(source));
      if (index >= 0) next[index] = { ...next[index], pcs: Math.min(max, n(next[index].pcs) + n(scanned.pcs)) };
      else next.push({ article_no: source.article_no, purchase_number: source.purchase_number || "", description: source.description || "", pcs: Math.min(max, n(scanned.pcs)), available_pcs: max, rate: n(source.sale_rate || source.rate), discount: source.discount || "" });
    }
    onChange(next);
    setScanModalOpen(false);
    setError("");
  };

  return <div className="grid gap-3">
    <SectionHeader title={title} subtitle={subtitle} right={<Button size="sm" outline icon={ScanLine} onClick={async () => { await unlockScanAudio().catch(() => false); setScanModalOpen(true); }}>Scan QR</Button>} />
    {allowKeepGoods && <div className="rounded-xl border border-gray-300 bg-gray-50 p-3"><Select label="Supplier Settlement" value={keepGoods ? "keep_goods" : "return_stock"} onChange={(value) => onAdjustmentChange({ type: value === "keep_goods" ? "keep_goods" : "none", value: "", total_amount: "" })} options={[{ value: "return_stock", label: "Return goods to supplier" }, { value: "keep_goods", label: "Keep goods — supplier gives price allowance" }]} /><p className="mt-2 text-xs text-gray-500">{keepGoods ? "Stock stays with you. Enter the supplier's reduction as Rs per piece (for example 5) or percentage (for example 5%)." : "Goods physically leave your stock and are returned to the supplier."}</p></div>}
    <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><Select label="Add Article" value={articleNo} onChange={setArticleNo} options={options} placeholder="Search article number or description" /><Button className="md:mb-px" icon={Plus} onClick={() => add(articleNo)}>Add Article</Button></div>
    {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    <div className="overflow-hidden rounded-xl border border-gray-300 bg-white">
      <div className={`hidden gap-2 border-b border-gray-300 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-500 md:grid ${keepGoods ? "grid-cols-[minmax(0,1fr)_90px_105px_115px_40px]" : "grid-cols-[minmax(0,1fr)_90px_105px_105px_115px_40px]"}`}><span>Article</span><span>{keepGoods ? "Affected PCs" : "Return PCs"}</span><span>Rate</span>{!keepGoods && <span>Discount</span>}<span className="text-right">{keepGoods ? "Purchase Value" : "Amount"}</span><span /></div>
      {rows.length === 0 ? <div className="px-4 py-9 text-center"><p className="text-sm font-semibold text-gray-700">No article added</p><p className="mt-1 text-xs text-gray-400">Search an article above or scan its label.</p></div> : rows.map((row, index) => {
        const gross = n(row.pcs) * n(row.rate);
        const final = keepGoods ? gross : Math.max(0, gross - discountAmount(row.discount, gross, row.pcs));
        return <div key={`${keyOf(row)}-${index}`} className={`grid gap-2 border-b border-gray-200 px-3 py-3 last:border-0 md:items-center ${keepGoods ? "md:grid-cols-[minmax(0,1fr)_90px_105px_115px_40px]" : "md:grid-cols-[minmax(0,1fr)_90px_105px_105px_115px_40px]"}`}><div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-800">{row.description || row.article_no}</p><p className="mt-0.5 text-xs text-gray-400"><span className="font-medium text-teal-700">{row.article_no}</span> · Available {row.available_pcs || 0} pcs</p></div><Input type="number" min="1" max={row.available_pcs || undefined} value={row.pcs} onChange={(event) => updateRow(index, "pcs", event.target.value)} /><Input type="number" min="0" value={row.rate} onChange={(event) => updateRow(index, "rate", event.target.value)} />{!keepGoods && <Input value={row.discount || ""} onChange={(event) => updateRow(index, "discount", event.target.value)} placeholder="10 or 5%" />}<p className="text-right text-sm font-semibold tabular-nums text-gray-800">{final.toFixed(2)}</p><button type="button" onClick={() => onChange(rows.filter((_, i) => i !== index))} className="justify-self-end rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></div>;
      })}
    </div>
    {rows.length > 0 && (keepGoods ? <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 lg:grid-cols-[1fr_minmax(320px,1.4fr)] lg:items-end"><Input label="Supplier Less / Allowance" value={adjustment.value || ""} onChange={(event) => onAdjustmentChange({ ...adjustment, type: "keep_goods", value: event.target.value, total_amount: "" })} placeholder="5 per pc or 5%" /><div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-300 bg-white text-sm"><div className="px-3 py-2.5"><span className="text-xs text-gray-400">PCs Kept</span><p className="font-bold tabular-nums">{totals.pcs}</p></div><div className="border-l border-gray-200 px-3 py-2.5"><span className="text-xs text-gray-400">Purchase Value</span><p className="font-semibold tabular-nums">{totals.gross.toFixed(2)}</p></div><div className="border-l border-gray-200 px-3 py-2.5"><span className="text-xs text-gray-400">Supplier Less</span><p className="font-bold tabular-nums text-amber-700">-{totals.amount.toFixed(2)}</p></div></div></div> : <div className="grid gap-3 rounded-xl border border-gray-300 bg-gray-50 p-3 lg:grid-cols-[1fr_1fr_minmax(280px,1.2fr)] lg:items-end"><Input label="Total Amount" type="number" min="0" value={String(adjustment.total_amount ?? "").trim() !== "" ? adjustment.total_amount : totals.calculatedAmount.toFixed(2)} onChange={(event) => onAdjustmentChange({ ...adjustment, total_amount: event.target.value })} /><Input label="Discount / Less" value={adjustment.value || ""} onChange={(event) => onAdjustmentChange({ ...adjustment, value: event.target.value, total_amount: "" })} placeholder="100 or 5%" /><div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-300 bg-white text-sm"><div className="px-3 py-2.5"><span className="text-xs text-gray-400">PCs</span><p className="font-bold tabular-nums">{totals.pcs}</p></div><div className="border-l border-gray-200 px-3 py-2.5"><span className="text-xs text-gray-400">Gross</span><p className="font-semibold tabular-nums">{totals.gross.toFixed(2)}</p></div><div className="border-l border-gray-200 px-3 py-2.5"><span className="text-xs text-gray-400">Return</span><p className="font-bold tabular-nums text-red-600">-{totals.amount.toFixed(2)}</p></div></div></div>)}
    <InvoiceScanModal isOpen={scanModalOpen} inventory={scanInventory} onClose={() => setScanModalOpen(false)} onApply={mergeScannedRows} contextLabel="return" />
  </div>;
}
