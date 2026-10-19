import { formatDate, formatNumbers } from "../../utils";
import Amount from "../Amount";
import { createInvoiceBrandStyle } from "./invoiceBranding";
import { buildInvoiceSummaryRows, normalizeSummarySettings, splitSummaryRows } from "./invoiceSummary";

const displayDiscount = (article) => {
  const raw = String(article?.discount || "").trim();
  if (raw) return raw;
  return Number(article?.discount_amount || 0) > 0
    ? formatNumbers(article.discount_amount, 1)
    : "-";
};

const grossForArticle = (article) => {
  const explicitGross = Number(article?.gross_amount || 0);
  if (Number.isFinite(explicitGross) && explicitGross > 0) return explicitGross;
  return Number(article?.pcs || 0) * Number(article?.rate || 0);
};

const displayPaymentMethod = (invoice, receivedAmount) => {
  const payment = invoice?.payment || (Array.isArray(invoice?.payments) ? invoice.payments.at(-1) : null);
  const method = String(payment?.method || "").trim();
  if (!receivedAmount || !method) return "-";
  return method.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
};
const renderSummaryValue = (row) => {
  if (row.type === "text") return row.value;
  if (row.type === "number") return `${row.numericValue < 0 ? "-" : ""}${formatNumbers(Math.abs(row.numericValue), 1)}`;
  return <Amount value={row.numericValue} decimals={1} />;
};

export default function ThermalInvoicePaper({ invoice, businessName = "", business = {}, customerVariant = "customer-1" }) {
  const articles = invoice?.articles || invoice?.orders || [];
  const customerUrduTitle = String(invoice?.customer_urdu_title || "").trim();
  const salesmanName = String(invoice?.salesman_name || "").trim();
  const businessUrduTitle = String(business?.urdu_name || "").trim();
  const businessLogo = String(business?.logo_data || "/invoice-assets/customer-two-logo.png").trim();
  const customerBrandStyle = createInvoiceBrandStyle(business?.primary_color);
  const businessDetails = [business?.phone ? `Tel: ${business.phone}` : "", business?.address || ""].filter(Boolean).join(" | ");
  const customerDetails = [
    invoice?.customer_phone ? `Phone: ${invoice.customer_phone}` : "",
    invoice?.customer_address ? `Address: ${invoice.customer_address}` : "",
  ].filter(Boolean).join(" | ");

  const totalDzn = articles.reduce((sum, article) => sum + Number(article?.dzn || 0), 0);
  const totalPcs = articles.reduce((sum, article) => sum + Number(article?.pcs || 0), 0);
  const lineGrossAmount = articles.reduce((sum, article) => sum + grossForArticle(article), 0);
  const grossAmount = Number(invoice?.gross_amount || lineGrossAmount);
  const percentDiscountAmount = Number(invoice?.percent_discount_amount ?? 0);
  const rupeeDiscountAmount = Number(invoice?.rupee_discount_amount ?? 0);
  const totalDiscountAmount = Number(invoice?.total_discount_amount ?? (percentDiscountAmount + rupeeDiscountAmount));
  const netAmount = Number(invoice?.net_amount ?? Math.max(0, grossAmount - totalDiscountAmount));
  const salesReturnAmount = Number(invoice?.sales_return?.total_amount ?? invoice?.sales_return_amount ?? 0);
  const salesReturnPcs = Number(invoice?.sales_return?.total_pcs ?? invoice?.sales_return_pcs ?? 0);
  const receivedAmount = Number(invoice?.received_amount ?? 0);
  const paymentMethod = displayPaymentMethod(invoice, receivedAmount);
  const payableAmount = Number(invoice?.total_amount ?? 0);
  const balanceAmount = Number(invoice?.balance_amount ?? Math.max(0, payableAmount - receivedAmount));
  const returnAmount = Number(invoice?.return_amount ?? Math.max(0, receivedAmount - payableAmount));
  const summarySettings = normalizeSummarySettings(business?.summary_settings);
  const summaryRows = buildInvoiceSummaryRows({ invoice, settings: summarySettings, grossAmount, percentDiscountAmount, rupeeDiscountAmount, netAmount, salesReturnAmount, salesReturnPcs, receivedAmount, paymentMethod, payableAmount, balanceAmount, returnAmount });
  const summaryGroups = splitSummaryRows(summaryRows, summarySettings.summary_layout);

  return (
    <article className={`thermal-invoice-paper ${customerVariant === "customer-2" ? "customer-two-invoice" : ""}`} style={customerVariant === "customer-2" ? customerBrandStyle : undefined}>
      {customerVariant === "customer-2" && (
        <>
          <div className="customer-two-banner">
            <div className="customer-two-banner-brand">
              <img src={businessLogo} alt={`${businessName || "Business"} logo`} />
            </div>
            <div className="customer-two-banner-identity">
              <strong>{businessName || "Business"}</strong>
              {businessUrduTitle && <span className="customer-two-banner-urdu" dir="rtl" lang="ur">{businessUrduTitle}</span>}
              <span>{business?.tagline || "Garments Stock Lot"}</span>
            </div>
            <div className="customer-two-banner-info">
              {salesmanName && <span>Salesman: {salesmanName}</span>}
              {business?.phone && <span>Phone: {business.phone}</span>}
              {business?.address && <span>Address: {business.address}</span>}
            </div>
          </div>
          <div className="customer-two-watermark" style={{ backgroundImage: `url(${businessLogo})` }} aria-hidden="true" />
        </>
      )}
      {customerVariant !== "customer-2" && <header className="thermal-header">
        <h1>{businessName}</h1>
        <p className="thermal-urdu" dir="rtl" lang="ur">{businessUrduTitle}</p>
        {businessDetails && <p className="thermal-shop-line">{businessDetails}</p>}
        {salesmanName && <p className="thermal-salesman-line">Salesman: {salesmanName}</p>}
      </header>}

      <section className="thermal-meta">
        <div><span>Invoice No</span><strong>{invoice?.invoice_number || "-"}</strong></div>
        <div><span>Date</span><strong>{formatDate(invoice?.invoice_date, "DD MMM yyyy") || "-"}</strong></div>
        <div><span>Type</span><strong>Sales Invoice</strong></div>
      </section>

      <section className="thermal-customer">
        <p className="thermal-label">Billed To</p>
        <h2>
          {invoice?.customer_name || "-"}
          {customerUrduTitle && <span dir="rtl" lang="ur">{customerUrduTitle}</span>}
        </h2>
        {customerDetails && <p>{customerDetails}</p>}
      </section>

      <section className="thermal-items">
        <div className="thermal-items-head">
          <span>Items</span>
          <strong>{articles.length}</strong>
        </div>
        {articles.map((article, index) => (
          <div className="thermal-item" key={article?._key || article?._id || index}>
            <div className="thermal-item-title">
              <span>{String(index + 1).padStart(2, "0")}. {article?.description || "-"}</span>
              <strong><Amount value={article?.amount} decimals={1} /></strong>
            </div>
            <div className="thermal-item-grid">
              <span>Size: {article?.size || "-"}</span>
              <span>DZN: {formatNumbers(article?.dzn, 1)}</span>
              <span>PCS: {formatNumbers(article?.pcs, 0)}</span>
              <span>Rate: {formatNumbers(article?.rate, 1)}</span>
              <span>Disc: {displayDiscount(article)}</span>
              <span>Gross: {formatNumbers(grossForArticle(article), 1)}</span>
            </div>
          </div>
        ))}
        <div className="thermal-item-totals">
          <span>Total Dozens: {formatNumbers(totalDzn, 1)}</span>
          <span>Total Pieces: {formatNumbers(totalPcs, 0)}</span>
        </div>
      </section>
      
      <section className={`thermal-summary thermal-summary-${summarySettings.summary_layout} ${summarySettings.summary_compact ? "summary-compact" : ""}`}>
        {summaryGroups.map((group, groupIndex) => <div className="thermal-summary-panel" key={groupIndex}>
          {group.map((row) => <div className={row.tone ? `thermal-summary-${row.tone}` : ""} key={row.key}><span>{row.label}</span><strong>{renderSummaryValue(row, Amount, formatNumbers)}</strong></div>)}
        </div>)}
      </section>

      <footer className="thermal-footer">
        <p>Thank you for your business.</p>
        <p>TexTradeOS PRO by SparkPair</p>
        <p>+92 316583 5495</p>
      </footer>
    </article>
  );
}
