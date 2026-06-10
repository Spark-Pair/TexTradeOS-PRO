import { useEffect } from "react";
import { Printer, X } from "lucide-react";
import Modal from "../Modal";
import Button from "../Button";
import InvoicePaper from "./InvoicePaper";

const PRINT_STYLE = `
  .invoice-preview-stage {
    display: grid;
    justify-items: center;
    gap: 24px;
    width: 100%;
    padding: 34px 20px;
    overflow: hidden;
    border-radius: 18px;
    background:
      radial-gradient(circle at 50% 0%, #f8fafc 0, #e7eaee 58%, #dde1e6 100%);
  }

  .invoice-paper {
    width: min(148mm, 100%);
    min-height: 210mm;
    padding: 9mm 8.5mm 7mm;
    box-sizing: border-box;
    background: #fff;
    color: #171717;
    box-shadow:
      0 1px 2px rgba(15, 23, 42, 0.06),
      0 22px 55px rgba(15, 23, 42, 0.15);
    font-family: Calibri, Arial, Inter, system-ui, sans-serif;
    font-size: 11px;
    line-height: 1.38;
  }

  .invoice-paper-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 6mm;
    padding-bottom: 4.5mm;
    border-bottom: 0.18mm solid #d7d7d7;
  }

  .invoice-brand {
    display: flex;
    align-items: center;
    gap: 3mm;
    min-width: 0;
  }

  .invoice-brand-mark {
    display: grid;
    place-items: center;
    width: 11mm;
    height: 11mm;
    flex: 0 0 11mm;
    border-radius: 3mm;
    background: #171717;
    color: #fff;
    font-size: 11px;
    font-weight: 750;
    letter-spacing: -0.04em;
  }

  .document-eyebrow {
    margin: 0 0 0.7mm;
    color: #8a8a8a;
    font-size: 6.5px;
    font-weight: 700;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  .invoice-brand h1 {
    margin: 0;
    font-size: 20px;
    line-height: 1.05;
    font-weight: 750;
    letter-spacing: -0.025em;
  }

  .invoice-kicker {
    margin: 1mm 0 0;
    color: #555;
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.24em;
    text-transform: uppercase;
  }

  .invoice-header-side {
    display: grid;
    justify-items: end;
    gap: 1.8mm;
    flex-shrink: 0;
  }

  .copy-label {
    padding: 0.9mm 1.8mm;
    border: 0.18mm solid #d0d0d0;
    border-radius: 99px;
    color: #737373;
    font-size: 6.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    line-height: 1;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .invoice-number-box {
    display: grid;
    grid-template-columns: repeat(2, auto);
    gap: 4mm;
    margin: 0;
    padding: 2.2mm 2.6mm;
    border: 0.18mm solid #d4d4d4;
    border-radius: 2.5mm;
    background: #fbfbfb;
  }

  .invoice-number-box div {
    display: grid;
    gap: 0.5mm;
  }

  .invoice-number-box dt,
  .invoice-number-box dd {
    margin: 0;
  }

  .invoice-number-box dt,
  .meta-label {
    color: #777;
    font-size: 6.5px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
  }

  .invoice-number-box dd {
    font-size: 9.5px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .invoice-intro {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(33mm, 0.75fr);
    gap: 3mm;
    margin-top: 4mm;
  }

  .customer-card {
    padding: 3.2mm 3.5mm;
    border: 0.18mm solid #dedede;
    border-radius: 3mm;
    background: #fafafa;
  }

  .customer-card p,
  .customer-name {
    margin: 0;
  }

  .customer-name {
    margin-top: 1mm;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.2;
  }

  .customer-contact {
    display: grid;
    gap: 0.4mm;
    margin-top: 1.2mm;
  }

  .customer-card p:not(.meta-label) {
    margin-top: 0;
    max-width: 105mm;
    color: #555;
    font-size: 8.75px;
    overflow-wrap: anywhere;
  }

  .invoice-intro-note {
    padding: 3.2mm;
    border-radius: 3mm;
    background: #202020;
    color: #fff;
  }

  .invoice-intro-note span {
    color: #aaa;
    font-size: 6.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .invoice-intro-note p {
    margin: 2mm 0 0;
    font-size: 8.5px;
    line-height: 1.45;
  }

  .invoice-line-items {
    margin-top: 4.2mm;
  }

  .invoice-table-wrap {
    margin-top: 0;
    border: 0;
    border-top: 0.25mm solid #292929;
    border-bottom: 0.18mm solid #cfcfcf;
    border-radius: 0;
    overflow: hidden;
  }

  .invoice-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 9.25px;
  }

  .invoice-table thead {
    display: table-header-group;
  }

  .invoice-table th {
    padding: 2.2mm 1.3mm;
    border-bottom: 0.18mm solid #d0d0d0;
    background: #f7f7f7;
    color: #666;
    font-size: 7px;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-align: left;
    text-transform: uppercase;
  }

  .invoice-table td {
    padding: 2.2mm 1.3mm;
    border-bottom: 0.12mm solid #e5e5e5;
    vertical-align: middle;
  }

  .invoice-table tbody tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .invoice-table tbody tr:last-child td {
    border-bottom: 0;
  }

  .invoice-table tbody tr:nth-child(even) {
    background: #fdfdfd;
  }

  .invoice-table .description {
    overflow-wrap: anywhere;
  }

  .invoice-table .numeric {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .invoice-table .amount {
    font-weight: 700;
    color: #111;
  }

  .invoice-table .row-number {
    color: #999;
    font-size: 7.5px;
    font-weight: 700;
  }

  .invoice-table .muted-value {
    color: #666;
  }

  .invoice-summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: stretch;
    gap: 3mm;
    margin-top: 3mm;
  }

  .quantity-summary {
    display: flex;
    align-items: center;
    gap: 6mm;
    padding: 2.6mm 3mm;
    border: 0.18mm solid #dedede;
    border-radius: 2.5mm;
  }

  .quantity-summary div {
    display: grid;
    gap: 0.5mm;
  }

  .quantity-summary span,
  .grand-total-panel span {
    color: #777;
    font-size: 6.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .quantity-summary strong {
    font-size: 10.5px;
    font-variant-numeric: tabular-nums;
  }

  .grand-total-panel {
    display: grid;
    grid-template-columns: auto auto;
    align-items: center;
    gap: 5mm;
    min-width: 48mm;
    padding: 2.6mm 3.2mm;
    border-radius: 2.5mm;
    background: #181818;
    color: #fff;
  }

  .grand-total-panel span {
    color: #aaa;
  }

  .grand-total-panel strong {
    font-size: 15px;
    font-weight: 750;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .invoice-paper-footer {
    display: flex;
    justify-content: space-between;
    gap: 5mm;
    margin-top: 4mm;
    padding-top: 2.5mm;
    border-top: 0.15mm solid #d0d0d0;
    color: #888;
    font-size: 7.5px;
    letter-spacing: 0.03em;
  }

  @media print {
    @page {
      size: A5 portrait;
      margin: 8mm;
    }

    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      color: #000 !important;
    }

    body * {
      visibility: hidden !important;
    }

    #invoice-print-root,
    #invoice-print-root * {
      visibility: visible !important;
    }

    #invoice-print-root {
      position: absolute !important;
      inset: 0 !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }

    .invoice-preview-stage {
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }

    .invoice-paper {
      width: auto !important;
      min-height: 194mm !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      color: #000 !important;
      break-after: page;
      page-break-after: always;
    }

    .invoice-paper.last-copy {
      break-after: auto;
      page-break-after: auto;
    }

    .invoice-table-wrap {
      overflow: visible !important;
    }

    .invoice-table th {
      background: #f7f7f7 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .invoice-brand-mark,
    .invoice-intro-note,
    .grand-total-panel {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .invoice-table tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
  }
`;

function injectPrintStyle() {
  if (document.getElementById("invoice-print-style")) return;
  const style = document.createElement("style");
  style.id = "invoice-print-style";
  style.textContent = PRINT_STYLE;
  document.head.appendChild(style);
}

export function InvoicePrintPreview({
  invoice,
  businessName = "Akhlaq Garments",
}) {
  return (
    <div id="invoice-print-root">
      <div className="invoice-preview-stage">
        <InvoicePaper invoice={invoice} businessName={businessName} />
      </div>
    </div>
  );
}

export { InvoicePaper };

export default function InvoicePreviewModal({ isOpen, onClose, invoice, loading = false }) {
  useEffect(() => {
    injectPrintStyle();
  }, []);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice Preview"
      subtitle="A5 portrait print preview"
      maxWidth="max-w-4xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-end gap-3">
          <div className="flex gap-2.5">
            <Button variant="secondary" outline icon={X} onClick={onClose}>Close</Button>
            <Button icon={Printer} onClick={() => window.print()} disabled={!invoice || loading}>Print Invoice</Button>
          </div>
        </div>
      }
    >
      {loading && <div className="py-16 text-center text-sm text-gray-400">Loading invoice...</div>}
      {!loading && !invoice && <div className="py-16 text-center text-sm text-gray-400">No invoice data available.</div>}
      {!loading && invoice && <InvoicePrintPreview invoice={invoice} />}
    </Modal>
  );
}
