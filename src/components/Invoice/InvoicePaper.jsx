import { formatDate } from "../../utils";
import InvoiceTable from "./InvoiceTable";

export default function InvoicePaper({
  invoice,
  businessName = "Akhlaq Garments",
  copyLabel = "",
  isLastCopy = true,
}) {
  const articles = invoice?.articles || invoice?.orders || [];

  return (
    <article className={`invoice-paper ${isLastCopy ? "last-copy" : ""}`}>
      <header className="invoice-paper-header">
        <div className="invoice-brand">
          <span className="invoice-brand-mark">AG</span>
          <div>
            <p className="document-eyebrow">Textile Billing</p>
            <h1>{businessName}</h1>
            <p className="invoice-kicker">Invoice</p>
          </div>
        </div>
        <div className="invoice-header-side">
          {copyLabel && <span className="copy-label">{copyLabel}</span>}
          <dl className="invoice-number-box">
            <div>
              <dt>Invoice</dt>
              <dd>{invoice?.invoice_number || "-"}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{formatDate(invoice?.invoice_date, "DD MMM yyyy") || "-"}</dd>
            </div>
          </dl>
        </div>
      </header>

      <section className="invoice-intro">
        <div className="customer-card">
          <p className="meta-label">Billed To</p>
          <h2 className="customer-name">{invoice?.customer_name || "-"}</h2>
          <div className="customer-contact">
            {invoice?.customer_phone && <p>{invoice.customer_phone}</p>}
            {invoice?.customer_address && <p>{invoice.customer_address}</p>}
          </div>
        </div>
        <div className="invoice-intro-note">
          <span>Statement</span>
          <p>Garment articles and quantities billed as detailed below.</p>
        </div>
      </section>

      <InvoiceTable articles={articles} totalAmount={invoice?.total_amount || 0} />

      <footer className="invoice-paper-footer">
        <span>Thank you for your business.</span>
        <span>Powered by TexTradeOS</span>
      </footer>
    </article>
  );
}
