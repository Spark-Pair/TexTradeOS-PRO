import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate } from "../utils";
import Amount from "./Amount";

export const DASHBOARD_CHART_SERIES = [
  { key: "sales", label: "Sales", color: "#9a82d8" },
  { key: "receipts", label: "Cash Received", color: "#91b04d" },
  { key: "expenses", label: "Expenses", color: "#de858b" },
  { key: "purchases", label: "Purchases", color: "#e59c63" },
  { key: "net", label: "Net Cash Flow", color: "#62a9a2" },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-gray-700">{formatDate(label, "DD MMM yyyy")}</p>
      {DASHBOARD_CHART_SERIES.map((series) => (
        <p key={series.key} className="flex items-center justify-between gap-5 py-0.5">
          <span style={{ color: series.color }}>{series.label}</span>
          <Amount value={row[series.key] || 0} className="font-semibold text-gray-700" />
        </p>
      ))}
    </div>
  );
}

export default function DashboardTrendChart({ data = [], height = 250 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(value) => formatDate(value, "DD MMM")} minTickGap={18} />
        <YAxis hide domain={["auto", "auto"]} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#d1d5db", strokeWidth: 1 }} />
        <Legend verticalAlign="top" height={34} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        {DASHBOARD_CHART_SERIES.map((series) => (
          <Line key={series.key} type="monotone" dataKey={series.key} name={series.label} stroke={series.color} strokeWidth={2.5} dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} connectNulls />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
