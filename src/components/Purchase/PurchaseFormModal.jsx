import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Edit3, Plus, Printer, Save, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { code128 } from "bwip-js";
import Modal from "../Modal";
import Button from "../Button";
import Input from "../Input";
import Select from "../Select";
import { SectionHeader } from "../SectionHeader";
import { listPrototypeInvoices, nextArticleNumber } from "../../utils/prototypeStorage";
import { signArticleQr } from "../../api/qr.api";

const todayInput = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const numberValue = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const newArticle = () => ({
  _key: uuidv4(),
  description: "",
  size: "",
  season: "",
  category: "",
  unit: "",
  quantity_dzn: "",
  quantity_pcs: "",
  quantity_pkt: "",
  rate: "",
  sale_rate: "",
  discount: "",
});

const calculateArticle = (row) => {
  const unit = Math.max(0, numberValue(row.unit));

  // quantity_pcs is the normalized/base quantity
  const totalPcs = Math.max(0, numberValue(row.quantity_pcs));

  const quantityDzn = totalPcs / 12;
  const quantityPkt = unit > 0 ? totalPcs / unit : 0;

  const rate = numberValue(row.rate);
  const gross = totalPcs * rate;

  const discountRaw = String(row.discount || "").trim();

  const discountAmount = discountRaw.endsWith("%")
    ? gross *
      Math.min(
        100,
        Math.max(0, numberValue(discountRaw.slice(0, -1)))
      ) /
      100
    : Math.min(gross, numberValue(discountRaw));

  return {
    ...row,

    unit,

    quantity_dzn: quantityDzn,
    quantity_pcs: totalPcs,
    quantity_pkt: quantityPkt,

    total_pcs: totalPcs,

    rate,

    discount_amount: discountAmount,

    amount: Math.max(0, gross - discountAmount),
  };
};

function PurchaseItemModal({ isOpen, onClose, onSubmit, article = null }) {
  const [item, setItem] = useState(newArticle());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setItem(article ? { ...newArticle(), ...article } : newArticle());
    setError("");
  }, [article, isOpen]);

  const update = (field, value) => setItem((prev) => ({ ...prev, [field]: value }));

  const updateQuantity = (field, value) => {
    const numericValue = numberValue(value);

    setItem((prev) => {
      const unit = numberValue(prev.unit);

      if (field === "unit") {
        const pcs = numberValue(prev.quantity_pcs);
        const pkt = numericValue > 0 ? pcs / numericValue : 0;

        return {
          ...prev,
          quantity_pkt: pkt,
        };
      }

      if (field === "quantity_dzn") {
        const pcs = numericValue * 12;
        const pkt = unit > 0 ? pcs / unit : 0;

        return {
          ...prev,
          quantity_pcs: pcs,
          quantity_pkt: pkt,
        };
      }

      if (field === "quantity_pcs") {
        const dzn = numericValue > 0 ? numericValue / 12 : 0;
        const pkt = unit > 0 ? numericValue / unit : 0;

        return {
          ...prev,
          quantity_dzn: dzn,
          quantity_pkt: pkt,
        };
      }

      if (field === "quantity_pkt") {
        const pcs = numericValue * unit;
        const dzn = pcs > 0 ? pcs / 12 : 0;

        return {
          ...prev,
          quantity_dzn: dzn,
          quantity_pcs: pcs,
        };
      }

      return prev;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!String(item.description || "").trim()) {
      setError("Description is required.");
      return;
    }
    if (numberValue(item.quantity_pkt) <= 0) {
      setError("Packet quantity is required.");
      return;
    }
    onSubmit({ ...item, ...calculateArticle(item) });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-3xl"
      title={article ? "Edit Item" : "Add Item"}
      subtitle="Enter complete article details"
      footer={
        <div className="flex w-full items-center justify-between">
          <p className="text-xs text-red-600">{error}</p>
          <div className="flex gap-3">
            <Button outline variant="secondary" onClick={onClose}>Discard</Button>
            <Button icon={Save} onClick={handleSubmit}>{article ? "Save Item" : "Add Item"}</Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3.5 p-0.5 md:grid-cols-3">
        <Input label="Description" value={item.description} onChange={(e) => update("description", e.target.value)} placeholder="Article description" className="md:col-span-2" capitalize />
        <Input label="Size" value={item.size} onChange={(e) => update("size", e.target.value)} placeholder="Size" />
        <Input label="Season" value={item.season} onChange={(e) => update("season", e.target.value)} placeholder="Season" capitalize />
        <Input label="Category" value={item.category} onChange={(e) => update("category", e.target.value)} placeholder="Category" capitalize />
        <Input label="Unit" type="number" min="0" value={item.unit} onChange={(e) => {update("unit", e.target.value); updateQuantity("unit", e.target.value)} } placeholder="Pieces per packet" />
        <Input label="Quantity - Dzn" type="number" min="0" value={item.quantity_dzn} onChange={(e) => {update("quantity_dzn", e.target.value); updateQuantity("quantity_dzn", e.target.value)}} placeholder="0" />
        <Input label="Quantity - Pcs" type="number" min="0" value={item.quantity_pcs} onChange={(e) => {update("quantity_pcs", e.target.value); updateQuantity("quantity_pcs", e.target.value)}} placeholder="0" />
        <Input label="Quantity - Pkt" type="number" min="0" value={item.quantity_pkt} onChange={(e) => {update("quantity_pkt", e.target.value); updateQuantity("quantity_pkt", e.target.value)}} placeholder="0" />
        <Input label="Purchase Rate" type="number" min="0" value={item.rate} onChange={(e) => update("rate", e.target.value)} placeholder="0.00" />
        <Input label="Sale Rate" type="number" min="0" value={item.sale_rate} onChange={(e) => update("sale_rate", e.target.value)} placeholder="0.00" />
        <Input label="Discount" value={item.discount} onChange={(e) => update("discount", e.target.value)} placeholder="10% or 50" required={false} />
        <Input label="Amount" value={calculateArticle(item).amount.toFixed(2)} disabled />
        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Modal>
  );
}

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

const maxStickerPackets = (article) => Math.max(0, Math.floor(numberValue(
  article.available_packets ?? (numberValue(article.stock_pcs) > 0 && numberValue(article.unit) > 0
    ? numberValue(article.stock_pcs) / numberValue(article.unit)
    : article.quantity_pkt)
)));

const selectedStickerArticles = (purchase, selections = {}) =>
  (purchase?.articles || []).flatMap((article) => Array.from(
    { length: Math.min(maxStickerPackets(article), Math.max(0, Math.floor(numberValue(selections[article.article_no])))) },
    () => article
  ));

const stickerPayload = (purchase, article) =>
  signArticleQr({ articleNo: article.article_no, qrId: article.qr_id || article.article_no, purchaseNumber: article.purchase_number || purchase.purchase_number });

const barcodeDataUrl = (code) => {
  const canvas = document.createElement("canvas");
  code128(canvas, { text: code, scale: 3, height: 7, includetext: false, padding: 0 });
  return canvas.toDataURL("image/png");
};

const buildQrHtml = async (purchase, selections = {}) => {
  const articles = selectedStickerArticles(purchase, selections);
  const codeByArticle = new Map();
  for (const article of articles) {
    if (!codeByArticle.has(article.article_no)) codeByArticle.set(article.article_no, await stickerPayload(purchase, article));
  }
  const labels = articles.map((article) => ({ qr: codeByArticle.get(article.article_no), article }));
  const renderedLabels = await Promise.all(labels.map(async (label) => ({
    ...label,
    barcode: barcodeDataUrl(label.qr),
    svg: await QRCode.toString(label.qr, {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 0,
      color: {
        dark: "#111827",
        light: "#ffffff",
      },
    }),
  })));

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Article QR Labels</title>
  <style>
@page { size: A4; margin: 8mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: Arial, sans-serif; color: #111827; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.sheet { display: grid; grid-template-columns: repeat(2, 90mm); grid-auto-rows: 40mm; gap: 5mm; justify-content: center; }
.label { position: relative; break-inside: avoid; overflow: hidden; border: .25mm solid #919191; border-radius: 2.5mm; background: #fff; display: grid; grid-template-columns: 1fr 38mm; }
.info { padding: 4mm 2mm 4mm 5mm; min-width:0; }
.brand { color:#127475; font-size:7px; font-weight:800; letter-spacing:.8px; text-transform:uppercase; }
.article { margin-top:1.2mm; font-size:12px; font-weight:800; line-height:1.1; }
.desc { margin-top:0; height:8mm; overflow:hidden; font-size:8.5px; font-weight:500; line-height:1.25; }
.details { margin-top:1.5mm; display:grid; grid-template-columns:1fr 1fr; gap:.8mm; font-size:7px; color:#4b5563; }
.details strong { color:#111827; }
.barcode { position:absolute; left:5mm; bottom:6.9mm; width:42mm; height:6mm; object-fit:fill; }
.purchase { position:absolute; left:5mm; bottom:4.3mm; font-size:5.5px; color:#6b7280; }
.qr { border-left:.25mm solid #919191; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:2mm; background:#f8fafc; }
.qr svg { width:25mm; height:25mm; }
.scan { margin-top:1mm; color:#127475; font-size:6px; font-weight:800; letter-spacing:.5px; }
</style></head><body><main class="sheet">
${renderedLabels.map(({ article, svg, barcode }) => `<section class="label"><div class="info"><div class="brand">TexTradeOS Pro</div><div class="article">${escapeHtml(article.article_no)}</div><div class="desc">${escapeHtml(article.description || "Untitled Article")}</div><div class="details"><span>Size <strong>${escapeHtml(article.size || "-")}</strong></span><span>Category <strong>${escapeHtml(article.category || "-")}</strong></span><span>Unit <strong>${escapeHtml(article.unit || 0)} pcs</strong></span><span>Sale <strong>Rs ${escapeHtml(Number(article.sale_rate || article.rate || 0).toFixed(2))}</strong></span></div><img class="barcode" src="${barcode}" alt=""><div class="purchase">${escapeHtml(article.purchase_number || purchase.purchase_number)} - ${escapeHtml(article.supplier_name || purchase.supplier_name || "")}</div></div><div class="qr">${svg}<div class="scan">SCAN ARTICLE</div></div></section>`).join("")}
</main></body></html>`;
};

const printPurchaseStickers = async (purchase, selections = {}) => {
  const blob = new Blob([await buildQrHtml(purchase, selections)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;width:1px;height:1px;right:0;bottom:0;border:0;opacity:0";
  frame.src = url;
  frame.onload = () => frame.contentWindow?.print();
  document.body.appendChild(frame);
  window.setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 60000);
};

const downloadStickerPdf = async (purchase, selections = {}) => {
  const articles = selectedStickerArticles(purchase, selections);
  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [90, 40] });
  const codeByArticle = new Map();
  for (let index = 0; index < articles.length; index += 1) {
    if (index > 0) pdf.addPage([90, 40], "landscape");
    const article = articles[index];
    if (!codeByArticle.has(article.article_no)) codeByArticle.set(article.article_no, await stickerPayload(purchase, article));
    const secureCode = codeByArticle.get(article.article_no);
    const qr = await QRCode.toDataURL(secureCode, { width: 500, margin: 0, errorCorrectionLevel: "M" });
    const barcode = barcodeDataUrl(secureCode);
    pdf.setDrawColor(145, 145, 145); pdf.setLineWidth(0.25); pdf.roundedRect(0.5, 0.5, 89, 39, 2.5, 2.5, "S");
    pdf.setFillColor(248, 250, 252); pdf.rect(52, 1, 37, 38, "F");
    pdf.setDrawColor(145, 145, 145); pdf.line(52, 2.5, 52, 37.5);
    pdf.setTextColor(18, 116, 117); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.text("TEXTRADEOS PRO", 5, 6.5);
    pdf.setTextColor(17, 24, 39); pdf.setFontSize(12); pdf.text(String(article.article_no), 5, 12, { maxWidth: 45 });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.text(String(article.description || "Untitled Article").slice(0, 42), 5, 16, { maxWidth: 45 });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); pdf.setTextColor(75, 85, 99);
    pdf.text(`Size: ${String(article.size || "-").slice(0, 13)}`, 5, 21); pdf.text(`Ctg: ${String(article.category || "-").slice(0, 10)}`, 28, 21);
    pdf.text(`Unit: ${article.unit || 0} pcs`, 5, 24); pdf.text(`Sale: Rs ${Number(article.sale_rate || article.rate || 0).toFixed(2)}`, 28, 24);
    pdf.addImage(barcode, "PNG", 5, 27.1, 45, 6);
    pdf.setFontSize(5.5); pdf.text(`${article.purchase_number || purchase.purchase_number} - ${article.supplier_name || purchase.supplier_name || ""}`.slice(0, 55), 5, 36.2);
    pdf.addImage(qr, "PNG", 58.5, 4, 25, 25);
    pdf.setFont("helvetica", "bold"); pdf.setTextColor(18, 116, 117); pdf.setFontSize(6); pdf.text("SCAN ARTICLE", 71, 34, { align: "center" });
  }
  pdf.save(`article-qr-stickers.pdf`);
};

export default function PurchaseFormModal({ isOpen, onClose, onSubmit, purchase = null, suppliers = [], initialStep = "entry", allowBack = true }) {
  const [step, setStep] = useState("entry");
  const [entryStage, setEntryStage] = useState(1);
  const [formData, setFormData] = useState({ supplier_id: "", purchase_date: todayInput(), articles: [newArticle()] });
  const [savedPurchase, setSavedPurchase] = useState(null);
  const [itemModal, setItemModal] = useState({ isOpen: false, article: null });
  const [labelQuantities, setLabelQuantities] = useState({});
  const [error, setError] = useState("");
  const [stickerBusy, setStickerBusy] = useState(false);
  const [labelSearch, setLabelSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setStep(initialStep);
    setEntryStage(1);
    setError("");
    setSavedPurchase(initialStep === "labels" ? purchase : null);
    setLabelQuantities({});
    setLabelSearch("");
    setFormData(purchase ? {
      supplier_id: purchase.supplier_id,
      purchase_date: purchase.purchase_date,
      articles: purchase.articles.map((article) => ({ ...article, _key: article._key || uuidv4() })),
    } : { supplier_id: "", purchase_date: todayInput(), articles: [] });
  }, [initialStep, isOpen, purchase, suppliers]);

  const supplierOptions = suppliers.filter((supplier) => supplier.isActive || supplier._id === formData.supplier_id).map((supplier) => ({
    label: supplier.supplier_name,
    value: supplier._id,
  }));

  const calculatedArticles = useMemo(() => formData.articles.map(calculateArticle), [formData.articles]);
  const totalAmount = calculatedArticles.reduce((sum, article) => sum + article.amount, 0);

  const upsertArticle = (article) => {
    setFormData((prev) => ({
      ...prev,
      articles: prev.articles.some((row) => row._key === article._key)
        ? prev.articles.map((row) => row._key === article._key ? article : row)
        : [...prev.articles, article],
    }));
    setItemModal({ isOpen: false, article: null });
  };

  const removeArticle = (key) => setFormData((prev) => ({ ...prev, articles: prev.articles.filter((article) => article._key !== key) }));

  const handleSave = () => {
    const supplier = suppliers.find((item) => item._id === formData.supplier_id);
    if (!supplier) {
      setError("Select a supplier first.");
      return;
    }
    const validArticles = calculatedArticles.filter((article) => article.description || article.size || article.quantity_pkt || article.total_pcs || article.rate);
    if (!validArticles.length) {
      setError("Enter at least one article.");
      return;
    }
    const purchaseNumber = purchase?.purchase_number || `P-${new Date(formData.purchase_date).getFullYear()}-PREVIEW`;
    const preparedArticles = validArticles.map((article, index) => ({
      ...article,
      article_no: article.article_no || nextArticleNumber(purchaseNumber, index),
    }));
    const saved = onSubmit({
      ...(purchase || {}),
      ...formData,
      supplier_name: supplier.supplier_name,
      articles: preparedArticles,
      article_count: preparedArticles.length,
      packet_count: preparedArticles.reduce((sum, article) => sum + Number(article.quantity_pkt || 0), 0),
      total_amount: preparedArticles.reduce((sum, article) => sum + Number(article.amount || 0), 0),
    });
    setError("");
    if (saved) onClose();
  };

  const labelArticles = useMemo(() => {
    const soldByArticle = new Map();
    listPrototypeInvoices().forEach((invoice) => (invoice.articles || []).forEach((article) => {
      soldByArticle.set(article.article_no, (soldByArticle.get(article.article_no) || 0) + numberValue(article.pcs));
    }));
    return (savedPurchase?.articles || []).map((article) => {
      const unit = numberValue(article.unit);
      const purchasedPcs = numberValue(article.quantity_pcs || article.total_pcs || (numberValue(article.quantity_pkt) * unit));
      const availablePackets = article.available_packets !== undefined
        ? Math.floor(numberValue(article.available_packets))
        : unit > 0 ? Math.floor(Math.max(0, purchasedPcs - (soldByArticle.get(article.article_no) || 0)) / unit) : 0;
      return { ...article, available_packets: Math.max(0, availablePackets) };
    }).filter((article) => article.available_packets > 0);
  }, [savedPurchase]);
  const selectedLabelCount = labelArticles.reduce((sum, article) => sum + Math.min(maxStickerPackets(article), numberValue(labelQuantities[article.article_no])), 0);
  const availableLabelCount = labelArticles.reduce((sum, article) => sum + maxStickerPackets(article), 0);
  const visibleLabelArticles = labelArticles.filter((article) => {
    const query = labelSearch.trim().toLowerCase();
    return !query || String(article.article_no || "").toLowerCase().includes(query) || String(article.description || "").toLowerCase().includes(query) || String(article.supplier_name || "").toLowerCase().includes(query);
  });

  const setArticleLabelQuantity = (article, value) => setLabelQuantities((prev) => ({ ...prev, [article.article_no]: Math.min(maxStickerPackets(article), Math.max(0, Math.floor(numberValue(value)))) }));

  const selectAllLabels = () => setLabelQuantities(Object.fromEntries(
    labelArticles.map((article) => [article.article_no, maxStickerPackets(article)])
  ));

  const runStickerAction = async (action) => {
    setStickerBusy(true);
    setError("");
    try {
      await action(savedPurchase, labelQuantities);
    } catch (actionError) {
      setError(actionError?.response?.data?.message || "Secure stickers could not be prepared. Check that the backend is running, then try again.");
    } finally {
      setStickerBusy(false);
    }
  };

  const continueToItems = () => {
    if (!suppliers.some((item) => item._id === formData.supplier_id)) {
      setError("Select a supplier to continue.");
      return;
    }
    setError("");
    setEntryStage(2);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === "entry" ? (purchase ? "Edit Purchase" : "Add Purchase") : "Print QR Labels"}
      subtitle={step === "entry" ? "Complete supplier details, then add purchased items" : "Choose articles and packet quantities"}
      maxWidth={step === "labels" ? "max-w-4xl" : "max-w-5xl"}
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-h-4 text-xs font-medium text-red-600">{error}</p>
          <div className="flex w-full gap-2 sm:w-auto sm:gap-3">
            {step === "labels" && allowBack && <Button variant="secondary" outline icon={ArrowLeft} onClick={() => setStep("entry")}>Back</Button>}
            {step === "entry" ? entryStage === 1 ? (
              <Button className="flex-1 sm:flex-none" onClick={continueToItems}>Continue to Items</Button>
            ) : (
              <><Button className="flex-1 sm:flex-none" variant="secondary" outline icon={ArrowLeft} onClick={() => setEntryStage(1)}>Back</Button><Button className="flex-1 sm:flex-none" icon={Save} onClick={handleSave}>{purchase ? "Save Purchase" : "Save Purchase"}</Button></>
            ) : (
              <><Button className="flex-1 sm:flex-none" outline icon={Download} disabled={selectedLabelCount === 0 || stickerBusy} onClick={() => runStickerAction(downloadStickerPdf)}>Download PDF</Button><Button className="flex-1 sm:flex-none" icon={Printer} disabled={selectedLabelCount === 0 || stickerBusy} onClick={() => runStickerAction(printPurchaseStickers)}>{stickerBusy ? "Preparing..." : `Print Stickers (${selectedLabelCount})`}</Button></>
            )}
          </div>
        </div>
      }
    >
      {step === "entry" ? (
        <div className="grid gap-5 p-0.5">
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 text-center text-xs font-semibold">
            <button type="button" onClick={() => setEntryStage(1)} className={`border-r border-gray-200 px-3 py-2.5 ${entryStage === 1 ? "bg-teal-50 text-teal-700" : "bg-white text-gray-700"}`}>1 · Supplier</button>
            <button type="button" disabled={entryStage < 2} onClick={() => setEntryStage(2)} className={`px-3 py-2.5 ${entryStage === 2 ? "bg-teal-50 text-teal-700" : "text-gray-400"}`}>2 · Items</button>
          </div>
          <section className={entryStage === 1 ? "block" : "hidden"}>
            <SectionHeader step="1" title="Purchase Details" subtitle="Select the supplier and purchase date" />
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <Select label="Supplier" value={formData.supplier_id} onChange={(value) => setFormData((prev) => ({ ...prev, supplier_id: value }))} options={supplierOptions} placeholder="Select supplier" />
              <Input label="Date" type="date" value={formData.purchase_date} onChange={(e) => setFormData((prev) => ({ ...prev, purchase_date: e.target.value }))} />
            </div>
          </section>

          <section className={entryStage === 2 ? "block" : "hidden"}>
            <SectionHeader step="2" title="Purchase Items" subtitle="Every item gets its own simple, permanent Article No. (for example ART-00001)" right={<Button size="sm" outline icon={Plus} onClick={() => setItemModal({ isOpen: true, article: null })}>Add Item</Button>} />
            <div className="grid gap-2 md:hidden">
              {calculatedArticles.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center"><p className="text-sm font-semibold text-gray-700">No items added</p><p className="mt-1 text-xs text-gray-400">Add the first purchased article.</p><Button className="mt-4" size="sm" icon={Plus} onClick={() => setItemModal({ isOpen: true, article: null })}>Add First Item</Button></div> : calculatedArticles.map((article) => (
                <div key={article._key} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{article.description || "Untitled article"}</p><p className="mt-0.5 text-xs text-gray-500">{article.size || "No size"} · {article.category || "No category"}</p></div><div className="flex gap-1"><button type="button" onClick={() => setItemModal({ isOpen: true, article })} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => removeArticle(article._key)} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></div><div className="mt-3 grid grid-cols-4 gap-2 border-t border-gray-100 pt-3 text-xs"><div><span className="text-gray-400">Packets</span><p className="font-semibold">{article.quantity_pkt || 0}</p></div><div><span className="text-gray-400">Pieces</span><p className="font-semibold">{article.total_pcs || 0}</p></div><div><span className="text-gray-400">Rate</span><p className="font-semibold">{article.rate.toFixed(2)}</p></div><div className="text-right"><span className="text-gray-400">Amount</span><p className="font-bold text-emerald-700">{article.amount.toFixed(2)}</p></div></div></div>
              ))}
              {calculatedArticles.length > 0 && <div className="flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3 text-sm text-white"><span>Purchase total</span><strong>{totalAmount.toFixed(2)}</strong></div>}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-gray-300 md:block">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50 text-xs font-semibold text-gray-500">
                    <th className="w-10 px-2 py-2.5">#</th>
                    <th className="px-2 py-2.5 text-left">Description</th>
                    <th className="px-2 py-2.5 text-left">Size</th>
                    <th className="px-2 py-2.5 text-left">Unit</th>
                    <th className="px-2 py-2.5 text-left">Pkt</th>
                    <th className="px-2 py-2.5 text-left">Rate</th>
                    <th className="px-2 py-2.5 text-left">Sale Rate</th>
                    <th className="px-2 py-2.5 text-left">Discount</th>
                    <th className="px-2 py-2.5 text-left">Amount</th>
                    <th className="w-24 px-2 py-2.5 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedArticles.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-7 py-12 text-center text-sm text-gray-400">
                        No items added yet.
                      </td>
                    </tr>
                  ) : calculatedArticles.map((article, index) => (
                    <tr key={article._key} className="group border-b border-gray-200 hover:bg-emerald-50/30">
                      <td className="px-2 py-3 text-center text-xs text-gray-400">{index + 1}</td>
                      <td className="px-2 py-3 text-sm font-semibold text-gray-800">{article.description || "-"}</td>
                      <td className="px-2 py-3 text-sm text-gray-600">{article.size || "-"}</td>
                      <td className="px-2 py-3 text-sm tabular-nums text-gray-600">{article.unit || 0}</td>
                      <td className="px-2 py-3 text-sm tabular-nums text-gray-600">{article.quantity_pkt || 0}</td>
                      <td className="px-2 py-3 text-sm tabular-nums text-gray-600">{article.rate.toFixed(2)}</td>
                      <td className="px-2 py-3 text-sm tabular-nums text-gray-600">{Number(article.sale_rate || 0).toFixed(2)}</td>
                      <td className="px-2 py-3 text-sm text-gray-600">{article.discount || "-"}</td>
                      <td className="px-2 py-3 text-sm font-semibold tabular-nums text-emerald-700">{article.amount.toFixed(2)}</td>
                      <td className="px-2 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setItemModal({ isOpen: true, article })} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-800" aria-label="Edit item">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => removeArticle(article._key)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label="Delete item">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-gray-300 bg-gray-50 font-semibold"><td colSpan={8} className="px-4 py-3 text-right text-sm text-gray-600">Total</td><td className="px-3 py-3 text-right text-sm tabular-nums text-emerald-700">{totalAmount.toFixed(2)}</td><td /></tr></tfoot>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700"><Printer size={16}/></div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Select labels to print</p>
                  <p className="text-xs text-gray-500">{selectedLabelCount} selected of {availableLabelCount} available packet labels</p>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" outline variant="secondary" onClick={() => setLabelQuantities({})}>Clear</Button>
              <Button size="sm" outline onClick={selectAllLabels}>Select All</Button>
            </div>
          </div>

          <Input value={labelSearch} onChange={(event) => setLabelSearch(event.target.value)} placeholder="Search article no, name, or supplier" required={false} />

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="hidden grid-cols-[minmax(0,1fr)_120px_170px] gap-4 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 sm:grid">
              <span>Article</span><span>Available</span><span className="text-right">Labels to print</span>
            </div>
            <div className="max-h-[48dvh] divide-y divide-gray-100 overflow-y-auto">
              {visibleLabelArticles.map((article) => {
                const quantity = Number(labelQuantities[article.article_no] || 0);
                const selected = quantity > 0;
                return (
                  <div key={article.article_no} className={`grid gap-3 px-4 py-3 transition-colors sm:grid-cols-[minmax(0,1fr)_120px_170px] sm:items-center sm:gap-4 ${selected ? "bg-teal-50/60" : "bg-white hover:bg-gray-50"}`}>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${selected ? "bg-teal-600" : "bg-gray-300"}`} />
                        <p className="truncate text-sm font-semibold text-gray-900">{article.description || "Untitled Article"}</p>
                      </div>
                      <p className="ml-4 mt-0.5 truncate text-xs text-gray-500"><span className="font-semibold text-teal-700">{article.article_no}</span> · {article.purchase_number || savedPurchase?.purchase_number} · {article.supplier_name || savedPurchase?.supplier_name || "Supplier"}</p>
                    </div>
                    <div className="flex items-center justify-between sm:block">
                      <span className="text-xs font-medium text-gray-500 sm:hidden">Available</span>
                      <span className="text-sm font-semibold text-gray-700">{maxStickerPackets(article)} packets</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="text-xs font-medium text-gray-500 sm:hidden">Labels</span>
                      <div className="inline-flex h-9 items-center overflow-hidden rounded-lg border border-gray-300 bg-white">
                        <button type="button" onClick={() => setArticleLabelQuantity(article, quantity - 1)} disabled={quantity <= 0} className="flex h-full w-9 items-center justify-center text-lg text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300" aria-label={`Decrease labels for ${article.article_no}`}>−</button>
                        <input type="number" min="0" max={maxStickerPackets(article)} value={quantity} onChange={(event) => setArticleLabelQuantity(article, event.target.value)} className="h-full w-12 border-x border-gray-200 bg-white text-center text-sm font-semibold text-gray-900 outline-none focus:bg-teal-50" aria-label={`Sticker quantity for ${article.article_no}`} />
                        <button type="button" onClick={() => setArticleLabelQuantity(article, quantity + 1)} disabled={quantity >= maxStickerPackets(article)} className="flex h-full w-9 items-center justify-center text-lg text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-gray-300" aria-label={`Increase labels for ${article.article_no}`}>+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {visibleLabelArticles.length === 0 && <div className="px-4 py-10 text-center"><p className="text-sm font-medium text-gray-600">No matching article found</p><p className="mt-1 text-xs text-gray-400">Try another article number, name, or supplier.</p></div>}
            </div>
          </div>
          {selectedLabelCount === 0 && <p className="text-xs text-amber-700">Select at least one packet label to print or download.</p>}
        </div>
      )}
      <PurchaseItemModal
        isOpen={itemModal.isOpen}
        article={itemModal.article}
        onClose={() => setItemModal({ isOpen: false, article: null })}
        onSubmit={upsertArticle}
      />
    </Modal>
  );
}
