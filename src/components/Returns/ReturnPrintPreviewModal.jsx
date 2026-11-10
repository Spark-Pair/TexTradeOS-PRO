import InvoicePreviewModal from "../Invoice/InvoicePreviewModal";

const returnSummarySettings = {
  summary_layout: "single",
  summary_compact: false,
  summary_fields: {
    gross_amount: true,
    percent_discount: false,
    discount: true,
    net_amount: true,
    sales_return: false,
    previous_outstanding: false,
    sales_return_pcs: false,
    payment_method: false,
    received: false,
    payable: false,
    balance: false,
    current_balance: false,
  },
  summary_zero_fields: {},
};

export default function ReturnPrintPreviewModal({
  isOpen,
  onClose,
  record,
  loading = false,
  sales,
  business = {},
  businessName = "",
}) {
  const keepGoods = !sales && record?.stock_action === "keep_goods";
  const documentType = sales ? "Sales Return" : "Purchase Return";
  const invoice = record
    ? {
        invoice_number: record.return_number,
        invoice_date: record.return_date,
        customer_name: record.party_name,
        articles: (record.articles || []).map((article) => ({
          ...article,
          size: article.size || "-",
          description: [article.article_no, article.description, article.purchase_number ? `Purchase ${article.purchase_number}` : ""].filter(Boolean).join(" · ") || "-",
          dzn: 0,
          gross_amount: Number(article.gross_amount || Number(article.pcs || 0) * Number(article.rate || 0)),
          discount_amount: Number(article.discount_amount || 0),
          amount: Number(article.amount || 0),
        })),
        gross_amount: Number(record.gross_amount || 0),
        rupee_discount_amount: Number(record.adjustment_amount || 0),
        net_amount: Number(record.total_amount || 0),
        total_amount: Number(record.total_amount || 0),
      }
    : null;

  return (
    <InvoicePreviewModal
      isOpen={isOpen}
      onClose={onClose}
      invoice={invoice}
      loading={loading}
      business={business}
      businessName={businessName}
      documentType={keepGoods ? "Supplier Allowance" : documentType}
      partyLabel={sales ? "Returned By" : "Returned To"}
      numberLabel="Return No"
      summarySettings={returnSummarySettings}
      summaryLabels={{
        gross_amount: "Gross Amount",
        discount: keepGoods ? "Allowance Adjustment" : "Adjustment / Discount",
        net_amount: keepGoods ? "Final Allowance" : sales ? "Refund Amount" : "Return Amount",
      }}
    />
  );
}
