import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarRange,
  FileDown,
  FileText,
  Loader2,
  Printer,
  Search,
  UsersRound,
  ShoppingCart,
  Wallet,
  Boxes,
} from "lucide-react";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";
import Amount from "../components/Amount";
import Select from "../components/Select";
import StatementPaper from "../components/Reports/StatementPaper";
import OperationalReportPaper from "../components/Reports/OperationalReportPaper";
import {
  fetchCustomers,
  fetchCustomerStatement,
  fetchSuppliers,
  fetchSupplierStatement,
  fetchExpenses,
  fetchPayments,
  fetchPurchases,
  fetchInventory,
} from "../api/commerce";
import { fetchInvoices } from "../api/invoice";
import useAuth from "../hooks/useAuth";

const money = (value) => <Amount value={value} decimals={2} />;
const REPORT_GROUPS = [
  {
    title: "Accounts",
    icon: UsersRound,
    items: [
      {
        label: "Customer Statement",
        value: "statement",
        category: "customer",
        description: "Customer ledger and balance",
      },
      {
        label: "Supplier Statement",
        value: "statement",
        category: "supplier",
        description: "Supplier ledger and balance",
      },
    ],
  },
  {
    title: "Sales & Purchases",
    icon: ShoppingCart,
    items: [
      {
        label: "Sales Report",
        value: "sales",
        description: "Invoices and sales totals",
      },
      {
        label: "Purchase Report",
        value: "purchases",
        description: "Purchases and stock intake",
      },
    ],
  },
  {
    title: "Cash & Expenses",
    icon: Wallet,
    items: [
      {
        label: "Payment Report",
        value: "payments",
        description: "Customer and supplier payments",
      },
      {
        label: "Expense Report",
        value: "expenses",
        description: "Business expenses by date",
      },
    ],
  },
  {
    title: "Inventory",
    icon: Boxes,
    items: [
      {
        label: "Current Stock",
        value: "stock",
        description: "Available pieces and stock cost",
      },
    ],
  },
];
const REPORT_META = {
  sales: {
    title: "Sales Report",
    date: (row) => row.invoice_date || row.created_at || row.createdAt,
    party: (row) => row.customer_name || "Customer",
    ref: (row) => row.invoice_number,
    amount: (row) => row.total_amount,
  },
  purchases: {
    title: "Purchase Report",
    date: (row) => row.purchase_date || row.created_at || row.createdAt,
    party: (row) => row.supplier_name || "Supplier",
    ref: (row) => row.purchase_number,
    amount: (row) => row.total_amount,
  },
  payments: {
    title: "Payment Report",
    date: (row) => row.payment_date || row.created_at || row.createdAt,
    party: (row) => row.party_name || row.party_type || "Account",
    ref: (row) => row.reference || row.payment_method || "Payment",
    amount: (row) => row.amount,
  },
  expenses: {
    title: "Expense Report",
    date: (row) => row.expense_date || row.created_at || row.createdAt,
    party: (row) => row.category || row.paid_to || "Expense",
    ref: (row) => row.expense_number || row.notes || "Expense",
    amount: (row) => row.amount,
  },
  stock: {
    title: "Current Stock Report",
    date: () => "",
    party: (row) => row.supplier_name || "-",
    ref: (row) => row.article_no,
    amount: (row) =>
      Number(row.stock_pcs || 0) * Number(row.purchase_rate || 0),
  },
};
const rowsFrom = (result) => {
  const rows = result?.data?.data ?? result?.data ?? result;
  return Array.isArray(rows) ? rows : [];
};
const dateKey = (value) => String(value || "").slice(0, 10);

export default function Reports() {
  const { user } = useAuth();
  const [category, setCategory] = useState("customer");
  const [reportType, setReportType] = useState("statement");
  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [data, setData] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    if (reportType !== "statement") {
      setParties([]);
      setPartyId("");
      setPartiesLoading(false);
      return () => {
        live = false;
      };
    }
    const loadParties = async () => {
      setPartiesLoading(true);
      setPartyId("");
      setData(null);
      setError("");
      try {
        const rows =
          category === "customer"
            ? await fetchCustomers()
            : await fetchSuppliers();
        if (live) setParties(Array.isArray(rows) ? rows : []);
      } catch (e) {
        if (live) {
          setParties([]);
          setError(
            e?.response?.data?.message ||
              e?.message ||
              "Could not load accounts",
          );
        }
      } finally {
        if (live) setPartiesLoading(false);
      }
    };
    loadParties();
    return () => {
      live = false;
    };
  }, [category, reportType]);

  const partyOptions = useMemo(
    () =>
      parties.map((party) => ({
        value: String(party._id),
        label:
          party[category === "customer" ? "customer_name" : "supplier_name"] ||
          "Unnamed account",
      })),
    [parties, category],
  );
  const selected = useMemo(
    () => parties.find((party) => String(party._id) === String(partyId)),
    [parties, partyId],
  );
  const selectedName =
    selected?.[category === "customer" ? "customer_name" : "supplier_name"] ||
    "Account";

  const generate = async () => {
    if (reportType === "statement" && !partyId) {
      setError(`Select a ${category} first`);
      return;
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("From date cannot be after To date");
      return;
    }
    setData(null);
    setReportData(null);
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (reportType === "statement") {
        setData(
          await (category === "customer"
            ? fetchCustomerStatement(partyId, params)
            : fetchSupplierStatement(partyId, params)),
        );
        setReportData(null);
      } else {
        const source = {
          sales: () => fetchInvoices({ page: 1, limit: 5000 }),
          purchases: fetchPurchases,
          payments: fetchPayments,
          expenses: fetchExpenses,
          stock: fetchInventory,
        }[reportType];
        const rows = rowsFrom(await source());
        const meta = REPORT_META[reportType];
        const filtered =
          reportType === "stock"
            ? rows
            : rows.filter((row) => {
                const date = dateKey(meta.date(row));
                return (
                  date &&
                  (!dateFrom || date >= dateFrom) &&
                  (!dateTo || date <= dateTo)
                );
              });
        setReportData({ type: reportType, rows: filtered, dateFrom, dateTo });
        setData(null);
      }
    } catch (e) {
      setData(null);
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Could not generate statement",
      );
    } finally {
      setLoading(false);
    }
  };

  const clearPreview = () => {
    setData(null);
    setReportData(null);
  };
  useEffect(() => () => removeStatementPrintClone(), []);

  const print = () => {
    if (!data && !reportData) return;
    const source = document.querySelector(
      data ? ".statement-sheet" : ".report-paper",
    );
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
  const selectedReport =
    REPORT_GROUPS.flatMap((group) => group.items).find(
      (item) =>
        item.value === reportType &&
        (!item.category || item.category === category),
    ) || REPORT_GROUPS[0].items[0];

  return (
    <div className="reports-page relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col overflow-hidden">
      <PageHeader
        title="Reporting"
        subtitle="Simple business reports and account statements, ready to print."
      />
      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {REPORT_GROUPS.map((group) => {
              const GroupIcon = group.icon;
              return (
                <section
                  key={group.title}
                  className="rounded-3xl border border-gray-300 bg-white p-4 sm:p-5"
                >
                  <div className="mb-3 flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-[#127475]">
                      <GroupIcon size={17} />
                    </span>
                    <h2 className="text-sm font-semibold text-gray-800">
                      {group.title}
                    </h2>
                  </div>
                  <div className="grid gap-2">
                    {group.items.map((item) => {
                      const active =
                        item.value === reportType &&
                        (!item.category || item.category === category);
                      return (
                        <button
                          key={`${item.value}-${item.category || "all"}`}
                          type="button"
                          onClick={() => {
                            setReportType(item.value);
                            if (item.category) setCategory(item.category);
                            clearPreview();
                            setError("");
                          }}
                          className={`flex min-w-0 items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition ${active ? "border-teal-200 bg-teal-50/70" : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"}`}
                        >
                          <span
                            className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${active ? "bg-teal-600" : "bg-gray-300"}`}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-semibold text-gray-800">
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-[10px] leading-4 text-gray-500">
                              {item.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
          <section className="overflow-hidden rounded-3xl border border-gray-300 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-300 bg-gray-100 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-teal-50 p-2 text-[#127475]">
                  <FileText size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    {selectedReport.label}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {selectedReport.description}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-500">
                {reportType === "statement"
                  ? "Blank dates show full account history"
                  : reportType === "stock"
                    ? "Stock balances are current"
                    : "Dates are optional"}
              </div>
            </div>
            <div
              className={`grid gap-4 p-4 sm:p-5 lg:p-6 ${reportType === "statement" ? "xl:grid-cols-[minmax(260px,1fr)_170px_170px_auto]" : "xl:grid-cols-[1fr_1fr_auto]"}`}
            >
              {reportType === "statement" && (
                <Select
                  label={category === "customer" ? "Customer" : "Supplier"}
                  options={partyOptions}
                  value={partyId}
                  disabled={partiesLoading}
                  placeholder={
                    partiesLoading
                      ? "Loading accounts..."
                      : `Select ${category}`
                  }
                  onChange={(value) => {
                    setPartyId(value);
                    clearPreview();
                    setError("");
                  }}
                />
              )}
              <DateField
                label="From Date"
                value={dateFrom}
                onChange={(value) => {
                  setDateFrom(value);
                  clearPreview();
                }}
              />
              <DateField
                label="To Date"
                value={dateTo}
                onChange={(value) => {
                  setDateTo(value);
                  clearPreview();
                }}
              />
              <div className="flex items-end">
                <Button
                  icon={Search}
                  onClick={generate}
                  disabled={
                    loading || (reportType === "statement" && partiesLoading)
                  }
                  className="w-full xl:min-w-32"
                >
                  {loading ? "Generating..." : "Generate"}
                </Button>
              </div>
            </div>
            {error && (
              <div className="mx-4 mb-5 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:mx-6">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}
          </section>
          {!data && !reportData && !loading && (
            <section className="flex min-h-28 items-center gap-4 rounded-3xl border border-gray-300 bg-white px-5 py-5 sm:px-6">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                <FileText size={19} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {reportType === "statement"
                    ? "Statement preview"
                    : "Report preview"}
                </p>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
                  {reportType === "statement"
                    ? "Choose Customer or Supplier, select an account and generate the complete ledger or a specific date range."
                    : "Choose a date range and generate a clear, printable report for your business."}
                </p>
              </div>
            </section>
          )}
          {loading && (
            <div className="flex min-h-64 items-center justify-center gap-2 rounded-3xl border border-gray-300 bg-white text-sm text-gray-500">
              <Loader2 size={18} className="animate-spin" /> Preparing detailed
              account statement...
            </div>
          )}
          {data && (
            <section className="mt-5 overflow-hidden rounded-3xl border border-gray-300 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#127475]">
                      {category}
                    </span>
                    <p className="truncate text-sm font-bold text-gray-900">
                      {selectedName}
                    </p>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                    <CalendarRange size={13} />
                    {data.period?.full_statement
                      ? "Full account statement"
                      : `${data.period?.date_from || "Beginning"} to ${data.period?.date_to || "Present"}`}{" "}
                    · {data.rows?.length || 0} transactions
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button outline icon={Printer} onClick={print}>
                    Print
                  </Button>
                  <Button icon={FileDown} onClick={exportPdf}>
                    Save PDF
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-px border-b border-gray-200 bg-gray-200 lg:grid-cols-4">
                <Summary label="Opening Balance" value={data.opening_balance} />
                <Summary label="Total Debit" value={data.totals?.debit} />
                <Summary label="Total Credit" value={data.totals?.credit} />
                <Summary
                  label="Closing Balance"
                  value={data.closing_balance}
                  highlight
                />
              </div>
              <div className="statement-preview-stage overflow-auto bg-[#e9eeed] p-4 sm:p-5 lg:p-6">
                <div className="statement-sheet mx-auto min-h-[297mm] w-[210mm] max-w-none bg-white px-[7mm] py-[6mm] shadow-[0_12px_40px_rgba(15,23,42,0.14)]">
                  <StatementPaper
                    data={data}
                    type={category}
                    business={user?.business || {}}
                  />
                </div>
              </div>
            </section>
          )}
          {reportData && (
            <OperationalReport
              data={reportData}
              business={user?.business || {}}
              onPrint={print}
            />
          )}
        </div>
      </div>
      <style>{`@media print{@page{size:A4 portrait!important;margin:6mm!important}.report-paper{display:block!important;box-sizing:border-box!important;width:100%!important;max-width:none!important;margin:0!important;padding:5mm!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important}.report-paper table{width:100%!important;min-width:0!important;table-layout:fixed!important}.report-paper th,.report-paper td{padding:5px!important;overflow-wrap:anywhere}.report-row{break-inside:avoid!important;page-break-inside:avoid!important}.report-paper header,.report-paper footer{break-inside:avoid!important;page-break-inside:avoid!important}}`}</style>
      <style>{`@media print{@page{size:A4 portrait;margin:6mm}html,body,#root{width:100%!important;max-width:none!important;height:auto!important;min-height:0!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff!important}body.printing-statement>*:not(#statement-print-clone-root){display:none!important}#statement-print-clone-root{display:block!important;width:100%!important;margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important}#statement-print-clone-root,#statement-print-clone-root *{visibility:visible!important}.statement-preview-stage{display:block!important;position:static!important;box-sizing:border-box!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important;background:#fff!important}.statement-sheet{display:block!important;position:static!important;box-sizing:border-box!important;width:100%!important;max-width:none!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;background:#fff!important;box-shadow:none!important;overflow:visible!important}.statement-paper{box-sizing:border-box!important;width:100%!important;max-width:100%!important;min-width:0!important;margin:0!important;padding:0!important;background:#fff!important;color:#111827!important;overflow:visible!important;break-inside:auto!important;page-break-inside:auto!important}.statement-paper .statement-head,.statement-paper .party-block,.statement-paper .statement-final,.statement-paper .statement-footer{box-sizing:border-box!important;max-width:100%!important}.statement-paper table{box-sizing:border-box!important;width:100%!important;max-width:100%!important;min-width:0!important;table-layout:fixed!important;border-collapse:separate!important}.statement-paper thead{display:table-header-group!important}.statement-paper tbody{break-inside:auto!important;page-break-inside:auto!important}.statement-paper th,.statement-paper td{box-sizing:border-box!important;min-width:0!important}.statement-row{break-inside:avoid!important;page-break-inside:avoid!important}.statement-head,.party-block{break-after:avoid!important;page-break-after:avoid!important}.statement-final,.statement-footer{break-inside:avoid!important;page-break-inside:avoid!important}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}`}</style>
    </div>
  );
}
function removeStatementPrintClone() {
  document.getElementById("statement-print-clone-root")?.remove();
  document.body.classList.remove("printing-statement");
}
function OperationalReport({ data, business, onPrint }) {
  const meta = REPORT_META[data.type];
  const stock = data.type === "stock";
  const total = data.rows.reduce(
    (sum, row) => sum + Number(meta.amount(row) || 0),
    0,
  );
  const reportDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  return (
    <section className="mt-5 overflow-hidden rounded-3xl border border-gray-300 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-bold text-gray-900">{meta.title}</h2>
          <p className="mt-1 text-xs text-gray-500">
            {stock
              ? "Current available stock"
              : `${dateFromLabel(data.rows, meta)} · ${data.rows.length} records`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button outline icon={Printer} onClick={onPrint}>
            Print
          </Button>
          <Button icon={FileDown} onClick={onPrint}>
            Save PDF
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-b border-gray-200 bg-gray-200 sm:grid-cols-3">
        <Metric
          label={stock ? "Articles" : "Records"}
          value={data.rows.length.toLocaleString()}
        />
        <Metric
          label={stock ? "Stock Pieces" : "Total Amount"}
          value={
            stock
              ? data.rows
                  .reduce((sum, row) => sum + Number(row.stock_pcs || 0), 0)
                  .toLocaleString()
              : money(total)
          }
          highlight
        />
        <Metric
          label={stock ? "Stock Cost Value" : "Report Date"}
          value={stock ? money(total) : reportDate}
        />
      </div>
      <div className="statement-preview-stage overflow-auto bg-[#e9eeed] p-4 sm:p-5 lg:p-6">
        <div className="mx-auto min-h-[297mm] w-[210mm] max-w-none bg-white shadow-[0_12px_40px_rgba(15,23,42,0.14)]">
          <OperationalReportPaper data={data} business={business} meta={meta} />
        </div>
      </div>
    </section>
  );
}
function formatReportDate(value) {
  return value
    ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(
        "en-GB",
        { day: "2-digit", month: "short", year: "numeric" },
      )
    : "-";
}
function dateFromLabel(rows, meta) {
  const dates = rows
    .map((row) => meta.date(row))
    .filter(Boolean)
    .map((date) => String(date).slice(0, 10))
    .sort();
  return dates.length
    ? `${formatReportDate(dates[0])} — ${formatReportDate(dates.at(-1))}`
    : "Selected period";
}
function Metric({ label, value, highlight = false }) {
  return (
    <div className="bg-white px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
        {label}
      </p>
      <p
        className={`mt-1.5 text-base font-bold tabular-nums ${highlight ? "text-[#127475]" : "text-gray-800"}`}
      >
        {value}
      </p>
    </div>
  );
}
function DateField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-gray-700">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[42px] w-full rounded-xl border border-gray-400 bg-gray-50 px-3 text-sm text-gray-800 outline-none transition hover:border-gray-500 focus:border-teal-400 focus:ring-2 focus:ring-teal-300"
      />
    </label>
  );
}
function Summary({ label, value, highlight }) {
  return (
    <div className="bg-white px-5 py-4">
      <div className="flex items-center gap-2">
        <UsersRound
          size={13}
          className={highlight ? "text-[#127475]" : "text-gray-400"}
        />
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
          {label}
        </p>
      </div>
      <p
        className={`mt-1.5 text-base font-black tabular-nums ${highlight ? "text-[#127475]" : "text-gray-800"}`}
      >
        {money(value)}
      </p>
    </div>
  );
}
