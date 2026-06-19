import { formatDate, formatNumbers } from "../../utils";

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

export default function ThermalInvoicePaper({ invoice, businessName = "Akhlaq Garments" }) {
  const articles = invoice?.articles || invoice?.orders || [];
  const customerUrduTitle = String(invoice?.customer_urdu_title || "").trim();
  const businessUrduTitle = "اخلاق گارمنٹس";
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
  const salesReturnAmount = Number(invoice?.sales_return_amount ?? 0);
  const receivedAmount = Number(invoice?.received_amount ?? 0);
  const payableAmount = Number(invoice?.total_amount ?? 0);
  const balanceAmount = Number(invoice?.balance_amount ?? Math.max(0, payableAmount - receivedAmount));
  const returnAmount = Number(invoice?.return_amount ?? Math.max(0, receivedAmount - payableAmount));

  return (
    <article className="thermal-invoice-paper">
      <header className="thermal-header">
        <h1>{businessName}</h1>
        <p className="thermal-urdu" dir="rtl" lang="ur">{businessUrduTitle}</p>
        <p className="thermal-shop-line">Phone: 03165825495 | Meetha Dar, Karachi</p>
      </header>

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
              <strong>{formatNumbers(article?.amount, 1)}</strong>
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

      <section className="thermal-summary">
        <div><span>Gross Amount</span><strong>{formatNumbers(grossAmount, 1)}</strong></div>
        <div><span>Percent Discount</span><strong>-{formatNumbers(percentDiscountAmount, 1)}</strong></div>
        <div><span>Rs Discount</span><strong>-{formatNumbers(rupeeDiscountAmount, 1)}</strong></div>
        <div className="thermal-summary-strong"><span>Net Amount</span><strong>{formatNumbers(netAmount, 1)}</strong></div>
        <div><span>Sales Return</span><strong>-{formatNumbers(salesReturnAmount, 1)}</strong></div>
        <div><span>Received</span><strong>{formatNumbers(receivedAmount, 1)}</strong></div>
        <div className="thermal-summary-total"><span>Payable</span><strong>{formatNumbers(payableAmount, 1)}</strong></div>
        <div className="thermal-summary-total">
          <span>{returnAmount > 0 ? "Return To Customer" : "Balance"}</span>
          <strong>{formatNumbers(returnAmount > 0 ? returnAmount : balanceAmount, 1)}</strong>
        </div>
      </section>

      <footer className="thermal-footer">
        <p>Thank you for your business.</p>
        <p>TexTradeOS PRO by SparkPair</p>
        <p>+923165825495 | www.sparkpair.dev</p>
      </footer>
    </article>
  );
}
