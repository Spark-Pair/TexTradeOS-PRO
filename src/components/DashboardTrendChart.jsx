import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDate, formatNumbers } from "../utils";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload || {};

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-gray-600">{formatDate(label, "DD MMM yyyy")}</p>
      <p className="font-semibold text-teal-700">Amount: {formatNumbers(row.invoiceAmount || 0, 2)}</p>
      <p className="text-gray-500">Invoices: {formatNumbers(row.invoiceCount || 0, 0)}</p>
    </div>
  );
}

export default function DashboardTrendChart({ data = [], height = 220, idPrefix = "invoice-trend" }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={`${idPrefix}-amount`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.22} />
            <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => formatDate(value, "DD MMM")}
          minTickGap={18}
        />
        <YAxis hide />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#d1d5db", strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="invoiceAmount"
          name="Invoice Amount"
          stroke="#0d9488"
          strokeWidth={2.5}
          fill={`url(#${idPrefix}-amount)`}
          dot={false}
          activeDot={{ r: 4, fill: "#0d9488", stroke: "#ffffff", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
