import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Save, Trash2 } from "lucide-react";
import Modal from "../Modal";
import Button from "../Button";
import Input from "../Input";
import { SectionHeader } from "../SectionHeader";
import { fetchInvoices } from "../../api/invoice";
import { fetchMyInvoiceCounter } from "../../api/business";
import { useToast } from "../../context/ToastContext";
import { InvoicePaper } from "./InvoicePreviewModal";
import { useShortcut } from "../../hooks/useShortcuts";
import { isEventMatchingShortcut } from "../../utils/shortcuts";

const todayInput = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const newRow = () => ({
  _key: crypto.randomUUID(),
  size: "",
  description: "",
  dzn: "",
  pcs: "",
  rate: "",
  discount: "",
});

const numberValue = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const capitalizeWords = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const discountDetails = (discount, pcs, rate) => {
  const raw = String(discount || "").trim();
  if (!raw) return { amount: 0, type: "" };
  const pieces = Math.max(0, numberValue(pcs));
  const unitRate = Math.max(0, numberValue(rate));
  if (!pieces || !unitRate) return { amount: 0, type: raw.endsWith("%") ? "percent" : "rupee" };

  if (raw.endsWith("%")) {
    const percentage = Math.min(100, Math.max(0, numberValue(raw.slice(0, -1))));
    return {
      amount: pieces * (unitRate * percentage / 100),
      type: "percent",
    };
  }

  const perPieceDiscount = Math.min(unitRate, Math.max(0, numberValue(raw)));
  return {
    amount: pieces * perPieceDiscount,
    type: "rupee",
  };
};

const calculateArticle = (row) => {
  const dzn = numberValue(row.dzn);
  const pcs = numberValue(row.pcs);
  const rate = numberValue(row.rate);
  const gross = pcs * rate;
  const discount = discountDetails(row.discount, pcs, rate);
  const discountAmount = Math.min(gross, discount.amount);
  return {
    ...row,
    dzn,
    pcs,
    rate,
    gross_amount: gross,
    discount_type: discount.type,
    discount_amount: discountAmount,
    amount: Math.max(0, gross - discountAmount),
  };
};

const calculateInvoiceTotals = (rows, salesReturnAmount = 0, receivedAmount = 0) => {
  const grossAmount = rows.reduce((sum, row) => sum + Number(row.gross_amount || 0), 0);
  const percentDiscountAmount = rows.reduce(
    (sum, row) => sum + (row.discount_type === "percent" ? Number(row.discount_amount || 0) : 0),
    0
  );
  const rupeeDiscountAmount = rows.reduce(
    (sum, row) => sum + (row.discount_type === "rupee" ? Number(row.discount_amount || 0) : 0),
    0
  );
  const totalDiscountAmount = percentDiscountAmount + rupeeDiscountAmount;
  const netAmount = Math.max(0, grossAmount - totalDiscountAmount);
  const salesReturn = Math.min(netAmount, Math.max(0, numberValue(salesReturnAmount)));
  const payableAmount = Math.max(0, netAmount - salesReturn);
  const received = Math.max(0, numberValue(receivedAmount));
  return {
    gross_amount: grossAmount,
    percent_discount_amount: percentDiscountAmount,
    rupee_discount_amount: rupeeDiscountAmount,
    total_discount_amount: totalDiscountAmount,
    net_amount: netAmount,
    sales_return_amount: salesReturn,
    received_amount: received,
    total_amount: payableAmount,
    balance_amount: Math.max(0, payableAmount - received),
    return_amount: Math.max(0, received - payableAmount),
  };
};

function formatInvoiceNumber(year, nextInvoiceNo) {
  return `${year}-${String(Math.max(1, Number(nextInvoiceNo) || 1)).padStart(4, "0")}`;
}

function ArticleRow({
  row,
  index,
  onChange,
  onRemove,
  canRemove,
  isLast,
  addRowShortcut,
  onAddRow,
}) {
  const calculated = calculateArticle(row);
  const inputClass = "w-full min-w-[76px] rounded-lg border border-gray-400/85 bg-gray-50 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300";

  const update = (field, value) => {
    const next = { ...row, [field]: value };
    if (field === "pcs") {
      next.dzn = value === "" ? "" : String(numberValue(value) / 12);
    }
    if (field === "dzn") {
      next.pcs = value === "" ? "" : String(numberValue(value) * 12);
    }
    onChange(row._key, next);
  };

  const updateDiscount = (value) => {
    if (value.endsWith("%") && numberValue(value.slice(0, -1)) > 100) return;
    update("discount", value);
  };

  const handleLastInputKeyDown = (event) => {
    if (!isLast || !isEventMatchingShortcut(event, addRowShortcut)) return;
    event.preventDefault();
    event.stopPropagation();
    onAddRow();
  };

  const articleInputProps = (field) => ({
    "data-article-input": "true",
    "data-article-field": field,
  });

  return (
    <tr className="group border-b border-gray-200 hover:bg-emerald-50/30">
      <td className="px-2 py-2 text-center text-xs text-gray-400">{index + 1}</td>
      <td className="px-1.5 py-2"><input {...articleInputProps("size")} value={row.size} onChange={(e) => update("size", e.target.value)} className={inputClass} /></td>
      <td className="px-1.5 py-2"><input {...articleInputProps("description")} value={row.description} onChange={(e) => update("description", capitalizeWords(e.target.value))} className={`${inputClass} min-w-[180px]`} /></td>
      <td className="px-1.5 py-2"><input {...articleInputProps("dzn")} type="number" min="0" step="0.01" value={row.dzn} onChange={(e) => update("dzn", e.target.value)} className={inputClass} /></td>
      <td className="px-1.5 py-2"><input {...articleInputProps("pcs")} type="number" min="0" step="1" value={row.pcs} onChange={(e) => update("pcs", e.target.value)} className={inputClass} /></td>
      <td className="px-1.5 py-2">
        <input
          {...articleInputProps("rate")}
          type="number"
          min="0"
          step="0.01"
          value={row.rate}
          onChange={(e) => update("rate", e.target.value)}
          onKeyDown={handleLastInputKeyDown}
          className={inputClass}
        />
      </td>
      <td className="px-1.5 py-2">
        <input
          {...articleInputProps("discount")}
          value={row.discount}
          onChange={(e) => updateDiscount(e.target.value)}
          onKeyDown={handleLastInputKeyDown}
          placeholder="10% or 50"
          className={`${inputClass} min-w-[105px]`}
        />
      </td>
      <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums text-emerald-700">{calculated.amount.toFixed(2)}</td>
      <td className="px-2 py-2 text-center">
        <button type="button" onClick={() => onRemove(row._key)} disabled={!canRemove} className="rounded-lg p-1 text-gray-300 hover:text-red-500 disabled:invisible">
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

export default function InvoiceFormModal({ isOpen, onClose, onAction }) {
  const { showToast } = useToast();
  const customerInputRef = useRef(null);
  const urduTitleInputRef = useRef(null);
  const salesmanInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const articleGridRef = useRef(null);
  const nextButtonRef = useRef(null);
  const addRowShortcut = useShortcut("production_add_row");
  const [step, setStep] = useState("entry");
  const [customerName, setCustomerName] = useState("");
  const [customerUrduTitle, setCustomerUrduTitle] = useState("");
  const [salesmanName, setSalesmanName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [articles, setArticles] = useState([newRow()]);
  const [salesReturnAmount, setSalesReturnAmount] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [previousCustomers, setPreviousCustomers] = useState([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setStep("entry");
    setCustomerName("");
    setCustomerUrduTitle("");
    setSalesmanName("");
    setPhone("");
    setAddress("");
    setArticles([newRow()]);
    setSalesReturnAmount("");
    setReceivedAmount("");
    setError("");

    Promise.all([
      fetchInvoices({ page: 1, limit: 5000 }),
      fetchMyInvoiceCounter({ year: new Date().getFullYear() }),
    ]).then(([invoiceRes, counterRes]) => {
      const byName = new Map();
      (invoiceRes?.data || []).forEach((invoice) => {
        const name = String(invoice?.customer_name || "").trim();
        if (!name) return;
        byName.set(name.toLowerCase(), {
          name,
          urduTitle: invoice?.customer_urdu_title || "",
          phone: invoice?.customer_phone || "",
          address: invoice?.customer_address || "",
        });
      });
      setPreviousCustomers(Array.from(byName.values()));
      setInvoiceNumber(formatInvoiceNumber(
        counterRes?.year || new Date().getFullYear(),
        counterRes?.next_invoice_no || 1
      ));
    }).catch(() => {
      setPreviousCustomers([]);
      setInvoiceNumber(formatInvoiceNumber(new Date().getFullYear(), 1));
    });

    setTimeout(() => customerInputRef.current?.focus(), 100);
  }, [isOpen]);

  const calculatedArticles = useMemo(() => articles.map(calculateArticle), [articles]);
  const invoiceTotals = useMemo(
    () => calculateInvoiceTotals(calculatedArticles, salesReturnAmount, receivedAmount),
    [calculatedArticles, receivedAmount, salesReturnAmount]
  );

  const draftInvoice = useMemo(() => ({
    invoice_number: invoiceNumber,
    invoice_date: todayInput(),
    customer_name: customerName.trim(),
    customer_urdu_title: customerUrduTitle.trim(),
    salesman_name: salesmanName.trim(),
    customer_phone: phone.trim(),
    customer_address: address.trim(),
    articles: calculatedArticles,
    ...invoiceTotals,
  }), [address, calculatedArticles, customerName, customerUrduTitle, invoiceNumber, invoiceTotals, phone, salesmanName]);

  const chooseCustomer = (name) => {
    setCustomerName(name);
    const match = previousCustomers.find((customer) => customer.name.toLowerCase() === name.trim().toLowerCase());
    if (match) {
      setCustomerUrduTitle(match.urduTitle);
      setPhone(match.phone);
      setAddress(match.address);
    }
  };

  const focusAndSelect = (element) => {
    if (!element) return;
    element.focus();
    if (typeof element.select === "function") element.select();
  };

  const focusFirstSizeInput = () => {
    const firstSizeInput = articleGridRef.current?.querySelector(
      "[data-article-input='true'][data-article-field='size']"
    );
    focusAndSelect(firstSizeInput);
  };

  const moveOnEnter = (event, nextFocus) => {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    requestAnimationFrame(nextFocus);
  };

  const handleNext = () => {
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    const validRows = calculatedArticles.filter((row) =>
      row.size || row.description || row.dzn > 0 || row.pcs > 0 || row.rate > 0
    );
    if (!validRows.length) {
      setError("Enter at least one article.");
      return;
    }
    const invalidDiscount = articles.find((row) => {
      const raw = String(row.discount || "").trim();
      return raw.endsWith("%") && numberValue(raw.slice(0, -1)) > 100;
    });
    if (invalidDiscount) {
      setError("Percentage discount cannot exceed 100%.");
      return;
    }
    setArticles(validRows);
    setError("");
    setStep("preview");
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await onAction(draftInvoice);
      onClose();
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to save invoice";
      setError(message);
      showToast({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  const updateRow = (key, next) => setArticles((rows) => rows.map((row) => row._key === key ? next : row));
  const removeRow = (key) => setArticles((rows) => rows.filter((row) => row._key !== key));
  const addArticleRow = useCallback(() => {
    setArticles((rows) => [...rows, newRow()]);
    requestAnimationFrame(() => {
      const inputs = articleGridRef.current?.querySelectorAll("[data-article-input='true']");
      inputs?.[inputs.length - 6]?.focus();
    });
  }, []);

  const handleArticleGridKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.dataset.articleInput !== "true") return;

    const inputs = Array.from(
      articleGridRef.current?.querySelectorAll("[data-article-input='true']") || []
    ).filter((input) => !input.disabled);
    const currentIndex = inputs.indexOf(target);
    if (currentIndex < 0) return;

    event.preventDefault();
    event.stopPropagation();
    const nextInput = inputs[currentIndex + 1];
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
      return;
    }
    nextButtonRef.current?.focus();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === "entry" ? "Create Invoice" : "Invoice Preview"}
      subtitle={step === "entry" ? "Enter customer and article details" : "Review the invoice before saving"}
      maxWidth="max-w-6xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <p className="text-xs text-red-600">{error}</p>
          <div className="flex gap-3">
            {step === "preview" && (
              <Button variant="secondary" outline icon={ArrowLeft} onClick={() => setStep("entry")} disabled={submitting}>Back</Button>
            )}
            {step === "entry" ? (
              <Button ref={nextButtonRef} icon={ArrowRight} iconPosition="right" onClick={handleNext}>Next</Button>
            ) : (
              <Button icon={Save} onClick={handleSave} loading={submitting}>Save Invoice</Button>
            )}
          </div>
        </div>
      }
    >
      {step === "entry" ? (
        <div className="grid gap-5 p-0.5">
          <section>
            <SectionHeader step="1" title="Customer Details" subtitle="Type a customer name or choose one used on a previous invoice" />
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
              <div>
                <Input
                  ref={customerInputRef}
                  label="Customer Name"
                  value={customerName}
                  onChange={(e) => chooseCustomer(e.target.value)}
                  capitalize
                  onKeyDown={(event) => moveOnEnter(event, () => focusAndSelect(salesmanInputRef.current))}
                  list="invoice-customer-history"
                  placeholder="Enter customer name"
                />
                <datalist id="invoice-customer-history">
                  {previousCustomers.map((customer) => <option key={customer.name} value={customer.name} />)}
                </datalist>
              </div>
              <Input
                ref={salesmanInputRef}
                label="Salesman Name"
                value={salesmanName}
                onChange={(e) => setSalesmanName(capitalizeWords(e.target.value))}
                onKeyDown={(event) => moveOnEnter(event, () => focusAndSelect(urduTitleInputRef.current))}
                placeholder="Optional"
                required={false}
              />
              <Input
                ref={urduTitleInputRef}
                label="Urdu Title"
                value={customerUrduTitle}
                onChange={(e) => setCustomerUrduTitle(e.target.value)}
                onKeyDown={(event) => moveOnEnter(event, () => focusAndSelect(phoneInputRef.current))}
                placeholder="اردو نام / عنوان"
                dir="rtl"
                lang="ur"
                required={false}
              />
              <Input
                ref={phoneInputRef}
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(event) => moveOnEnter(event, () => focusAndSelect(addressInputRef.current))}
                placeholder="Optional"
                required={false}
              />
              <Input
                ref={addressInputRef}
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(event) => moveOnEnter(event, focusFirstSizeInput)}
                placeholder="Optional"
                required={false}
              />
            </div>
          </section>

          <section>
            <SectionHeader
              step="2"
              title="Articles"
              subtitle="PCs and dozens stay in sync automatically; amount is Rate × PCs"
              right={<Button size="sm" outline icon={Plus} onClick={addArticleRow}>Add Row</Button>}
            />
            <div
              ref={articleGridRef}
              onKeyDown={handleArticleGridKeyDown}
              className="overflow-x-auto rounded-xl border border-gray-300"
            >
              <table className="w-full min-w-[980px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50 text-xs font-semibold text-gray-500">
                    <th className="w-10 px-2 py-2.5">#</th>
                    <th className="px-2 py-2.5 text-left">Size</th>
                    <th className="px-2 py-2.5 text-left">Description</th>
                    <th className="px-2 py-2.5 text-left">Dzn</th>
                    <th className="px-2 py-2.5 text-left">PCs</th>
                    <th className="px-2 py-2.5 text-left">Rate</th>
                    <th className="px-2 py-2.5 text-left">Discount</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {articles.map((row, index) => (
                    <ArticleRow
                      key={row._key}
                      row={row}
                      index={index}
                      onChange={updateRow}
                      onRemove={removeRow}
                      canRemove={articles.length > 1}
                      isLast={index === articles.length - 1}
                      addRowShortcut={addRowShortcut}
                      onAddRow={addArticleRow}
                    />
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300 bg-gray-50 font-semibold">
                    <td colSpan={7} className="px-4 py-3 text-right text-sm text-gray-600">Total</td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-emerald-700">{invoiceTotals.net_amount.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section>
            <SectionHeader step="3" title="Payment Adjustments" subtitle="Sales return and received amount are reflected in the final invoice total" />
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <Input
                label="Sales Return Amount"
                type="number"
                min="0"
                step="0.01"
                value={salesReturnAmount}
                onChange={(e) => setSalesReturnAmount(e.target.value)}
                placeholder="0.00"
                required={false}
              />
              <Input
                label="Received Amount"
                type="number"
                min="0"
                step="0.01"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                placeholder="0.00"
                required={false}
              />
            </div>
            <div className="mt-3 grid gap-2 rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm md:grid-cols-4">
              <div><span className="text-gray-500">Gross</span><p className="font-semibold tabular-nums">{invoiceTotals.gross_amount.toFixed(2)}</p></div>
              <div><span className="text-gray-500">% Discount</span><p className="font-semibold tabular-nums">{invoiceTotals.percent_discount_amount.toFixed(2)}</p></div>
              <div><span className="text-gray-500">Rs Discount</span><p className="font-semibold tabular-nums">{invoiceTotals.rupee_discount_amount.toFixed(2)}</p></div>
              <div><span className="text-gray-500">Payable</span><p className="font-semibold tabular-nums text-emerald-700">{invoiceTotals.total_amount.toFixed(2)}</p></div>
            </div>
          </section>
        </div>
      ) : (
        <div className="invoice-preview-stage">
          <InvoicePaper invoice={draftInvoice} businessName="Akhlaq Garments" />
        </div>
      )}
    </Modal>
  );
}
