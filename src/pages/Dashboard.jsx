import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CircleCheck,
  Receipt,
  RefreshCcw,
  Users2,
  Wallet,
} from "lucide-react";
import useAuth from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import Button from "../components/Button";
import Input from "../components/Input";
import { fetchInvoices } from "../api/invoice";
import { fetchDashboardTrend } from "../api/dashboard";
import {
  fetchBusinessUsers,
  fetchBusinessUserStats,
  fetchUsers,
  fetchUserStats,
} from "../api/user";
import { fetchMyReferenceData, fetchMyRuleData } from "../api/business";
import { formatDate, formatNumbers } from "../utils";
import { BUSINESS_ACCESS_ITEMS, hasAccessForRole } from "../utils/accessConfig";

const DashboardTrendChart = lazy(() => import("../components/DashboardTrendChart"));

const sortInvoices = (rows = []) =>
  [...rows].sort((a, b) => {
    const aTime = new Date(a?.invoice_date || a?.createdAt || 0).getTime() || 0;
    const bTime = new Date(b?.invoice_date || b?.createdAt || 0).getTime() || 0;
    return bTime - aTime;
  });

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const monthRange = (month) => {
  const [year, monthNumber] = String(month || currentMonth()).split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  return {
    date_from: `${year}-${String(monthNumber).padStart(2, "0")}-01`,
    date_to: `${year}-${String(monthNumber).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
};

function Section({ title, action, children }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-300 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-300 bg-gray-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ message }) {
  return <p className="px-5 py-10 text-center text-sm text-gray-400">{message}</p>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const isDeveloper = user?.role === "developer";

  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [invoices, setInvoices] = useState([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [trend, setTrend] = useState([]);
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [referenceData, setReferenceData] = useState({});
  const [ruleData, setRuleData] = useState({});

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const userListRequest = isDeveloper
        ? fetchUsers({ page: 1, limit: 5 })
        : fetchBusinessUsers({ page: 1, limit: 5 });
      const userStatsRequest = isDeveloper ? fetchUserStats() : fetchBusinessUserStats();
      const range = monthRange(selectedMonth);

      const [invoiceRes, trendRes, usersRes, statsRes, referenceRes, rulesRes] = await Promise.all([
        fetchInvoices({ page: 1, limit: 5000, ...range }),
        fetchDashboardTrend(range),
        userListRequest,
        userStatsRequest,
        fetchMyReferenceData().catch(() => ({ reference_data: {} })),
        fetchMyRuleData().catch(() => ({ rule_data: {} })),
      ]);

      const invoiceRows = sortInvoices(invoiceRes?.data || []);
      setInvoices(invoiceRows.slice(0, 5));
      setInvoiceTotal(Number(invoiceRes?.pagination?.totalItems ?? invoiceRows.length));
      setInvoiceAmount(invoiceRows.reduce((sum, invoice) => sum + Number(invoice?.total_amount || 0), 0));
      setTrend(trendRes?.data?.trend || []);
      setUsers((usersRes?.data || []).slice(0, 5));
      setUserStats(statsRes?.data || { total: 0, active: 0, inactive: 0 });
      setReferenceData(referenceRes?.reference_data || {});
      setRuleData(rulesRes?.rule_data || {});
    } catch (error) {
      showToast({
        type: "error",
        message: error?.response?.data?.message || "Failed to load dashboard",
      });
    } finally {
      setLoading(false);
    }
  }, [isDeveloper, selectedMonth, showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const accessibleItems = useMemo(() => {
    if (isDeveloper) return BUSINESS_ACCESS_ITEMS;
    return BUSINESS_ACCESS_ITEMS.filter((item) =>
      hasAccessForRole(ruleData, referenceData, item.key, user?.role)
    );
  }, [isDeveloper, referenceData, ruleData, user?.role]);

  return (
    <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col overflow-hidden">
      <div className="shrink-0">
        <PageHeader
          title="Dashboard"
          subtitle={`Welcome back, ${user?.name || user?.username || "User"}.`}
          rightContent={
            <div className="w-44">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value || currentMonth())}
              />
            </div>
          }
        />

        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Month Invoices" value={loading ? "..." : formatNumbers(invoiceTotal, 0)} icon={Receipt} />
          <StatCard label="Month Amount" value={loading ? "..." : formatNumbers(invoiceAmount, 2)} icon={Wallet} variant="success" />
          <StatCard label="Total Users" value={loading ? "..." : formatNumbers(userStats.total, 0)} icon={Users2} variant="warning" />
          <StatCard label="Active Users" value={loading ? "..." : formatNumbers(userStats.active, 0)} icon={CircleCheck} variant="success" />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 gap-5 pb-6 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <Section title={`Invoice Trend - ${formatDate(`${selectedMonth}-01`, "MMM yyyy")}`}>
            <div className="p-4 sm:p-5">
              {loading ? (
                <div className="flex h-[220px] items-center justify-center text-sm text-gray-400">Loading chart...</div>
              ) : trend.length === 0 ? (
                <EmptyState message="No invoice activity for this month." />
              ) : (
                <Suspense fallback={<div className="h-[220px]" />}>
                  <DashboardTrendChart data={trend} idPrefix={`invoice-${selectedMonth}`} />
                </Suspense>
              )}
            </div>
          </Section>
        </div>

        <div className="xl:col-span-7">
          <Section
            title={`Recent Invoices - ${formatDate(`${selectedMonth}-01`, "MMM yyyy")}`}
            action={
              <Button size="sm" variant="secondary" outline onClick={() => navigate("/invoices")}>
                View All
              </Button>
            }
          >
            {loading ? (
              <EmptyState message="Loading invoices..." />
            ) : invoices.length === 0 ? (
              <EmptyState message="No invoices created yet." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px]">
                  <thead className="border-b border-gray-200 text-left text-xs font-medium uppercase text-gray-400">
                    <tr>
                      <th className="px-5 py-3">Invoice</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {invoices.map((invoice) => (
                      <tr key={invoice._id || invoice.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 text-sm font-semibold text-gray-700">{invoice.invoice_number || "-"}</td>
                        <td className="px-5 py-3 text-sm text-gray-700">{invoice.customer_name || "-"}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{formatDate(invoice.invoice_date, "DD MMM yyyy") || "-"}</td>
                        <td className="px-5 py-3 text-right text-sm font-semibold text-emerald-700">
                          {formatNumbers(invoice.total_amount || 0, 2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </div>

        <div className="grid gap-5 xl:col-span-5">
          <Section
            title="Recent Users"
            action={
              isDeveloper || hasAccessForRole(ruleData, referenceData, "users_manage", user?.role) ? (
                <button type="button" onClick={() => navigate("/users")} className="text-xs font-medium text-teal-700">
                  View all
                </button>
              ) : null
            }
          >
            {loading ? (
              <EmptyState message="Loading users..." />
            ) : users.length === 0 ? (
              <EmptyState message="No users found." />
            ) : (
              <div className="divide-y divide-gray-200">
                {users.map((item) => (
                  <div key={item._id || item.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-800">{item.name || item.username}</p>
                      <p className="truncate text-xs capitalize text-gray-400">{item.role || "user"}</p>
                    </div>
                    <span className={`text-xs font-medium ${item.isActive ? "text-emerald-700" : "text-rose-600"}`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section
            title="Access Summary"
            action={
              <button type="button" onClick={loadDashboard} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-200" title="Refresh dashboard">
                <RefreshCcw size={15} />
              </button>
            }
          >
            <div className="grid grid-cols-2 gap-px bg-gray-200">
              <div className="bg-white p-5">
                <p className="text-xs uppercase text-gray-400">Role</p>
                <p className="mt-1 text-lg font-semibold capitalize text-gray-800">{user?.role || "-"}</p>
              </div>
              <div className="bg-white p-5">
                <p className="text-xs uppercase text-gray-400">Available Pages</p>
                <p className="mt-1 text-lg font-semibold text-gray-800">{accessibleItems.length}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 px-5 py-4">
              {accessibleItems.map((item) => (
                <span key={item.key} className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
                  {item.label}
                </span>
              ))}
            </div>
          </Section>
        </div>
        </div>
      </div>
    </div>
  );
}
