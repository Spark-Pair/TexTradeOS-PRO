export const SUMMARY_FIELD_DEFINITIONS = [
  { key: "gross_amount", label: "Gross Amount", group: "primary", type: "amount" },
  { key: "percent_discount", label: "Percent Discount", group: "primary", type: "amount" },
  { key: "discount", label: "Discount", group: "primary", type: "amount" },
  { key: "net_amount", label: "Net Amount", group: "primary", type: "amount", tone: "emphasis" },
  { key: "sales_return", label: "Sales Return", group: "primary", type: "amount" },
  { key: "previous_outstanding", label: "Previous Outstanding", group: "primary", type: "amount" },
  { key: "sales_return_pcs", label: "Sales Return (Pcs)", group: "secondary", type: "number", signed: true },
  { key: "payment_method", label: "Payment Method", group: "secondary", type: "text" },
  { key: "received", label: "Received", group: "secondary", type: "amount" },
  { key: "payable", label: "Payable", group: "secondary", type: "amount", tone: "total" },
  { key: "balance", label: "Balance", group: "secondary", type: "amount", tone: "total", dynamicLabel: true },
  { key: "current_balance", label: "Current Balance", group: "secondary", type: "amount", tone: "total" },
];

export const DEFAULT_SUMMARY_SETTINGS = {
  summary_layout: "dual",
  summary_compact: false,
  summary_hide_zero: false,
  summary_fields: Object.fromEntries(SUMMARY_FIELD_DEFINITIONS.map(({ key }) => [key, true])),
};

export const normalizeSummarySettings = (settings = {}) => ({
  ...DEFAULT_SUMMARY_SETTINGS,
  ...settings,
  summary_layout: settings?.summary_layout === "single" ? "single" : "dual",
  summary_compact: settings?.summary_compact === true,
  summary_hide_zero: settings?.summary_hide_zero === true,
  summary_fields: {
    ...DEFAULT_SUMMARY_SETTINGS.summary_fields,
    ...(settings?.summary_fields && typeof settings.summary_fields === "object" ? settings.summary_fields : {}),
  },
});

export const buildInvoiceSummaryRows = ({
  invoice,
  settings: summarySettings,
  grossAmount,
  percentDiscountAmount,
  rupeeDiscountAmount,
  netAmount,
  salesReturnAmount,
  salesReturnPcs,
  receivedAmount,
  paymentMethod,
  payableAmount,
  balanceAmount,
  returnAmount,
}) => {
  const values = {
    gross_amount: grossAmount,
    percent_discount: -Math.abs(percentDiscountAmount),
    discount: -Math.abs(rupeeDiscountAmount),
    net_amount: netAmount,
    sales_return: -Math.abs(salesReturnAmount),
    previous_outstanding: Number(invoice?.customer_balance_before ?? 0),
    sales_return_pcs: -Math.abs(salesReturnPcs),
    payment_method: receivedAmount > 0 ? paymentMethod || "-" : "-",
    received: receivedAmount,
    payable: payableAmount,
    balance: returnAmount > 0 ? returnAmount : balanceAmount,
    current_balance: Number(invoice?.customer_balance_after ?? 0),
  };
  const settings = normalizeSummarySettings(summarySettings);
  return SUMMARY_FIELD_DEFINITIONS.map((definition) => ({
    ...definition,
    label: definition.key === "balance" && returnAmount > 0 ? "Return To Customer" : definition.label,
    value: values[definition.key],
    numericValue: definition.type === "text" ? null : Number(values[definition.key] || 0),
  })).filter((row) => settings.summary_fields[row.key] !== false && (!settings.summary_hide_zero || (row.type === "text" ? row.value !== "-" : Math.abs(row.numericValue) > 0)));
};

export const splitSummaryRows = (rows, layout = "dual") => {
  if (layout === "single") return [rows];
  return [rows.filter((row) => row.group === "primary"), rows.filter((row) => row.group === "secondary")].filter((group) => group.length);
};

