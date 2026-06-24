import { useEffect, useState } from "react";
import { Printer, X } from "lucide-react";
import Modal from "../Modal";
import Button from "../Button";
import InvoicePaper from "./InvoicePaper";
import ThermalInvoicePaper from "./ThermalInvoicePaper";

const getPrintStyle = (printMode = "a5") => `
  @page {
    size: ${printMode === "thermal" ? "80mm 297mm" : "A5 portrait"};
    margin: ${printMode === "thermal" ? "0" : "0.24in"};
  }

  .invoice-preview-stage {
    display: grid;
    justify-items: center;
    width: 100%;
    padding: 18px 12px;
    overflow-x: auto;
    overflow-y: hidden;
    border-radius: 12px;
    background: #f3f4f6;
  }

  .invoice-paper,
  .invoice-paper * {
    box-sizing: border-box;
  }

  .invoice-paper {
    width: 136mm;
    max-width: 100%;
    padding: 5mm;
    --invoice-content-inset-x: 3px;
    --invoice-border-bleed-x: 3px;
    --invoice-border-color: #383c43;
    --invoice-border-width: 1px;
    --invoice-radius: 7px;
    background: #fff;
    color: #111827;
    border-top: 0;
    overflow: visible;
    box-shadow:
      0 1px 2px rgba(17, 24, 39, 0.06),
      0 16px 38px rgba(17, 24, 39, 0.13);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size: 8.8px;
    line-height: 1.32;
    font-variant-numeric: tabular-nums;
  }

  .invoice-paper-header {
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;
    padding: 0 var(--invoice-content-inset-x) 7px;
  }

  .invoice-paper-header::after,
  .invoice-document-type::after,
  .billed-to-section::after,
  .thermal-header::after,
  .thermal-meta::after,
  .thermal-customer::after,
  .thermal-items::after,
  .thermal-summary::after {
    content: "";
    position: absolute;
    left: calc(var(--invoice-border-bleed-x) * -1);
    right: calc(var(--invoice-border-bleed-x) * -1);
    bottom: 0;
    border-top: var(--invoice-border-width) solid var(--invoice-border-color);
    pointer-events: none;
  }

  .invoice-brand {
    min-width: 0;
    flex: 1;
  }

  .invoice-brand h1 {
    margin: 0;
    color: #111827;
    font-size: 21px;
    font-weight: 850;
    letter-spacing: 0.015em;
    line-height: 1.0;
  }

  .urdu-inline {
    display: inline-block;
    margin-left: 5px;
    color: #15181c;
    font-family: "Noto Nastaliq Urdu", "Noto Naskh Arabic", Arial, sans-serif;
    font-size: 0.7em;
    font-weight: 650;
    direction: rtl;
    unicode-bidi: isolate;
    vertical-align: baseline;
  }

  .invoice-business-details {
    margin: 4px 0 0;
    color: #374151;
    font-size: 8.8px;
    font-weight: 550;
    line-height: 1.36;
  }

  .invoice-salesman-line {
    margin: 3px 0 0;
    color: #111827;
    font-size: 9.1px;
    font-weight: 800;
    line-height: 1.25;
  }

  .copy-label {
    padding: 2px 5px;
    border: var(--invoice-border-width) solid var(--invoice-border-color);
    border-radius: 999px;
    color: #64748b;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .invoice-meta-panel {
    display: grid;
    justify-items: end;
    gap: 3px;
    flex: 0 0 41mm;
  }

  .invoice-document-type {
    position: relative;
    width: 100%;
    margin: 0;
    padding: 0 0 3px;
    color: #111827;
    font-size: 9.6px;
    font-weight: 850;
    line-height: 1.2;
    text-align: right;
    text-transform: uppercase;
  }

  .invoice-number-box {
    display: grid;
    width: 100%;
    margin: 0;
    padding: 1px 0 0;
    border: 0;
    border-radius: 0;
    background: #fff;
    gap: 0;
  }

  .invoice-number-box div {
    display: grid;
    grid-template-columns: 18mm 1fr;
    align-items: center;
    gap: 4px;
    min-height: 15px;
  }

  .invoice-number-box dt,
  .invoice-number-box dd {
    margin: 0;
  }

  .invoice-number-box dt {
    color: #383c43;
    font-size: 8.3px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .invoice-number-box dd {
    color: #111827;
    font-size: 9px;
    font-weight: 850;
    text-align: right;
    white-space: nowrap;
  }

  .billed-to-section {
    position: relative;
    margin-top: 6px;
    padding: 0 var(--invoice-content-inset-x) 6px;
    border: 0;
    border-radius: 0;
    background: #fff;
    color: #15181c;
    font-size: 9px;
  }

  .customer-topline {
    margin: 0 0 3px;
    color: #383c43;
    font-size: 8.4px;
    line-height: 1.25;
  }

  .customer-main {
    min-width: 0;
    padding: 0;
  }

  .section-label {
    margin: 0;
    color: #383c43;
    font-size: 8.4px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .billed-to-section h2 {
    margin: 0;
    color: #111827;
    font-size: 14.2px;
    font-weight: 850;
    letter-spacing: 0.015em;
    line-height: 1.05;
  }

  .customer-contact-line {
    margin: 4px 0 0;
    color: #374151;
    font-size: 8.7px;
    font-weight: 550;
    line-height: 1.35;
  }

  .invoice-line-items {
    margin-top: 6px;
  }

  .invoice-table-wrap {
    position: relative;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    margin-top: 0;
    border: var(--invoice-border-width) solid var(--invoice-border-color);
    border-radius: var(--invoice-radius);
    background: #fff;
    overflow: hidden;
    box-sizing: border-box;
  }

  .invoice-table {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    border-collapse: separate;
    border-spacing: 0;
    table-layout: fixed;
    border: 0;
    box-sizing: border-box;
    font-size: 8.2px;
  }

  .invoice-table col:nth-child(1) { width: 5% !important; }
  .invoice-table col:nth-child(2) { width: 10% !important; }
  .invoice-table col:nth-child(3) { width: 24% !important; }
  .invoice-table col:nth-child(4) { width: 8% !important; }
  .invoice-table col:nth-child(5) { width: 7% !important; }
  .invoice-table col:nth-child(6) { width: 8% !important; }
  .invoice-table col:nth-child(7) { width: 7% !important; }
  .invoice-table col:nth-child(8) { width: 15% !important; }
  .invoice-table col:nth-child(9) { width: 16% !important; }

  .invoice-table thead {
    display: table-header-group;
  }

  .invoice-table .print-label {
    display: none;
  }

  .invoice-table th {
    padding: 4px 5.5px;
    border: 0;
    border-top: 0;
    border-bottom: var(--invoice-border-width) solid var(--invoice-border-color);
    background: #dfe3e8;
    color: #111827;
    font-size: 8.1px;
    font-weight: 750;
    letter-spacing: 0.03em;
    text-align: left;
    text-transform: capitalize;
    overflow: hidden;
    text-overflow: clip;
    white-space: nowrap;
  }

  .invoice-table th:first-child {
    border-top-left-radius: calc(var(--invoice-radius) - 1px);
  }

  .invoice-table th:last-child {
    border-top-right-radius: calc(var(--invoice-radius) - 1px);
  }

  .invoice-table td {
    padding: 3.5px 5.5px;
    border: 0;
    border-bottom: var(--invoice-border-width) solid var(--invoice-border-color);
    color: #111827;
    font-size: 8.1px;
    overflow: hidden;
    text-overflow: clip;
    vertical-align: middle;
    line-height: 1.25;
  }

  .invoice-table tbody tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .invoice-table tbody tr:last-child td {
    border-bottom: 0;
  }

  .invoice-table .description {
    color: #111827;
    font-size: 8.1px;
    font-weight: 700;
    letter-spacing: 0.02em;
    overflow: visible;
    overflow-wrap: anywhere;
    text-overflow: unset;
    white-space: normal;
  }

  .invoice-table .center {
    text-align: center;
  }

  .invoice-table .tabular,
  .invoice-table .numeric {
    font-variant-numeric: tabular-nums;
  }

  .invoice-table .numeric {
    text-align: right;
    white-space: nowrap;
  }

  .invoice-table .amount {
    font-weight: 750;
    letter-spacing: 0.02em;
    color: #000;
    text-align: right;
    white-space: nowrap;
  }

  .invoice-table .row-number {
    color: #374151;
    font-size: 7.8px;
    font-weight: 750;
  }

  .invoice-table .muted-value {
    color: #111827;
  }

  .invoice-table tfoot td {
    padding: 3px 5.5px;
    border: 0;
    border-top: var(--invoice-border-width) solid var(--invoice-border-color);
    border-bottom: 0;
    background: #dfe3e8;
    color: #111827;
    font-size: 8.1px;
    font-weight: 750;
    letter-spacing: 0.02em;
  }

  .invoice-table tfoot td:first-child {
    border-bottom-left-radius: calc(var(--invoice-radius) - 1px);
  }

  .invoice-table tfoot td:last-child {
    border-bottom-right-radius: calc(var(--invoice-radius) - 1px);
  }

  .invoice-summary {
    display: flex;
    justify-content: flex-end;
    margin-top: 7px;
  }

  .invoice-totals-panel {
    display: grid;
    gap: 0;
    width: 56mm;
    max-width: 100%;
    padding: 0;
    border: var(--invoice-border-width) solid var(--invoice-border-color);
    border-radius: var(--invoice-radius);
    background: #fff;
    color: #111827;
    overflow: hidden;
  }

  .summary-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 8px;
    font-size: 8.8px;
    padding: 3.5px 4.5px;
    border-bottom: var(--invoice-border-width) solid var(--invoice-border-color);
  }

  .summary-row:last-child {
    border-bottom: 0;
  }

  .invoice-totals-panel span {
    color: #111827;
    font-size: 8.8px;
    font-weight: 700;
    letter-spacing: 0;
    text-transform: none;
  }

  .invoice-totals-panel strong {
    color: #000;
    font-size: 9.3px;
    font-weight: 850;
    text-align: right;
    white-space: nowrap;
  }

  .invoice-totals-panel .invoice-emphasis-row span,
  .invoice-totals-panel .invoice-emphasis-row strong {
    color: #111827;
    font-weight: 750;
    letter-spacing: 0.02em;
  }

  .invoice-totals-panel .invoice-emphasis-row {
    background: #f1f5f9;
  }

  .invoice-totals-panel .invoice-emphasis-row strong {
    font-weight: 800;
    font-size: 9.7px;
  }

  .invoice-totals-panel .invoice-total-row {
    margin-top: 0;
    color: #111827;
    background: #dfe3e8;
  }

  .invoice-totals-panel .invoice-total-row span,
  .invoice-totals-panel .invoice-total-row strong {
    font-weight: 750;
    letter-spacing: 0.02em;
  }

  .invoice-totals-panel .invoice-total-row strong {
    font-weight: 800;
    font-size: 9.8px;
  }

  .invoice-paper-footer {
    position: relative;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: start;
    gap: 8px;
    margin-top: 7px;
    padding: 5px var(--invoice-content-inset-x) 0;
    border-top: var(--invoice-border-width) solid var(--invoice-border-color);
  }

  .invoice-paper-footer p {
    margin: 0;
    line-height: 1.3;
  }

  .invoice-footer-left {
    display: grid;
    gap: 1px;
    text-align: left;
  }

  .invoice-thanks {
    color: #111827;
    font-size: 7.8px;
    font-weight: 700;
    letter-spacing: 0.015em;
  }

  .invoice-footer-note {
    color: #6b7280;
    font-size: 7.2px;
    font-weight: 500;
  }

  .invoice-footer-branding {
    display: grid;
    gap: 1px;
    justify-items: end;
    text-align: right;
  }

  .invoice-system-credit {
    color: #111827;
    font-size: 7.8px;
    font-weight: 700;
    letter-spacing: 0.015em;
  }

  .invoice-agency-credit {
    color: #374151;
    font-size: 7.2px;
    font-weight: 500;
  }

  .thermal-invoice-paper,
  .thermal-invoice-paper * {
    box-sizing: border-box;
  }

  .thermal-invoice-paper {
    width: 80mm;
    padding: 4mm 4mm 5mm;
    --invoice-content-inset-x: 5px;
    --invoice-border-bleed-x: 5px;
    --invoice-border-color: #383c43;
    --invoice-border-width: 1px;
    background: #fff;
    color: #111827;
    box-shadow:
      0 1px 2px rgba(17, 24, 39, 0.06),
      0 12px 28px rgba(17, 24, 39, 0.12);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size: 10.5px;
    line-height: 1.28;
    font-variant-numeric: tabular-nums;
  }

  .thermal-header {
    position: relative;
    padding: 0 var(--invoice-content-inset-x) 8px;
    text-align: center;
  }

  .thermal-header h1 {
    margin: 0;
    color: #111827;
    font-size: 18px;
    font-weight: 850;
    line-height: 1.08;
  }

  .thermal-urdu {
    margin: 3px 0 0;
    color: #15181c;
    font-family: "Noto Nastaliq Urdu", "Noto Naskh Arabic", Arial, sans-serif;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.5;
  }

  .thermal-shop-line {
    margin: 4px 0 0;
    color: #383c43;
    font-size: 9.5px;
    font-weight: 550;
  }

  .thermal-salesman-line {
    margin: 4px 0 0;
    color: #111827;
    font-size: 10.2px;
    font-weight: 800;
  }

  .thermal-meta {
    position: relative;
    display: grid;
    gap: 0;
    padding: 7px var(--invoice-content-inset-x);
  }

  .thermal-meta div,
  .thermal-summary div {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 8px;
    min-height: 19px;
  }

  .thermal-meta span,
  .thermal-summary span {
    color: #383c43;
    font-size: 9.5px;
    font-weight: 650;
  }

  .thermal-meta strong,
  .thermal-summary strong {
    color: #111827;
    font-size: 10.5px;
    font-weight: 800;
    text-align: right;
    white-space: nowrap;
  }

  .thermal-customer {
    position: relative;
    padding: 7px var(--invoice-content-inset-x);
  }

  .thermal-label {
    margin: 0 0 3px;
    color: #383c43;
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .thermal-customer h2 {
    margin: 0;
    color: #111827;
    font-size: 13px;
    font-weight: 850;
    line-height: 1.25;
  }

  .thermal-customer h2 span {
    display: inline-block;
    margin-left: 7px;
    color: #15181c;
    font-family: "Noto Nastaliq Urdu", "Noto Naskh Arabic", Arial, sans-serif;
    font-size: 0.78em;
    font-weight: 650;
    direction: rtl;
    unicode-bidi: isolate;
  }

  .thermal-customer p:not(.thermal-label) {
    margin: 4px 0 0;
    color: #383c43;
    font-size: 9.7px;
    font-weight: 550;
  }

  .thermal-items {
    position: relative;
    padding: 7px var(--invoice-content-inset-x);
  }

  .thermal-items-head,
  .thermal-item-title,
  .thermal-item-totals {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .thermal-items-head {
    margin-bottom: 4px;
    color: #111827;
    font-size: 9.5px;
    font-weight: 850;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .thermal-item {
    position: relative;
    padding: 6px 0;
  }

  .thermal-item::before,
  .thermal-item-totals::before,
  .thermal-summary div:not(:last-child)::after {
    content: "";
    position: absolute;
    left: calc(var(--invoice-border-bleed-x) * -1);
    right: calc(var(--invoice-border-bleed-x) * -1);
    border-top: var(--invoice-border-width) solid var(--invoice-border-color);
    pointer-events: none;
  }

  .thermal-item::before,
  .thermal-item-totals::before {
    top: 0;
  }

  .thermal-summary div:not(:last-child)::after {
    bottom: 0;
  }

  .thermal-item-title span {
    min-width: 0;
    color: #111827;
    font-size: 10.5px;
    font-weight: 800;
    overflow-wrap: anywhere;
  }

  .thermal-item-title strong {
    color: #111827;
    font-size: 10.7px;
    font-weight: 850;
    white-space: nowrap;
  }

  .thermal-item-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 2px 8px;
    margin-top: 4px;
    color: #383c43;
    font-size: 9.3px;
    font-weight: 550;
  }

  .thermal-item-totals {
    position: relative;
    margin-top: 2px;
    padding-top: 6px;
    color: #111827;
    font-size: 10px;
    font-weight: 800;
  }

  .thermal-summary {
    position: relative;
    display: grid;
    gap: 0;
    padding: 7px var(--invoice-content-inset-x);
  }

  .thermal-summary div {
    position: relative;
  }

  .thermal-summary div:last-child {
    border-bottom: 0;
  }

  .thermal-summary-strong,
  .thermal-summary-total {
    background: #f3f4f6;
  }

  .thermal-summary-strong span,
  .thermal-summary-strong strong,
  .thermal-summary-total span,
  .thermal-summary-total strong {
    color: #111827;
    font-weight: 850;
  }

  .thermal-summary-total strong {
    font-size: 12px;
  }

  .thermal-footer {
    padding: 7px var(--invoice-content-inset-x) 0;
    text-align: center;
  }

  .thermal-footer p {
    margin: 2px 0 0;
    color: #383c43;
    font-size: 9px;
    font-weight: 550;
    line-height: 1.25;
  }

  .thermal-footer p:first-child {
    margin-top: 0;
    color: #111827;
    font-size: 10px;
    font-weight: 750;
  }

  @media (max-width: 720px) {
    .invoice-preview-stage {
      justify-items: start;
    }

    .invoice-paper {
      width: 136mm;
      max-width: none;
    }
  }

  @media print {
    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      color: #000 !important;
      width: auto !important;
      height: auto !important;
      overflow: visible !important;
    }

    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body.printing-invoice > *:not(#invoice-print-clone-root) {
      display: none !important;
    }

    #invoice-print-clone-root {
      display: block !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      overflow: visible !important;
    }

    #invoice-print-clone-root,
    #invoice-print-clone-root * {
      visibility: visible !important;
    }

    #invoice-print-clone-root #invoice-print-root {
      display: block !important;
      position: static !important;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #fff !important;
    }

    #invoice-print-clone-root .invoice-preview-stage {
      display: block !important;
      width: 100% !important;
      max-width: 100% !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      background: #fff !important;
      overflow: visible !important;
    }

    #invoice-print-clone-root .invoice-paper {
      width: 136mm !important;
      max-width: 136mm !important;
      margin: 0 !important;
      padding: 0mm !important;
      --invoice-content-inset-x: 3px !important;
      --invoice-border-bleed-x: 3px !important;
      --invoice-border-color: #383c43 !important;
      --invoice-border-width: 1px !important;
      --invoice-radius: 7px !important;
      box-shadow: none !important;
      overflow: visible !important;
      background: #fff !important;
      color: #000 !important;
      transform: none !important;
      zoom: 1 !important;
      break-after: auto !important;
      page-break-after: auto !important;
    }

    #invoice-print-clone-root .invoice-paper.last-copy {
      break-after: auto !important;
      page-break-after: auto !important;
    }

    #invoice-print-clone-root .invoice-paper-header,
    #invoice-print-clone-root .billed-to-section,
    #invoice-print-clone-root .invoice-paper-footer {
      padding-left: var(--invoice-content-inset-x) !important;
      padding-right: var(--invoice-content-inset-x) !important;
    }

    #invoice-print-clone-root .invoice-brand h1 {
      font-size: 21px !important;
      font-weight: 850 !important;
      line-height: 1 !important;
    }

    #invoice-print-clone-root .urdu-inline {
      font-size: 0.7em !important;
    }

    #invoice-print-clone-root .invoice-business-details {
      font-size: 8.8px !important;
      line-height: 1.36 !important;
    }

    #invoice-print-clone-root .invoice-salesman-line {
      font-size: 9.1px !important;
      line-height: 1.25 !important;
    }

    #invoice-print-clone-root .invoice-document-type {
      font-size: 9.6px !important;
    }

    #invoice-print-clone-root .invoice-number-box dt {
      font-size: 8.3px !important;
    }

    #invoice-print-clone-root .invoice-number-box dd {
      font-size: 9px !important;
    }

    #invoice-print-clone-root .section-label,
    #invoice-print-clone-root .customer-topline {
      font-size: 8.4px !important;
    }

    #invoice-print-clone-root .billed-to-section h2 {
      font-size: 14.2px !important;
      line-height: 1.05 !important;
    }

    #invoice-print-clone-root .customer-contact-line {
      font-size: 8.7px !important;
      line-height: 1.35 !important;
    }

    #invoice-print-clone-root .invoice-paper-header {
      border-top: 0 !important;
    }

    #invoice-print-clone-root .invoice-paper-header::after,
    #invoice-print-clone-root .invoice-document-type::after,
    #invoice-print-clone-root .billed-to-section::after {
      left: calc(var(--invoice-border-bleed-x) * -1) !important;
      right: calc(var(--invoice-border-bleed-x) * -1) !important;
      border-top: var(--invoice-border-width) solid var(--invoice-border-color) !important;
    }

    #invoice-print-clone-root .invoice-table-wrap {
      position: relative !important;
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      overflow: hidden !important;
      border: var(--invoice-border-width) solid var(--invoice-border-color) !important;
      border-radius: var(--invoice-radius) !important;
      background: #fff !important;
      box-sizing: border-box !important;
      box-decoration-break: clone !important;
      -webkit-box-decoration-break: clone !important;
    }

    #invoice-print-clone-root .invoice-table {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      table-layout: fixed !important;
      border-collapse: separate !important;
      border-spacing: 0 !important;
      border: 0 !important;
      box-sizing: border-box !important;
    }

    #invoice-print-clone-root .invoice-table col:nth-child(1) { width: 5% !important; }
    #invoice-print-clone-root .invoice-table col:nth-child(2) { width: 10% !important; }
    #invoice-print-clone-root .invoice-table col:nth-child(3) { width: 24% !important; }
    #invoice-print-clone-root .invoice-table col:nth-child(4) { width: 8% !important; }
    #invoice-print-clone-root .invoice-table col:nth-child(5) { width: 7% !important; }
    #invoice-print-clone-root .invoice-table col:nth-child(6) { width: 8% !important; }
    #invoice-print-clone-root .invoice-table col:nth-child(7) { width: 7% !important; }
    #invoice-print-clone-root .invoice-table col:nth-child(8) { width: 15% !important; }
    #invoice-print-clone-root .invoice-table col:nth-child(9) { width: 16% !important; }

    #invoice-print-clone-root .invoice-table th,
    #invoice-print-clone-root .invoice-table td,
    #invoice-print-clone-root .invoice-table tfoot td {
      box-sizing: border-box !important;
      overflow: hidden !important;
      text-overflow: clip !important;
      padding-left: 5.5px !important;
      padding-right: 5.5px !important;
    }

    #invoice-print-clone-root .invoice-table thead {
      display: table-header-group !important;
    }

    #invoice-print-clone-root .invoice-table tfoot {
      display: table-row-group !important;
    }

    #invoice-print-clone-root .invoice-table th {
      border: 0 !important;
      border-top: 0 !important;
      border-left: 0 !important;
      border-right: 0 !important;
      border-bottom: var(--invoice-border-width) solid var(--invoice-border-color) !important;
      background: #dfe3e8 !important;
      text-transform: capitalize !important;
    }

    #invoice-print-clone-root .invoice-table th:first-child {
      border-top-left-radius: calc(var(--invoice-radius) - 1px) !important;
      border-bottom: var(--invoice-border-width) solid var(--invoice-border-color) !important;
    }

    #invoice-print-clone-root .invoice-table th:last-child {
      border-top-right-radius: calc(var(--invoice-radius) - 1px) !important;
      border-bottom: var(--invoice-border-width) solid var(--invoice-border-color) !important;
    }

    #invoice-print-clone-root .invoice-table td {
      border: 0 !important;
      border-top: 0 !important;
      border-left: 0 !important;
      border-right: 0 !important;
      border-bottom: var(--invoice-border-width) solid var(--invoice-border-color) !important;
    }

    #invoice-print-clone-root .invoice-table tbody tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    #invoice-print-clone-root .invoice-table tbody tr:last-child td {
      border-bottom: 0 !important;
    }

    #invoice-print-clone-root .invoice-table tfoot td {
      border: 0 !important;
      border-top: var(--invoice-border-width) solid var(--invoice-border-color) !important;
      border-bottom: 0 !important;
      background: #dfe3e8 !important;
    }

    #invoice-print-clone-root .invoice-table tfoot td:first-child {
      border-bottom-left-radius: calc(var(--invoice-radius) - 1px) !important;
    }

    #invoice-print-clone-root .invoice-table tfoot td:last-child {
      border-bottom-right-radius: calc(var(--invoice-radius) - 1px) !important;
    }

    #invoice-print-clone-root .invoice-totals-panel {
      border: var(--invoice-border-width) solid var(--invoice-border-color) !important;
      border-radius: var(--invoice-radius) !important;
      overflow: hidden !important;
    }

    #invoice-print-clone-root .summary-row {
      border-bottom: var(--invoice-border-width) solid var(--invoice-border-color) !important;
    }

    #invoice-print-clone-root .summary-row:last-child {
      border-bottom: 0 !important;
    }

    #invoice-print-clone-root .invoice-totals-panel span {
      font-size: 8.8px !important;
    }

    #invoice-print-clone-root .invoice-totals-panel strong {
      font-size: 9.3px !important;
    }

    #invoice-print-clone-root .invoice-totals-panel .invoice-emphasis-row strong {
      font-size: 9.7px !important;
    }

    #invoice-print-clone-root .invoice-totals-panel .invoice-total-row strong {
      font-size: 9.8px !important;
    }

    #invoice-print-clone-root .invoice-paper-footer {
      border-top: var(--invoice-border-width) solid var(--invoice-border-color) !important;
    }

    #invoice-print-clone-root .invoice-thanks,
    #invoice-print-clone-root .invoice-system-credit {
      font-size: 7.8px !important;
    }

    #invoice-print-clone-root .invoice-footer-note,
    #invoice-print-clone-root .invoice-agency-credit {
      font-size: 7.2px !important;
    }

    #invoice-print-clone-root .invoice-summary,
    #invoice-print-clone-root .invoice-totals-panel,
    #invoice-print-clone-root .invoice-paper-footer {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }

    #invoice-print-clone-root .thermal-invoice-paper {
      width: 80mm !important;
      max-width: none !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 4mm 4mm 5mm !important;
      --invoice-border-color: #383c43 !important;
      --invoice-border-width: 1px !important;
      box-shadow: none !important;
      overflow: visible !important;
      background: #fff !important;
      color: #000 !important;
      transform: none !important;
      zoom: 1 !important;
      break-after: auto !important;
      page-break-after: auto !important;
    }
  }
`;

function injectPrintStyle(printMode = "a5") {
  const existingStyle = document.getElementById("invoice-print-style");

  if (existingStyle) {
    existingStyle.textContent = getPrintStyle(printMode);
    return;
  }

  const style = document.createElement("style");
  style.id = "invoice-print-style";
  style.textContent = getPrintStyle(printMode);
  document.head.appendChild(style);
}

function removePrintClone() {
  document.getElementById("invoice-print-clone-root")?.remove();
  document.body.classList.remove("printing-invoice");
}

export function InvoicePrintPreview({
  invoice,
  businessName = "Akhlaq Garments",
  printMode = "a5",
}) {
  return (
    <div
      id="invoice-print-root"
      className={`invoice-print-root invoice-print-${printMode} print-mode-${printMode}`}
    >
      <div className="invoice-preview-stage">
        {printMode === "thermal" ? (
          <ThermalInvoicePaper invoice={invoice} businessName={businessName} />
        ) : (
          <InvoicePaper invoice={invoice} businessName={businessName} />
        )}
      </div>
    </div>
  );
}

export { InvoicePaper };

export default function InvoicePreviewModal({
  isOpen,
  onClose,
  invoice,
  loading = false,
}) {
  const [printMode, setPrintMode] = useState("a5");

  useEffect(() => {
    injectPrintStyle(printMode);
  }, [printMode]);

  useEffect(() => {
    return () => {
      removePrintClone();
    };
  }, []);

  const handlePrintInvoice = () => {
    const source = document.getElementById("invoice-print-root");

    if (!source) {
      window.print();
      return;
    }

    removePrintClone();

    const printContainer = document.createElement("div");
    printContainer.id = "invoice-print-clone-root";
    printContainer.appendChild(source.cloneNode(true));

    document.body.appendChild(printContainer);
    document.body.classList.add("printing-invoice");

    const cleanup = () => {
      removePrintClone();
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);

    window.setTimeout(() => {
      window.print();
    }, 0);

    window.setTimeout(cleanup, 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invoice Preview"
      subtitle={
        printMode === "thermal"
          ? "80mm thermal printer preview"
          : "A5 portrait LaserJet print preview"
      }
      maxWidth="max-w-5xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-gray-300 bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setPrintMode("a5")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                printMode === "a5"
                  ? "bg-white text-gray-950 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              LaserJet A5
            </button>

            <button
              type="button"
              onClick={() => setPrintMode("thermal")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                printMode === "thermal"
                  ? "bg-white text-gray-950 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Thermal 80mm
            </button>
          </div>

          <div className="flex flex-col items-end gap-1">
            {printMode === "a5" && (
              <p className="text-xs text-gray-400">
                For A5: select Paper Size A5, Margins: None, Scale: Default.
              </p>
            )}

            <div className="flex gap-2.5">
              <Button variant="secondary" outline icon={X} onClick={onClose}>
                Close
              </Button>

              <Button
                icon={Printer}
                onClick={handlePrintInvoice}
                disabled={!invoice || loading}
              >
                Print {printMode === "thermal" ? "Thermal" : "A5"}
              </Button>
            </div>
          </div>
        </div>
      }
    >
      {loading && (
        <div className="py-16 text-center text-sm text-gray-400">
          Loading invoice...
        </div>
      )}

      {!loading && !invoice && (
        <div className="py-16 text-center text-sm text-gray-400">
          No invoice data available.
        </div>
      )}

      {!loading && invoice && (
        <InvoicePrintPreview invoice={invoice} printMode={printMode} />
      )}
    </Modal>
  );
}