import { formatDate } from "../../utils";
import InvoiceTable from "./InvoiceTable";
import { createInvoiceBrandStyle } from "./invoiceBranding";
import "./invoiceTypography.css";

export default function InvoicePaper({
  invoice,
  businessName = "",
  business = {},
  copyLabel = "",
  isLastCopy = true,
  customerVariant = "customer-1",
}) {
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
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <article className={`invoice-paper ${isLastCopy ? "last-copy" : ""} ${customerVariant === "customer-2" ? "customer-two-invoice" : ""}`} style={customerVariant === "customer-2" ? customerBrandStyle : undefined}>
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
      {customerVariant !== "customer-2" && <header className="invoice-paper-header">
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
      </header>}

      <section className={`billed-to-section ${customerVariant === "customer-2" ? "customer-two-billed-row" : ""}`}>
        <div className="billed-customer-block">
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
        </div>

        {customerVariant === "customer-2" && (
          <div className="invoice-meta-panel customer-two-invoice-meta">
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
        )}
      </section>

      <InvoiceTable
        articles={articles}
        invoice={invoice}
        totalAmount={invoice?.total_amount || 0}
      />

      <footer className="invoice-paper-footer">
        <div className="invoice-footer-left">
          <p className="invoice-thanks">Thank you for your business.</p>
        </div>

        <div className="invoice-footer-branding">
          <p className="invoice-system-credit">TexTradeOS PRO by SparkPair</p>
          <p className="invoice-agency-credit">+92 316583 5495</p>
        </div>
      </footer>
    </article>
  );
}
