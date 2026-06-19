import { formatDate } from "../../utils";
import InvoiceTable from "./InvoiceTable";

export default function InvoicePaper({
  invoice,
  businessName = "Akhlaq Garments",
  copyLabel = "",
  isLastCopy = true,
}) {
  const articles = invoice?.articles || invoice?.orders || [];
  const customerUrduTitle = String(invoice?.customer_urdu_title || "").trim();
  const businessUrduTitle = "اخلاق گارمنٹس";

  const customerDetails = [
    invoice?.customer_phone ? `Phone: ${invoice.customer_phone}` : "",
    invoice?.customer_address ? `Address: ${invoice.customer_address}` : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <article className={`invoice-paper ${isLastCopy ? "last-copy" : ""}`}>
      <header className="invoice-paper-header">
        <div className="invoice-brand">
          <div className="invoice-brand-title">
            <h1>
              {businessName}
              {businessUrduTitle && (
                <span className="urdu-inline" dir="rtl" lang="ur">
                  {businessUrduTitle}
                </span>
              )}
            </h1>
          </div>

          <p className="invoice-business-details">
            Tel: 32441153, 32434590 | Shop No. 1, OT 4/79, Meethadar, Karachi
          </p>
        </div>

        <div className="invoice-meta-panel">
          {copyLabel && <span className="copy-label">{copyLabel}</span>}

          <p className="invoice-document-type">Sales Invoice</p>

          <dl className="invoice-number-box">
            <div>
              <dt>Invoice No</dt>
              <dd>{invoice?.invoice_number || "-"}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(invoice?.invoice_date, "DD MMM yyyy") || "-"}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="billed-to-section">
        <div className="customer-topline">
          <p className="section-label">Billed To</p>
        </div>

        <div className="customer-main">
          <h2>
            {invoice?.customer_name || "-"}
            {customerUrduTitle && (
              <span className="urdu-inline" dir="rtl" lang="ur">
                {customerUrduTitle}
              </span>
            )}
          </h2>

          {customerDetails && (
            <p className="customer-contact-line">{customerDetails}</p>
          )}
        </div>
      </section>

      <InvoiceTable
        articles={articles}
        invoice={invoice}
        totalAmount={invoice?.total_amount || 0}
      />

      <footer className="invoice-paper-footer">
        <div className="invoice-footer-left">
          <p className="invoice-thanks">Thank you for your business.</p>
          <p className="invoice-footer-note">System-generated invoice. Please verify items and amounts at the time of delivery.</p>
        </div>

        <div className="invoice-footer-branding">
          <p className="invoice-system-credit">TexTradeOS PRO by SparkPair</p>
          <p className="invoice-agency-credit">+923165825495 | sparkpair.dev</p>
        </div>
      </footer>
    </article>
  );
}