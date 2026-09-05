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

export const returnTotals = (rows = [], adjustment = {}) => {
  const gross = rows.reduce((sum, row) => sum + n(row.pcs) * n(row.rate), 0);
  let amount = gross;
  if (adjustment.type === "percent") amount = gross - (gross * Math.min(100, n(adjustment.value))) / 100;
  if (adjustment.type === "per_piece") amount = gross - rows.reduce((sum, row) => sum + n(row.pcs) * n(adjustment.value), 0);
  if (adjustment.type === "round") amount = n(adjustment.value);
  if (adjustment.type === "keep_amount") amount = n(adjustment.value);
  if (adjustment.type === "keep_percent") amount = (gross * Math.min(100, n(adjustment.value))) / 100;
  if (adjustment.type === "keep_per_piece") amount = rows.reduce((sum, row) => sum + n(row.pcs) * n(adjustment.value), 0);
  amount = Math.max(0, Math.min(gross, amount));
  return { pcs: rows.reduce((sum, row) => sum + n(row.pcs), 0), gross, adjustment: gross - amount, amount };
};

export default function ReturnEditor({
  title = "Returned Articles",
  subtitle = "Select an article or scan its label",
  inventory = [],
  rows = [],
  onChange,
  adjustment = { type: "none", value: "" },
  onAdjustmentChange,
  allowKeepGoods = false,
}) {
  const [articleNo, setArticleNo] = useState("");
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [error, setError] = useState("");
  const totals = returnTotals(rows, adjustment);

  const options = useMemo(() => inventory.map((article) => ({
    value: article.article_no,
    label: `${article.article_no} | ${article.description || "Article"} | ${n(article.available_pcs ?? article.pcs ?? article.quantity_pcs)} pcs`,
  })), [inventory]);

  const add = (code) => {
    const cleanCode = String(code || "").trim();
    const article = inventory.find((item) => String(item.article_no).trim().toLowerCase() === cleanCode.toLowerCase());
    if (!article) {
      setError(cleanCode ? `Article ${cleanCode} is not available for this return.` : "Select an article first.");
      return;
    }
    const max = n(article.available_pcs ?? article.pcs ?? article.quantity_pcs);
    const existing = rows.find((row) => row.article_no === article.article_no);
    if (existing) {
      onChange(rows.map((row) => row.article_no === article.article_no
        ? { ...row, pcs: Math.min(max || 999999, n(row.pcs) + 1) }
        : row));
    } else {
      onChange([...rows, {
        article_no: article.article_no,
        description: article.description || "",
        pcs: 1,
        available_pcs: max,
        rate: n(article.sale_rate || article.rate),
        source_id: article.source_id || "",
      }]);
    }
    setError("");
    setArticleNo("");
  };

  const updateRow = (index, field, value) => {
    onChange(rows.map((row, rowIndex) => {
      if (rowIndex !== index) return row;
      if (field === "pcs") {
        const max = n(row.available_pcs) || 999999;
        return { ...row, pcs: Math.min(max, Math.max(0, n(value))) };
      }
      return { ...row, [field]: value };
    }));
  };

  const scanInventory = useMemo(() => inventory.map((article) => {
    const alreadyAdded = rows.find((row) => row.article_no === article.article_no);
    const available = n(article.available_pcs ?? article.pcs ?? article.quantity_pcs);
    const remaining = Math.max(0, available - n(alreadyAdded?.pcs));
    return {
      ...article,
      stock_pcs: remaining,
      unit: Math.max(1, n(article.unit) || 1),
      sale_rate: n(article.sale_rate || article.rate),
    };
  }).filter((article) => article.stock_pcs > 0), [inventory, rows]);

  const mergeScannedRows = (scannedRows) => {
    let next = [...rows];
    for (const scanned of scannedRows) {
      const source = inventory.find((article) => article.article_no === scanned.article_no);
      if (!source) continue;
      const max = n(source.available_pcs ?? source.pcs ?? source.quantity_pcs);
      const index = next.findIndex((row) => row.article_no === scanned.article_no);
      if (index >= 0) {
        const wanted = n(next[index].pcs) + n(scanned.pcs);
        next[index] = { ...next[index], pcs: Math.min(max, wanted) };
      } else {
        next.push({
          article_no: source.article_no,
          description: source.description || "",
          pcs: Math.min(max, n(scanned.pcs)),
          available_pcs: max,
          rate: n(source.sale_rate || source.rate),
          source_id: source.source_id || "",
        });
      }
    }
    onChange(next);
    setScanModalOpen(false);
    setError("");
  };

  const settlementOptions = [
    { value: "none", label: "Full return value" },
    { value: "per_piece", label: "Less amount per piece" },
    { value: "percent", label: "Less percentage" },
    { value: "round", label: "Set round return amount" },
    ...(allowKeepGoods ? [
      { value: "keep_per_piece", label: "Keep goods · allowance per piece" },
      { value: "keep_percent", label: "Keep goods · percentage allowance" },
      { value: "keep_amount", label: "Keep goods · fixed allowance" },
    ] : []),
  ];

  const adjustmentLabel = adjustment.type === "percent" ? "Less %"
    : adjustment.type === "round" ? "Final Return Amount"
      : adjustment.type === "keep_percent" ? "Allowance %"
        : adjustment.type === "keep_amount" ? "Allowance Amount"
          : adjustment.type === "keep_per_piece" ? "Allowance / Pc"
            : "Less / Pc";

  return (
    <div className="grid gap-3">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        right={(
          <Button size="sm" outline icon={ScanLine} onClick={async () => {
            await unlockScanAudio().catch(() => false);
            setScanModalOpen(true);
          }}>
            Scan QR
          </Button>
        )}
      />

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <Select
          label="Add Article"
          value={articleNo}
          onChange={setArticleNo}
          options={options}
          placeholder="Search article number or description"
        />
        <Button className="md:mb-px" icon={Plus} onClick={() => add(articleNo)}>Add Article</Button>
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      <div className="overflow-hidden rounded-xl border border-gray-300 bg-white">
        <div className="hidden grid-cols-[minmax(0,1fr)_100px_120px_120px_40px] gap-2 border-b border-gray-300 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-gray-500 md:grid">
          <span>Article</span><span>Return PCs</span><span>Rate</span><span className="text-right">Amount</span><span />
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-9 text-center">
            <p className="text-sm font-semibold text-gray-700">No return article added</p>
            <p className="mt-1 text-xs text-gray-400">Search an article above or scan its label.</p>
          </div>
        ) : rows.map((row, index) => (
          <div key={`${row.article_no}-${index}`} className="grid gap-2 border-b border-gray-200 px-3 py-3 last:border-0 md:grid-cols-[minmax(0,1fr)_100px_120px_120px_40px] md:items-center">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800">{row.description || row.article_no}</p>
              <p className="mt-0.5 text-xs text-gray-400"><span className="font-medium text-teal-700">{row.article_no}</span> · Available {row.available_pcs || 0} pcs</p>
            </div>
            <Input type="number" min="1" max={row.available_pcs || undefined} value={row.pcs} onChange={(event) => updateRow(index, "pcs", event.target.value)} />
            <Input type="number" min="0" value={row.rate} onChange={(event) => updateRow(index, "rate", event.target.value)} />
            <p className="text-right text-sm font-semibold tabular-nums text-gray-800">{(n(row.pcs) * n(row.rate)).toFixed(2)}</p>
            <button type="button" onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))} className="justify-self-end rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label={`Remove ${row.article_no}`}>
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {rows.length > 0 && (
        <div className="grid gap-3 rounded-xl border border-gray-300 bg-gray-50 p-3 lg:grid-cols-[minmax(220px,1fr)_minmax(180px,0.7fr)_minmax(260px,1fr)] lg:items-end">
          <Select
            label="Return Settlement"
            value={adjustment.type || "none"}
            onChange={(value) => onAdjustmentChange({ ...adjustment, type: value, value: "" })}
            options={settlementOptions}
          />
          {adjustment.type !== "none" ? (
            <Input label={adjustmentLabel} type="number" min="0" value={adjustment.value || ""} onChange={(event) => onAdjustmentChange({ ...adjustment, value: event.target.value })} />
          ) : <div />}
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-300 bg-white text-sm">
            <div className="px-3 py-2.5"><span className="text-xs text-gray-400">PCs</span><p className="font-bold tabular-nums">{totals.pcs}</p></div>
            <div className="border-l border-gray-200 px-3 py-2.5"><span className="text-xs text-gray-400">Gross</span><p className="font-semibold tabular-nums">{totals.gross.toFixed(2)}</p></div>
            <div className="border-l border-gray-200 px-3 py-2.5"><span className="text-xs text-gray-400">Return</span><p className="font-bold tabular-nums text-red-600">-{totals.amount.toFixed(2)}</p></div>
          </div>
        </div>
      )}
      <InvoiceScanModal
        isOpen={scanModalOpen}
        inventory={scanInventory}
        onClose={() => setScanModalOpen(false)}
        onApply={mergeScannedRows}
        contextLabel="return"
      />
    </div>
  );
}
