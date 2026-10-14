import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  RefreshCcw,
  TrendingUp,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import Amount from "../components/Amount";
import Button from "../components/Button";
import Input from "../components/Input";
import Select from "../components/Select";
import { fetchInvoices } from "../api/invoice";
import {
  fetchCustomers,
  fetchExpenses,
  fetchPayments,
  fetchPurchases,
  fetchSuppliers,
} from "../api/commerce";
import { fetchReturns } from "../api/returns.api";
import { fetchDashboardSummary } from "../api/dashboard";
import { formatDate, formatNumbers } from "../utils";
import Modal from "../components/Modal";

const DashboardTrendChart = lazy(
  () => import("../components/DashboardTrendChart"),
);
const asRows = (result) => {
  const rows = result?.data?.data ?? result?.data ?? result;
  return Array.isArray(rows) ? rows : [];
};
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const monthRange = (month) => {
  const [y, m] = String(month || currentMonth())
      .split("-")
      .map(Number),
    last = new Date(y, m, 0).getDate();
  return {
    date_from: `${y}-${String(m).padStart(2, "0")}-01`,
    date_to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  };
};
const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dayRange = (days) => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - days + 1);
  return { date_from: dateKey(start), date_to: dateKey(end) };
};
const rangeForPreset = (preset) => {
  const today = new Date();
  if (preset === "thisMonth")
    return {
      date_from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`,
      date_to: dateKey(today),
    };
  if (preset === "lastMonth") {
    const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const last = new Date(today.getFullYear(), today.getMonth(), 0);
    return { date_from: dateKey(first), date_to: dateKey(last) };
  }
  if (preset === "3months") {
    const first = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return { date_from: dateKey(first), date_to: dateKey(today) };
  }
  return dayRange(7);
};
const completeChartDays = (rows = [], range) => {
  const map = new Map((rows || []).map((row) => [row.day, row]));
  const result = [];
  const cursor = new Date(`${range.date_from}T12:00:00`);
  const end = new Date(`${range.date_to}T12:00:00`);
  while (cursor <= end) {
    const day = dateKey(cursor);
    result.push({
      day,
      ...(map.get(day) || {}),
      sales: Number(map.get(day)?.sales || 0),
      receipts: Number(map.get(day)?.receipts || 0),
      expenses: Number(map.get(day)?.expenses || 0),
      purchases: Number(map.get(day)?.purchases || 0),
      net: Number(map.get(day)?.net || 0),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
};
function Section({ title, subtitle, action, headerPadding = "pr-5", children }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-300 bg-white">
      <div className={`flex flex-col justify-between gap-3 border-b border-gray-300 bg-gray-100 pl-5 ${headerPadding} py-4 sm:flex-row sm:items-center`}>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function EmptyState({ message }) {
  return (
    <p className="px-5 py-10 text-center text-sm text-gray-400">{message}</p>
  );
}
const summaryNumber = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;
function SummaryTable({ summary, view, search }) {
  const query = search.trim().toLowerCase();
  const details = summary?.details || {};
  const matches = (row) =>
    !query || JSON.stringify(row).toLowerCase().includes(query);
  if (view === "summary") {
    const rows = [
      ...(summary?.rows || []),
      { key: "total", label: "Grand Total", ...(summary?.totals || {}) },
    ];
    return (
      <table className="w-full min-w-[760px]">
        <thead className="border-b border-gray-200 bg-gray-100/65 text-left text-xs font-medium uppercase text-gray-500">
          <tr>
            <th className="px-5 py-3">Entity</th>
            <th className="px-5 py-3 text-right">Count</th>
            <th className="px-5 py-3 text-right">Amount</th>
            <th className="px-5 py-3 text-right">Inflow</th>
            <th className="px-5 py-3 text-right">Outflow</th>
            <th className="px-5 py-3 text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.filter(matches).map((row) => (
            <tr
              key={row.key}
              className={row.key === "total" ? "bg-gray-100 font-semibold" : ""}
            >
              <td className="px-5 py-3 text-sm text-gray-800">{row.label}</td>
              <td className="px-5 py-3 text-right text-sm text-gray-600">
                {formatNumbers(summaryNumber(row.count), 0)}
              </td>
              <td className="px-5 py-3 text-right text-sm text-gray-700">
                <Amount value={summaryNumber(row.amount)} />
              </td>
              <td className="px-5 py-3 text-right text-sm font-semibold text-emerald-700">
                <Amount value={summaryNumber(row.inflow)} />
              </td>
              <td className="px-5 py-3 text-right text-sm font-semibold text-rose-600">
                <Amount value={summaryNumber(row.outflow)} />
              </td>
              <td className="px-5 py-3 text-right text-sm font-semibold text-teal-700">
                <Amount value={summaryNumber(row.balance)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  const allRows = details[view] || [];
  const rows = allRows.filter(matches);
  if (view === "invoices")
    return (
      <table className="w-full min-w-[760px]">
        <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-400">
          <tr>
            <th className="px-5 py-3">Invoice</th>
            <th className="px-5 py-3">Customer</th>
            <th className="px-5 py-3">Date</th>
            <th className="px-5 py-3 text-right">Amount</th>
            <th className="px-5 py-3 text-right">Received</th>
            <th className="px-5 py-3 text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.invoice_number}>
              <td className="px-5 py-3 text-sm font-semibold text-gray-800">
                {row.invoice_number}
              </td>
              <td className="px-5 py-3 text-sm text-gray-600">
                {row.customer_name || "-"}
              </td>
              <td className="px-5 py-3 text-sm text-gray-500">
                {formatDate(row.invoice_date, "DD MMM yyyy")}
              </td>
              <td className="px-5 py-3 text-right text-sm">
                <Amount value={summaryNumber(row.total_amount)} />
              </td>
              <td className="px-5 py-3 text-right text-sm font-semibold text-emerald-700">
                <Amount value={summaryNumber(row.received_amount)} />
              </td>
              <td className="px-5 py-3 text-right text-sm font-semibold text-amber-700">
                <Amount value={summaryNumber(row.balance_amount)} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-300 bg-gray-100 font-semibold">
          <tr>
            <td colSpan={3} className="px-5 py-3 text-sm text-gray-800">Grand Total ({allRows.length})</td>
            <td className="px-5 py-3 text-right text-sm"><Amount value={allRows.reduce((sum, row) => sum + summaryNumber(row.total_amount), 0)} /></td>
            <td className="px-5 py-3 text-right text-sm text-emerald-700"><Amount value={allRows.reduce((sum, row) => sum + summaryNumber(row.received_amount), 0)} /></td>
            <td className="px-5 py-3 text-right text-sm text-amber-700"><Amount value={allRows.reduce((sum, row) => sum + summaryNumber(row.balance_amount), 0)} /></td>
          </tr>
        </tfoot>
      </table>
    );
  if (view === "purchases")
    return (
      <table className="w-full min-w-[700px]">
        <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-400">
          <tr>
            <th className="px-5 py-3">Purchase</th>
            <th className="px-5 py-3">Supplier</th>
            <th className="px-5 py-3">Date</th>
            <th className="px-5 py-3 text-right">Articles</th>
            <th className="px-5 py-3 text-right">Packets</th>
            <th className="px-5 py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((row) => (
            <tr key={row.purchase_number}>
              <td className="px-5 py-3 text-sm font-semibold text-gray-800">
                {row.purchase_number}
              </td>
              <td className="px-5 py-3 text-sm text-gray-600">
                {row.supplier_name || "-"}
              </td>
              <td className="px-5 py-3 text-sm text-gray-500">
                {formatDate(row.purchase_date, "DD MMM yyyy")}
              </td>
              <td className="px-5 py-3 text-right text-sm">
                {formatNumbers(summaryNumber(row.article_count), 0)}
              </td>
              <td className="px-5 py-3 text-right text-sm">
                {formatNumbers(summaryNumber(row.packet_count), 2)}
              </td>
              <td className="px-5 py-3 text-right text-sm font-semibold text-orange-700">
                <Amount value={summaryNumber(row.total_amount)} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-300 bg-gray-100 font-semibold">
          <tr>
            <td colSpan={3} className="px-5 py-3 text-sm text-gray-800">Grand Total ({allRows.length})</td>
            <td className="px-5 py-3 text-right text-sm">{formatNumbers(allRows.reduce((sum, row) => sum + summaryNumber(row.article_count), 0), 0)}</td>
            <td className="px-5 py-3 text-right text-sm">{formatNumbers(allRows.reduce((sum, row) => sum + summaryNumber(row.packet_count), 0), 2)}</td>
            <td className="px-5 py-3 text-right text-sm text-orange-700"><Amount value={allRows.reduce((sum, row) => sum + summaryNumber(row.total_amount), 0)} /></td>
          </tr>
        </tfoot>
      </table>
    );
  if (view === "expenses")
    return (
      <table className="w-full min-w-[600px]">
        <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-400">
          <tr>
            <th className="px-5 py-3">Date</th>
            <th className="px-5 py-3">Category</th>
            <th className="px-5 py-3">Paid To</th>
            <th className="px-5 py-3">Method</th>
            <th className="px-5 py-3 text-right">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {rows.map((row, index) => (
            <tr key={`${row.expense_date}-${row.category}-${index}`}>
              <td className="px-5 py-3 text-sm text-gray-500">
                {formatDate(row.expense_date, "DD MMM yyyy")}
              </td>
              <td className="px-5 py-3 text-sm font-semibold text-gray-800">
                {row.category}
              </td>
              <td className="px-5 py-3 text-sm text-gray-600">
                {row.paid_to || "-"}
              </td>
              <td className="px-5 py-3 text-sm capitalize text-gray-500">
                {row.method || "-"}
              </td>
              <td className="px-5 py-3 text-right text-sm font-semibold text-rose-600">
                <Amount value={summaryNumber(row.amount)} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-gray-300 bg-gray-100 font-semibold">
          <tr>
            <td colSpan={4} className="px-5 py-3 text-sm text-gray-800">Grand Total ({allRows.length})</td>
            <td className="px-5 py-3 text-right text-sm text-rose-600"><Amount value={allRows.reduce((sum, row) => sum + summaryNumber(row.amount), 0)} /></td>
          </tr>
        </tfoot>
      </table>
    );
  return (
    <table className="w-full min-w-[650px]">
      <thead className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase text-gray-400">
        <tr>
          <th className="px-5 py-3">Article</th>
          <th className="px-5 py-3">Description</th>
          <th className="px-5 py-3">Supplier</th>
          <th className="px-5 py-3 text-right">Pieces</th>
          <th className="px-5 py-3 text-right">Packets</th>
          <th className="px-5 py-3 text-right">Value</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {rows.map((row) => (
          <tr key={row.article_no}>
            <td className="px-5 py-3 text-sm font-semibold text-teal-700">
              {row.article_no}
            </td>
            <td className="px-5 py-3 text-sm text-gray-700">
              {row.description || "-"}
            </td>
            <td className="px-5 py-3 text-sm text-gray-500">
              {row.supplier_name || "-"}
            </td>
            <td className="px-5 py-3 text-right text-sm">
              {formatNumbers(summaryNumber(row.stock_pcs), 0)}
            </td>
            <td className="px-5 py-3 text-right text-sm">
              {formatNumbers(summaryNumber(row.stock_pkt), 2)}
            </td>
            <td className="px-5 py-3 text-right text-sm font-semibold text-cyan-700">
              <Amount value={summaryNumber(row.stock_value)} />
            </td>
          </tr>
        ))}
      </tbody>
        <tfoot className="border-t border-gray-300 bg-gray-100 font-semibold">
          <tr>
            <td colSpan={3} className="px-5 py-3 text-sm text-gray-800">Grand Total ({allRows.length})</td>
            <td className="px-5 py-3 text-right text-sm">{formatNumbers(allRows.reduce((sum, row) => sum + summaryNumber(row.stock_pcs), 0), 0)}</td>
            <td className="px-5 py-3 text-right text-sm">{formatNumbers(allRows.reduce((sum, row) => sum + summaryNumber(row.stock_pkt), 0), 2)}</td>
            <td className="px-5 py-3 text-right text-sm text-cyan-700"><Amount value={allRows.reduce((sum, row) => sum + summaryNumber(row.stock_value), 0)} /></td>
          </tr>
        </tfoot>
    </table>
  );
}

export default function Dashboard() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [selectedMonth, setSelectedMonth] = useState(currentMonth),
    [recentRecords, setRecentRecords] = useState([]),
    [summary, setSummary] = useState(null),
    [summaryView, setSummaryView] = useState("summary"),
    [summarySearch, setSummarySearch] = useState(""),
    [chartData, setChartData] = useState([]),
    [modalChartData, setModalChartData] = useState([]),
    [chartLoading, setChartLoading] = useState(false),
    [chartModalOpen, setChartModalOpen] = useState(false),
    [chartPreset, setChartPreset] = useState("last7"),
    [customFrom, setCustomFrom] = useState(""),
    [customTo, setCustomTo] = useState(""),
    [chartError, setChartError] = useState("");
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const range = monthRange(selectedMonth),
        recentRange = dayRange(7);
      const [summaryRes, chartRes, recordsRes] = await Promise.all([
        fetchDashboardSummary(range),
        fetchDashboardSummary(recentRange),
        Promise.allSettled([
          fetchInvoices({ page: 1, limit: 5000 }),
          fetchPurchases(),
          fetchExpenses(),
          fetchPayments(),
          fetchReturns("sales"),
          fetchReturns("purchase"),
          fetchCustomers(),
          fetchSuppliers(),
        ]),
      ]);
      const [
        invoiceResult,
        purchaseResult,
        expenseResult,
        paymentResult,
        salesReturnResult,
        purchaseReturnResult,
        customerResult,
        supplierResult,
      ] = recordsRes;
      const records = [
        ...asRows(invoiceResult.status === "fulfilled" ? invoiceResult.value : null).map((row) => ({
          type: "Invoice",
          date: row.invoice_date || row.createdAt,
          title: row.customer_name || "Customer",
          reference: row.invoice_number,
          amount: row.total_amount,
          tone: "text-emerald-700",
        })),
        ...asRows(purchaseResult.status === "fulfilled" ? purchaseResult.value : null).map((row) => ({
          type: "Purchase",
          date: row.purchase_date || row.created_at,
          title: row.supplier_name || "Supplier",
          reference: row.purchase_number,
          amount: row.total_amount,
          tone: "text-orange-700",
        })),
        ...asRows(expenseResult.status === "fulfilled" ? expenseResult.value : null).map((row) => ({
          type: "Expense",
          date: row.expense_date || row.created_at,
          title: row.category || row.paid_to || "Expense",
          reference: row.paid_to || "Business expense",
          amount: row.amount,
          tone: "text-rose-600",
        })),
        ...asRows(paymentResult.status === "fulfilled" ? paymentResult.value : null).map((row) => ({
          type: "Payment",
          date: row.payment_date || row.created_at,
          title: row.party_name || "Account",
          reference: row.party_type === "supplier" ? "Supplier payment" : "Customer payment",
          amount: row.amount,
          tone: "text-teal-700",
        })),
        ...asRows(salesReturnResult.status === "fulfilled" ? salesReturnResult.value : null).map((row) => ({
          type: "Sales Return",
          date: row.return_date || row.created_at,
          title: row.party_name || "Customer",
          reference: row.return_number,
          amount: row.total_amount,
          tone: "text-violet-700",
        })),
        ...asRows(purchaseReturnResult.status === "fulfilled" ? purchaseReturnResult.value : null).map((row) => ({
          type: "Purchase Return",
          date: row.return_date || row.created_at,
          title: row.party_name || "Supplier",
          reference: row.return_number,
          amount: row.total_amount,
          tone: "text-indigo-700",
        })),
        ...asRows(customerResult.status === "fulfilled" ? customerResult.value : null).map((row) => ({
          type: "Customer",
          date: row.createdAt || row.created_at,
          title: row.customer_name || row.name || "New customer",
          reference: row.phone_number || "",
          amount: null,
          tone: "text-sky-700",
        })),
        ...asRows(supplierResult.status === "fulfilled" ? supplierResult.value : null).map((row) => ({
          type: "Supplier",
          date: row.createdAt || row.created_at,
          title: row.supplier_name || row.name || "New supplier",
          reference: row.phone_number || "",
          amount: null,
          tone: "text-violet-700",
        })),
      ].filter((row) => row.date);
      setRecentRecords(records.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5));
      setSummary(summaryRes?.data || null);
      const lastSeven = completeChartDays(
        chartRes?.data?.owner?.cashFlow,
        recentRange,
      );
      setChartData(lastSeven);
      setModalChartData(lastSeven);
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load dashboard";
      setLoadError(message);
      setRecentRecords([]);
      setSummary(null);
      setChartData([]);
      setModalChartData([]);
      showToast({ type: "error", message });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, showToast]);
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  const value = (n, d = 0) =>
    loading ? "..." : loadError || n === null ? "—" : formatNumbers(n, d);
  const owner = summary?.owner || {};
  const applyChartRange = async (range, preset) => {
    try {
      setChartLoading(true);
      setChartError("");
      const response = await fetchDashboardSummary(range);
      setModalChartData(
        completeChartDays(response?.data?.owner?.cashFlow, range),
      );
      if (preset) setChartPreset(preset);
    } catch (error) {
      setChartError(
        error?.response?.data?.message ||
          error?.message ||
          "Could not load chart data.",
      );
    } finally {
      setChartLoading(false);
    }
  };
  return (
    <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Dashboard"
          subtitle="Business at a glance"
          rightContent={
            <div className="w-36 sm:w-44">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(event) =>
                  setSelectedMonth(event.target.value || currentMonth())
                }
              />
            </div>
          }
        />
        {loadError && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">
              Dashboard data could not be loaded. Please try again.
            </p>
            <Button
              size="sm"
              variant="secondary"
              outline
              icon={RefreshCcw}
              onClick={loadDashboard}
            >
              Retry
            </Button>
          </div>
        )}
        <div className="mb-5 grid gap-3 sm:gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
            <StatCard
              label="Sold Today"
              value={value(owner.todaySales, 2)}
              icon={TrendingUp}
              variant="success"
              negative={Number(owner.todaySales) < 0}
            />
            <StatCard
              label="Sold This Month"
              value={value(owner.monthSales, 2)}
              meta={`${Number(owner.comparisons?.monthSales || 0) > 0 ? "+" : ""}${formatNumbers(owner.comparisons?.monthSales || 0, 0)}%`}
              icon={TrendingUp}
              negative={Number(owner.monthSales) < 0}
            />
            <StatCard
              label="Cash Collected"
              value={value(owner.monthReceived, 2)}
              meta="This month"
              icon={CircleDollarSign}
              variant="success"
              negative={Number(owner.monthReceived) < 0}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <StatCard
              label="Curernt Receivables"
              value={value(summary?.snapshot?.currentReceivables, 2)}
              icon={ArrowDownLeft}
              variant="warning"
              negative={Number(summary?.snapshot?.currentReceivables) < 0}
            />
            <StatCard
              label="Current Payables"
              value={value(summary?.snapshot?.currentPayables, 2)}
              icon={ArrowUpRight}
              variant="danger"
              negative={Number(summary?.snapshot?.currentPayables) < 0}
            />
            <StatCard
              label="Stock Cost Value"
              value={value(summary?.snapshot?.currentStockPurchase, 2)}
              icon={Boxes}
              negative={Number(summary?.snapshot?.currentStockPurchase) < 0}
            />
            <StatCard
              label="Stock Sale Value"
              value={value(summary?.snapshot?.currentStockSales, 2)}
              icon={CircleDollarSign}
              variant="success"
              negative={Number(summary?.snapshot?.currentStockSales) < 0}
            />
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 items-stretch gap-5 pb-6 xl:grid-cols-12">
          <div className="xl:col-span-7">
            <Section
              title="Sales and Cash Flow · Last 7 Days"
              action={
                <button
                  type="button"
                  onClick={() => setChartModalOpen(true)}
                  className="text-sm font-semibold text-teal-700 hover:underline"
                >
                  <span className="inline-flex items-center gap-1.5">
                    Open Chart
                  </span>
                </button>
              }
            >
              <div className="px-4 py-2.5 sm:px-5">
                {loading ? (
                  <EmptyState message="Loading chart..." />
                ) : chartData.length === 0 ? (
                  <EmptyState message="No activity in the last 7 days." />
                ) : (
                  <Suspense fallback={<div className="h-[250px]" />}>
                    <DashboardTrendChart data={chartData} height={250} />
                  </Suspense>
                )}
              </div>
            </Section>
          </div>
          <div className="xl:col-span-5">
            <Section title="Selected Month Snapshot">
              <div className="flex h-[270px] flex-col divide-y divide-gray-200">
                {[
                  [
                    "Sales",
                    summary?.snapshot?.invoices?.count,
                    summary?.snapshot?.invoices?.amount,
                    "text-teal-700",
                  ],
                  [
                    "Cash Received",
                    summary?.snapshot?.paymentsReceived?.count,
                    summary?.snapshot?.paymentsReceived?.amount,
                    "text-emerald-700",
                  ],
                  [
                    "Unpaid Invoices",
                    summary?.snapshot?.outstanding?.count,
                    summary?.snapshot?.outstanding?.amount,
                    "text-amber-700",
                  ],
                  [
                    "Purchases",
                    summary?.snapshot?.purchases?.count,
                    summary?.snapshot?.purchases?.amount,
                    "text-orange-700",
                  ],
                  [
                    "Supplier Payments",
                    summary?.snapshot?.supplierPayments?.count,
                    summary?.snapshot?.supplierPayments?.amount,
                    "text-rose-600",
                  ],
                  [
                    "Expenses",
                    summary?.snapshot?.expenses?.count,
                    summary?.snapshot?.expenses?.amount,
                    "text-red-700",
                  ],
                ].map(([label, count, amount, color]) => (
                  <div
                    key={label}
                    className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(90px,auto)_2.5rem] items-center gap-3 px-5"
                  >
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className="whitespace-nowrap text-right text-xs tabular-nums text-gray-400">
                      <Amount value={summaryNumber(amount)} />
                    </span>
                    <strong
                      className={`text-right text-sm tabular-nums ${color}`}
                    >
                      {formatNumbers(summaryNumber(count), 0)}
                    </strong>
                  </div>
                ))}
              </div>
            </Section>
          </div>
          <div className="xl:col-span-12">
            <Section
              title={`Month Summary (${selectedMonth})`}
              subtitle="Selected month activity and balances"
              headerPadding="pr-3.5"
              action={
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    value={summarySearch}
                    onChange={(event) => setSummarySearch(event.target.value)}
                    placeholder="Search by name, number, or category"
                    required={false}
                    className="sm:w-82"
                  />
                  <div className="sm:w-55">
                    <Select
                      value={summaryView}
                      onChange={setSummaryView}
                      options={[
                        { value: "summary", label: "Summary" },
                        { value: "invoices", label: "Invoices" },
                        { value: "purchases", label: "Purchases" },
                        { value: "expenses", label: "Expenses" },
                        { value: "inventory", label: "Inventory (Current)" },
                      ]}
                    />
                  </div>
                </div>
              }
            >
              <div className="overflow-x-auto">
                {loading ? (
                  <EmptyState message="Loading month summary..." />
                ) : (
                  <SummaryTable
                    summary={summary}
                    view={summaryView}
                    search={summarySearch}
                  />
                )}
              </div>
            </Section>
          </div>
          <div className="xl:col-span-12">
            <Section title="Recent Records">
              {recentRecords.length === 0 ? (
                <EmptyState message="No records yet." />
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentRecords.map((record, index) => (
                    <div
                      key={`${record.type}-${record.reference}-${index}`}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <span className="min-w-0">
                        <strong className="block truncate text-sm text-gray-800">
                          {record.title}
                        </strong>
                        <span className="text-xs text-gray-500">
                          <span className="font-medium">{record.type}</span>
                          {record.reference ? ` · ${record.reference}` : ""}
                          {` · ${formatDate(record.date, "DD MMM yyyy")}`}
                        </span>
                      </span>
                      <strong className={`whitespace-nowrap text-sm ${record.tone}`}>
                        {record.amount == null
                          ? "Created"
                          : <Amount value={record.amount} className={record.tone} />}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>
      </div>
      <Modal
        isOpen={chartModalOpen}
        onClose={() => setChartModalOpen(false)}
        maxWidth="max-w-6xl"
        title="Business Trend"
        subtitle="Compare sales, cash received, expenses, purchases, and net cash flow"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              outline
              onClick={() => setChartModalOpen(false)}
            >
              Close
            </Button>
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "last7", label: "Last 7 days" },
            { key: "thisMonth", label: "This month" },
            { key: "lastMonth", label: "Last month" },
            { key: "3months", label: "Last 3 months" },
            { key: "custom", label: "Custom dates" },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setChartPreset(item.key);
                setChartError("");
                if (item.key !== "custom")
                  applyChartRange(rangeForPreset(item.key), item.key);
              }}
              className={`rounded-xl border px-3 py-2 text-sm font-medium ${chartPreset === item.key ? "border-teal-600 bg-teal-50 text-teal-800" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {chartPreset === "custom" && (
          <div className="mb-4 flex flex-col items-end gap-3 rounded-2xl bg-gray-50 p-3 sm:flex-row">
            <Input
              label="From date"
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
            />
            <Input
              label="To date"
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
            />
            <Button
              className="w-full sm:mb-0.5 sm:w-auto"
              loading={chartLoading}
              disabled={!customFrom || !customTo || customFrom > customTo}
              onClick={() => {
                if (customFrom && customTo && customFrom <= customTo)
                  applyChartRange(
                    { date_from: customFrom, date_to: customTo },
                    "custom",
                  );
                else setChartError("Choose a valid start and end date.");
              }}
            >
              Generate Chart
            </Button>
          </div>
        )}
        {chartError && (
          <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {chartError}
          </p>
        )}
        {chartLoading ? (
          <div className="flex h-[420px] items-center justify-center text-sm text-gray-500">
            Loading chart data...
          </div>
        ) : modalChartData.length === 0 ? (
          <EmptyState message="No activity in this date range." />
        ) : (
          <Suspense fallback={<div className="h-[420px]" />}>
            <DashboardTrendChart data={modalChartData} height={420} />
          </Suspense>
        )}
      </Modal>
    </div>
  );
}
