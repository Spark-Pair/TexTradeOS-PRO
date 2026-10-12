import { formatDate } from "../../utils";
import InvoiceTable from "./InvoiceTable";
import "./invoiceTypography.css";

export default function InvoicePaper({
  invoice,
  businessName = "",
  business = {},
  copyLabel = "",
  isLastCopy = true,
}) {
  const articles = invoice?.articles || invoice?.orders || [];
  const customerUrduTitle = String(invoice?.customer_urdu_title || "").trim();
  const salesmanName = String(invoice?.salesman_name || "").trim();
  const businessUrduTitle = String(business?.urdu_name || "").trim();
  const businessDetails = [business?.phone ? `Tel: ${business.phone}` : "", business?.address || ""].filter(Boolean).join(" | ");

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

          {businessDetails && <p className="invoice-business-details">{businessDetails}</p>}

          {salesmanName && (
            <p className="invoice-salesman-line">Salesman: {salesmanName}</p>
          )}
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
          <p className="invoice-system-credit">TexTradeOS PRO</p>
        </div>
      </footer>
    </article>
  );
}
