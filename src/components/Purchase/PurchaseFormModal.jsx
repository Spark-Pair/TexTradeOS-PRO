import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  Edit3,
  Plus,
  Printer,
  Save,
  Trash2,
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import Modal from "../Modal";
import Button from "../Button";
import Input from "../Input";
import Select from "../Select";
import { SectionHeader } from "../SectionHeader";
import { fetchInventory } from "../../api/commerce";
import { signArticleQr } from "../../api/qr.api";
import useAuth from "../../hooks/useAuth";

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
  article_no: "",
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
  const totalPcs = Math.max(0, numberValue(row.quantity_pcs));
  const quantityDzn = totalPcs / 12;
  const quantityPkt = unit > 0 ? totalPcs / unit : 0;
  const rate = numberValue(row.rate);
  const gross = totalPcs * rate;
  const discountRaw = String(row.discount || "").trim();
  const discountAmount = discountRaw.endsWith("%")
    ? (gross *
        Math.min(100, Math.max(0, numberValue(discountRaw.slice(0, -1))))) /
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
  const update = (field, value) =>
    setItem((prev) => ({ ...prev, [field]: value }));
  const updateQuantity = (field, value) => {
    const numericValue = numberValue(value);
    setItem((prev) => {
      const unit = numberValue(prev.unit);
      if (field === "unit")
        return {
          ...prev,
          quantity_pkt:
            numericValue > 0
              ? numberValue(prev.quantity_pcs) / numericValue
              : 0,
        };
      if (field === "quantity_dzn") {
        const pcs = numericValue * 12;
        return {
          ...prev,
          quantity_pcs: pcs,
          quantity_pkt: unit > 0 ? pcs / unit : 0,
        };
      }
      if (field === "quantity_pcs")
        return {
          ...prev,
          quantity_dzn: numericValue > 0 ? numericValue / 12 : 0,
          quantity_pkt: unit > 0 ? numericValue / unit : 0,
        };
      if (field === "quantity_pkt") {
        const pcs = numericValue * unit;
        return {
          ...prev,
          quantity_dzn: pcs > 0 ? pcs / 12 : 0,
          quantity_pcs: pcs,
        };
      }
      return prev;
    });
  };
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!String(item.description || "").trim())
      return setError("Description is required.");
    if (numberValue(item.quantity_pkt) <= 0)
      return setError("Packet quantity is required.");
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
            <Button outline variant="secondary" onClick={onClose}>
              Discard
            </Button>
            <Button icon={Save} onClick={handleSubmit}>
              {article ? "Save Item" : "Add Item"}
            </Button>
          </div>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3.5 p-0.5 md:grid-cols-3"
      >
        <Input
          label="Article No (Optional)"
          value={item.article_no}
          onChange={(e) => update("article_no", e.target.value)}
          placeholder="e.g. ART-1001"
          required={false}
        />
        <Input
          label="Description"
          value={item.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Article description"
          className="md:col-span-2"
          capitalize
        />
        <Input
          label="Size"
          value={item.size}
          onChange={(e) => update("size", e.target.value)}
          placeholder="Size"
          capitalize
        />
        <Input
          label="Season"
          value={item.season}
          onChange={(e) => update("season", e.target.value)}
          placeholder="Season"
          capitalize
        />
        <Input
          label="Category"
          value={item.category}
          onChange={(e) => update("category", e.target.value)}
          placeholder="Category"
          capitalize
        />
        <Input
          label="Unit"
          type="number"
          min="0"
          value={item.unit}
          onChange={(e) => {
            update("unit", e.target.value);
            updateQuantity("unit", e.target.value);
          }}
          placeholder="Pieces per packet"
        />
        <Input
          label="Quantity - Dzn"
          type="number"
          min="0"
          value={item.quantity_dzn}
          onChange={(e) => {
            update("quantity_dzn", e.target.value);
            updateQuantity("quantity_dzn", e.target.value);
          }}
          placeholder="0"
        />
        <Input
          label="Quantity - Pcs"
          type="number"
          min="0"
          value={item.quantity_pcs}
          onChange={(e) => {
            update("quantity_pcs", e.target.value);
            updateQuantity("quantity_pcs", e.target.value);
          }}
          placeholder="0"
        />
        <Input
          label="Quantity - Pkt"
          type="number"
          min="0"
          value={item.quantity_pkt}
          onChange={(e) => {
            update("quantity_pkt", e.target.value);
            updateQuantity("quantity_pkt", e.target.value);
          }}
          placeholder="0"
        />
        <Input
          label="Purchase Rate"
          type="number"
          min="0"
          value={item.rate}
          onChange={(e) => update("rate", e.target.value)}
          placeholder="0.00"
        />
        <Input
          label="Sale Rate"
          type="number"
          min="0"
          value={item.sale_rate}
          onChange={(e) => update("sale_rate", e.target.value)}
          placeholder="0.00"
        />
        <Input
          label="Discount"
          value={item.discount}
          onChange={(e) => update("discount", e.target.value)}
          placeholder="10% or 50"
          required={false}
        />
        <Input
          label="Amount"
          value={calculateArticle(item).amount.toFixed(2)}
          disabled
        />
        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Modal>
  );
}

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const maxStickerPackets = (article) =>
  Math.max(
    0,
    Math.floor(
      numberValue(article.available_packets ?? article.stock_pkt ?? 0),
    ),
  );
const selectedStickerArticles = (purchase, selections = {}) =>
  (purchase?.articles || []).flatMap((article) =>
    Array.from(
      {
        length: Math.min(
          maxStickerPackets(article),
          Math.max(
            0,
            Math.floor(
              numberValue(selections[article.qr_id || article.article_no]),
            ),
          ),
        ),
      },
      () => article,
    ),
  );
const stickerPayload = (purchase, article) =>
  signArticleQr({
    articleNo: article.article_no,
    qrId: article.qr_id || article.article_no,
    purchaseNumber: article.purchase_number || purchase.purchase_number,
  });
const stickerKey = (article) =>
  article.qr_id || article.article_no || article._key || "article";
const buildQrHtml = async (purchase, selections = {}) => {
  const articles = selectedStickerArticles(purchase, selections);
  const codeByArticle = new Map();
  for (const article of articles)
    if (!codeByArticle.has(stickerKey(article)))
      codeByArticle.set(
        stickerKey(article),
        await stickerPayload(purchase, article),
      );
  const renderedLabels = await Promise.all(
    articles.map(async (article) => ({
      article,
      qr: codeByArticle.get(stickerKey(article)),
      svg: await QRCode.toString(codeByArticle.get(stickerKey(article)), {
        type: "svg",
        errorCorrectionLevel: "M",
        margin: 0,
        color: { dark: "#000000", light: "#ffffff" },
      }),
    })),
  );
  const businessName = purchase.business_name || "TexTradeOS Pro";
  return `<!doctype html><html><head><meta charset="utf-8"><title>Article QR Labels</title><style>
@page{size:76.2mm 50.8mm;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;width:76.2mm;background:#fff;font-family:Arial,sans-serif;color:#000}
.label{position:relative;flex:none;width:76.2mm;height:50.8mm;min-width:76.2mm;min-height:50.8mm;max-width:76.2mm;max-height:50.8mm;break-after:page;page-break-after:always;break-inside:avoid;overflow:hidden;border:0;border-radius:2.5mm;background:#fff;display:grid;grid-template-columns:1fr 32mm;padding:.8mm}
.label:before{content:"";position:absolute;inset:.8mm;border:.3mm solid #000;border-radius:2.2mm;pointer-events:none;z-index:2}
.label:last-child{break-after:auto;page-break-after:auto}
.info{position:relative;padding:3.2mm 3.5mm 9mm;min-width:0}
.brand{max-width:100%;overflow:hidden;color:#000;font-size:9px;line-height:1.2;font-weight:700;white-space:nowrap;text-overflow:ellipsis}
.article{margin-top:1.5mm;font-size:15px;line-height:1.1;font-weight:800;letter-spacing:.1px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.desc{height:9mm;margin-top:.7mm;overflow:hidden;font-size:12px;line-height:1.1;font-weight:600}
.details{margin-top:2mm;display:grid;grid-template-columns:1fr 1fr;column-gap:2mm;row-gap:1.4mm;color:#000}
.detail{display:flex;min-width:0;flex-direction:column;gap:.6mm}
.detail-label{font-size:7px;line-height:1.1;font-weight:700;letter-spacing:.35px;text-transform:uppercase}
.detail-value{overflow:hidden;font-size:10px;line-height:1.15;font-weight:700;white-space:nowrap;text-overflow:ellipsis}
.detail.sale-price .detail-label{font-size:8px;letter-spacing:.2px}
.detail.sale-price .detail-value{font-size:11.5px;line-height:1.05;font-weight:800}
.purchase{position:absolute;left:3.5mm;right:3.5mm;bottom:2mm;height:7mm;overflow:hidden;border-top:.2mm solid #000;padding-top:1mm;color:#000}
.purchase-number,.purchase-supplier{display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.purchase-number{font-size:8px;line-height:1.2;font-weight:700}
.purchase-supplier{margin-top:.5mm;font-size:7px;line-height:1.2;font-weight:400}
.qr{position:relative;border-left:.3mm solid #000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5mm;padding:2mm 2mm 7mm;background:#fff;min-width:0}
.qr svg{width:24mm;height:24mm;display:block}
.scan{color:#000;font-size:7px;letter-spacing:.5px;font-weight:800}
.footer{position:absolute;right:.5mm;bottom:2mm;left:.5mm;text-align:center;color:#000;font-size:7.2px;line-height:1.2;font-weight:700;white-space:nowrap}
@media screen{body{background:#e5e7eb}.label{margin:10px auto;box-shadow:0 1px 5px #0002}}
@media print{html,body{width:76.2mm;height:auto;margin:0!important;padding:0!important;background:#fff}.label{width:76.2mm!important;height:50.8mm!important;min-width:76.2mm!important;min-height:50.8mm!important;max-width:76.2mm!important;max-height:50.8mm!important;margin:0!important;box-shadow:none;break-after:page;page-break-after:always}.label:last-child{break-after:auto;page-break-after:auto}}
</style></head><body>${renderedLabels.map(({ article, svg }) => `<section class="label"><div class="info"><div class="brand">${escapeHtml(businessName)}</div><div class="article">${escapeHtml(article.article_no)}</div><div class="desc">${escapeHtml(article.description || "Untitled Article")}</div><div class="details"><div class="detail"><span class="detail-label">Size</span><span class="detail-value">${escapeHtml(article.size || "-")}</span></div><div class="detail"><span class="detail-label">Category</span><span class="detail-value">${escapeHtml(article.category || "-")}</span></div><div class="detail"><span class="detail-label">Unit</span><span class="detail-value">${escapeHtml(article.unit || 0)} pcs</span></div><div class="detail sale-price"><span class="detail-label">Sale Price</span><span class="detail-value">Rs ${escapeHtml(Number(article.sale_rate || article.rate || 0).toFixed(2))}</span></div></div><div class="purchase"><span class="purchase-number">${escapeHtml(article.purchase_number || purchase.purchase_number)}</span><span class="purchase-supplier">${escapeHtml(article.supplier_name || purchase.supplier_name || "")}</span></div></div><div class="qr">${svg}<div class="scan">SCAN ARTICLE</div><div class="footer">TexTradeOS PRO by SparkPair</div></div></section>`).join("")}</body></html>`;
};
const printPurchaseStickers = async (purchase, selections = {}) => {
  const html = await buildQrHtml(purchase, selections);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");
  frame.title = "Zebra sticker print";
  frame.style.cssText =
    "position:fixed;width:0;height:0;right:0;bottom:0;border:0;visibility:hidden";
  frame.onload = async () => {
    const printWindow = frame.contentWindow;
    if (!printWindow) return;
    const images = Array.from(frame.contentDocument.images);
    await Promise.all(
      images.map((image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
            }),
      ),
    );
    printWindow.focus();
    printWindow.print();
  };
  document.body.appendChild(frame);
  frame.src = url;
  const cleanup = () => {
    frame.remove();
    URL.revokeObjectURL(url);
  };
  frame.contentWindow?.addEventListener("afterprint", cleanup, { once: true });
  window.setTimeout(cleanup, 120000);
};
const downloadStickerPdf = async (purchase, selections = {}) => {
  const articles = selectedStickerArticles(purchase, selections);
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [76.2, 50.8],
  });
  const codeByArticle = new Map();
  const businessName = purchase.business_name || "TexTradeOS Pro";
  for (let index = 0; index < articles.length; index += 1) {
    if (index > 0) pdf.addPage([76.2, 50.8], "landscape");
    const article = articles[index];
    if (!codeByArticle.has(stickerKey(article)))
      codeByArticle.set(
        stickerKey(article),
        await stickerPayload(purchase, article),
      );
    const secureCode = codeByArticle.get(stickerKey(article));
    const qr = await QRCode.toDataURL(secureCode, {
      width: 500,
      margin: 0,
      errorCorrectionLevel: "M",
    });
    pdf.setDrawColor(0);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(0.8, 0.8, 74.6, 49.2, 2, 2, "S");
    pdf.line(44.2, 0.8, 44.2, 50);
    pdf.setTextColor(0);
    const fitText = (value, maxWidth) => {
      let text = String(value ?? "");
      if (pdf.getTextWidth(text) <= maxWidth) return text;
      while (text && pdf.getTextWidth(`${text}…`) > maxWidth)
        text = text.slice(0, -1);
      return text ? `${text}…` : "";
    };
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(fitText(businessName, 36), 3.5, 6.5);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.text(fitText(article.article_no, 36), 3.5, 13);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    const descriptionLines = pdf
      .splitTextToSize(String(article.description || "Untitled Article"), 36)
      .slice(0, 2);
    pdf.text(descriptionLines, 3.5, 17.2);
    const detail = (label, value, x, y, maxWidth = 16, emphasized = false) => {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(emphasized ? 8 : 7);
      pdf.text(label.toUpperCase(), x, y);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(emphasized ? 11 : 9.5);
      pdf.text(fitText(value, maxWidth), x, y + 3.3);
    };
    detail("Size", article.size || "-", 3.5, 27);
    detail("Category", article.category || "-", 22, 27);
    detail("Unit", `${article.unit || 0} pcs`, 3.5, 36);
    detail(
      "Sale Price",
      `Rs ${Number(article.sale_rate || article.rate || 0).toFixed(2)}`,
      22,
      36,
      18.5,
      true,
    );
    pdf.setLineWidth(0.2);
    pdf.line(3.5, 43.5, 40.7, 43.5);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(
      fitText(article.purchase_number || purchase.purchase_number || "", 36),
      3.5,
      45.8,
      { maxWidth: 36 },
    );
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.text(
      fitText(article.supplier_name || purchase.supplier_name || "", 36),
      3.5,
      48.5,
    );
    pdf.addImage(qr, "PNG", 48.5, 10, 24, 24);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text("SCAN ARTICLE", 60.5, 37, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.2);
    pdf.text("TexTradeOS PRO by SparkPair", 60.2, 48, { align: "center" });
  }
  pdf.save("article-qr-stickers.pdf");
};

export default function PurchaseFormModal({
  isOpen,
  onClose,
  onSubmit,
  purchase = null,
  suppliers = [],
  initialStep = "entry",
  allowBack = true,
  labelArticlesOverride = null,
}) {
  const { user } = useAuth();
  const [step, setStep] = useState("entry");
  const [entryStage, setEntryStage] = useState(1);
  const [formData, setFormData] = useState({
    supplier_id: "",
    purchase_date: todayInput(),
    articles: [],
  });
  const [savedPurchase, setSavedPurchase] = useState(null);
  const [itemModal, setItemModal] = useState({ isOpen: false, article: null });
  const [labelQuantities, setLabelQuantities] = useState({});
  const [error, setError] = useState("");
  const [stickerBusy, setStickerBusy] = useState(false);
  const [labelSearch, setLabelSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [inventoryRows, setInventoryRows] = useState([]);
  useEffect(() => {
    if (!isOpen) return;
    setStep(initialStep);
    setEntryStage(1);
    setError("");
    setSavedPurchase(initialStep === "labels" ? purchase : null);
    setLabelQuantities({});
    setLabelSearch("");
    setFormData(
      purchase
        ? {
            supplier_id: purchase.supplier_id,
            purchase_date: purchase.purchase_date,
            articles: purchase.articles.map((article) => ({
              ...article,
              _key: article._key || uuidv4(),
            })),
          }
        : { supplier_id: "", purchase_date: todayInput(), articles: [] },
    );
  }, [initialStep, isOpen, purchase]);
  useEffect(() => {
    if (!isOpen || step !== "labels" || labelArticlesOverride) return;
    setError("");
    fetchInventory()
      .then((rows) => setInventoryRows(Array.isArray(rows) ? rows : []))
      .catch((loadError) => {
        setInventoryRows([]);
        setError(
          loadError?.response?.data?.message ||
            "Could not load current stock from the server.",
        );
      });
  }, [isOpen, step, savedPurchase, labelArticlesOverride]);
  const supplierOptions = suppliers
    .filter(
      (supplier) => supplier.isActive || supplier._id === formData.supplier_id,
    )
    .map((supplier) => ({
      label: supplier.supplier_name,
      value: supplier._id,
    }));
  const calculatedArticles = useMemo(
    () => formData.articles.map(calculateArticle),
    [formData.articles],
  );
  const totalAmount = calculatedArticles.reduce(
    (sum, article) => sum + article.amount,
    0,
  );
  const upsertArticle = (article) => {
    setFormData((prev) => ({
      ...prev,
      articles: prev.articles.some((row) => row._key === article._key)
        ? prev.articles.map((row) =>
            row._key === article._key ? article : row,
          )
        : [...prev.articles, article],
    }));
    setItemModal({ isOpen: false, article: null });
  };
  const removeArticle = (key) =>
    setFormData((prev) => ({
      ...prev,
      articles: prev.articles.filter((article) => article._key !== key),
    }));
  const handleSave = async () => {
    const supplier = suppliers.find(
      (item) => item._id === formData.supplier_id,
    );
    if (!supplier) return setError("Select a supplier first.");
    const validArticles = calculatedArticles.filter(
      (article) =>
        article.description ||
        article.size ||
        article.quantity_pkt ||
        article.total_pcs ||
        article.rate,
    );
    if (!validArticles.length) return setError("Enter at least one article.");
    setIsSaving(true);
    setError("");
    try {
      const saved = await onSubmit({
        ...(purchase || {}),
        ...formData,
        supplier_name: supplier.supplier_name,
        articles: validArticles.map(({ _key, ...article }) => article),
      });
      setSavedPurchase(saved);
      onClose();
    } catch (saveError) {
      setError(
        saveError?.response?.data?.message ||
          saveError?.message ||
          "Could not save purchase.",
      );
    } finally {
      setIsSaving(false);
    }
  };
  const labelArticles = useMemo(() => {
    if (Array.isArray(labelArticlesOverride)) {
      return labelArticlesOverride
        .filter((row) => maxStickerPackets(row) > 0)
        .map((row) => ({ ...row, available_packets: maxStickerPackets(row) }));
    }
    const purchaseNumber = savedPurchase?.purchase_number;
    if (!purchaseNumber) return [];
    return inventoryRows
      .filter(
        (row) =>
          row.purchase_number === purchaseNumber &&
          numberValue(row.available_packets) > 0,
      )
      .map((row) => ({
        ...row,
        available_packets: Math.floor(numberValue(row.available_packets)),
      }));
  }, [inventoryRows, labelArticlesOverride, savedPurchase]);
  const selectedLabelCount = labelArticles.reduce(
    (sum, article) =>
      sum +
      Math.min(
        maxStickerPackets(article),
        numberValue(labelQuantities[stickerKey(article)]),
      ),
    0,
  );
  const availableLabelCount = labelArticles.reduce(
    (sum, article) => sum + maxStickerPackets(article),
    0,
  );
  const visibleLabelArticles = labelArticles.filter((article) => {
    const query = labelSearch.trim().toLowerCase();
    return (
      !query ||
      String(article.article_no || "")
        .toLowerCase()
        .includes(query) ||
      String(article.description || "")
        .toLowerCase()
        .includes(query) ||
      String(article.supplier_name || "")
        .toLowerCase()
        .includes(query)
    );
  });
  const setArticleLabelQuantity = (article, value) =>
    setLabelQuantities((prev) => ({
      ...prev,
      [stickerKey(article)]: Math.min(
        maxStickerPackets(article),
        Math.max(0, Math.floor(numberValue(value))),
      ),
    }));
  const selectAllLabels = () =>
    setLabelQuantities(
      Object.fromEntries(
        labelArticles.map((article) => [
          stickerKey(article),
          maxStickerPackets(article),
        ]),
      ),
    );
  const runStickerAction = async (action) => {
    setStickerBusy(true);
    setError("");
    try {
      await action(
        {
          ...savedPurchase,
          business_name: user?.business?.name || "TexTradeOS Pro",
          articles: labelArticles,
        },
        labelQuantities,
      );
    } catch (actionError) {
      setError(
        actionError?.response?.data?.message ||
          "Secure stickers could not be prepared. Check that the backend is running, then try again.",
      );
    } finally {
      setStickerBusy(false);
    }
  };
  const continueToItems = () => {
    if (!suppliers.some((item) => item._id === formData.supplier_id))
      return setError("Select a supplier to continue.");
    setError("");
    setEntryStage(2);
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? undefined : onClose}
      title={
        step === "entry"
          ? purchase
            ? "Edit Purchase"
            : "Add Purchase"
          : "Print QR Labels"
      }
      subtitle={
        step === "entry"
          ? "Complete supplier details, then add purchased items"
          : "Choose articles and packet quantities"
      }
      maxWidth={step === "labels" ? "max-w-4xl" : "max-w-5xl"}
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-h-4 text-xs font-medium text-red-600">{error}</p>
          <div className="flex w-full gap-2 sm:w-auto sm:gap-3">
            {step === "labels" && allowBack && (
              <Button
                variant="secondary"
                outline
                icon={ArrowLeft}
                onClick={() => setStep("entry")}
              >
                Back
              </Button>
            )}
            {step === "entry" ? (
              entryStage === 1 ? (
                <Button
                  className="flex-1 sm:flex-none"
                  onClick={continueToItems}
                >
                  Continue to Items
                </Button>
              ) : (
                <>
                  <Button
                    className="flex-1 sm:flex-none"
                    variant="secondary"
                    outline
                    icon={ArrowLeft}
                    disabled={isSaving}
                    onClick={() => setEntryStage(1)}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1 sm:flex-none"
                    icon={Save}
                    loading={isSaving}
                    disabled={isSaving}
                    onClick={handleSave}
                  >
                    Save Purchase
                  </Button>
                </>
              )
            ) : (
              <>
                <Button
                  className="flex-1 sm:flex-none"
                  outline
                  icon={Download}
                  disabled={selectedLabelCount === 0 || stickerBusy}
                  onClick={() => runStickerAction(downloadStickerPdf)}
                >
                  Download PDF
                </Button>
                <Button
                  className="flex-1 sm:flex-none"
                  icon={Printer}
                  disabled={selectedLabelCount === 0 || stickerBusy}
                  onClick={() => runStickerAction(printPurchaseStickers)}
                >
                  {stickerBusy
                    ? "Preparing..."
                    : `Print Stickers (${selectedLabelCount})`}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      {step === "entry" ? (
        <div className="grid gap-5 p-0.5">
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 text-center text-xs font-semibold">
            <button
              type="button"
              onClick={() => setEntryStage(1)}
              className={`border-r border-gray-200 px-3 py-2.5 ${entryStage === 1 ? "bg-teal-50 text-teal-700" : "bg-white text-gray-700"}`}
            >
              1 · Supplier
            </button>
            <button
              type="button"
              disabled={entryStage < 2}
              onClick={() => setEntryStage(2)}
              className={`px-3 py-2.5 ${entryStage === 2 ? "bg-teal-50 text-teal-700" : "text-gray-400"}`}
            >
              2 · Items
            </button>
          </div>
          <section className={entryStage === 1 ? "block" : "hidden"}>
            <SectionHeader
              step="1"
              title="Purchase Details"
              subtitle="Select the supplier and purchase date"
            />
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <Select
                label="Supplier"
                value={formData.supplier_id}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, supplier_id: value }))
                }
                options={supplierOptions}
                placeholder="Select supplier"
              />
              <Input
                label="Date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    purchase_date: e.target.value,
                  }))
                }
              />
            </div>
          </section>
          <section className={entryStage === 2 ? "block" : "hidden"}>
            <SectionHeader
              step="2"
              title="Purchase Items"
              subtitle="Article No is optional; the same number can be used for different sizes, quantities, and rates"
              right={
                <Button
                  size="sm"
                  outline
                  icon={Plus}
                  onClick={() => setItemModal({ isOpen: true, article: null })}
                >
                  Add Item
                </Button>
              }
            />
            <div className="grid gap-2">
              {calculatedArticles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-gray-700">
                    No items added
                  </p>
                  <Button
                    className="mt-4"
                    size="sm"
                    icon={Plus}
                    onClick={() =>
                      setItemModal({ isOpen: true, article: null })
                    }
                  >
                    Add First Item
                  </Button>
                </div>
              ) : (
                calculatedArticles.map((article) => (
                  <div
                    key={article._key}
                    className="rounded-xl border border-gray-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {article.description}
                        </p>
                        <p className="text-xs text-gray-500">
                          {article.size || "No size"} ·{" "}
                          {article.category || "No category"} ·{" "}
                          {article.quantity_pkt || 0} packets · Rs{" "}
                          {article.amount.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setItemModal({ isOpen: true, article })
                          }
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeArticle(article._key)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              {calculatedArticles.length > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3 text-sm text-white">
                  <span>Purchase total</span>
                  <strong>{totalAmount.toFixed(2)}</strong>
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                Select labels to print
              </p>
              <p className="text-xs text-gray-500">
                {selectedLabelCount} selected of {availableLabelCount}{" "}
                current-stock packet labels
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                outline
                variant="secondary"
                onClick={() => setLabelQuantities({})}
              >
                Clear
              </Button>
              <Button size="sm" outline onClick={selectAllLabels}>
                Select All
              </Button>
            </div>
          </div>
          <Input
            value={labelSearch}
            onChange={(event) => setLabelSearch(event.target.value)}
            placeholder="Search article no, name, or supplier"
            required={false}
          />
          <div className="max-h-[48dvh] divide-y divide-gray-100 overflow-y-auto rounded-xl border border-gray-200 bg-white">
            {visibleLabelArticles.map((article) => {
              const quantity = Number(
                labelQuantities[stickerKey(article)] || 0,
              );
              return (
                <div
                  key={stickerKey(article)}
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_120px_170px] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {article.description || "Untitled Article"}
                    </p>
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold text-teal-700">
                        {article.article_no}
                      </span>{" "}
                      · {article.purchase_number}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {maxStickerPackets(article)} packets
                  </span>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setArticleLabelQuantity(article, quantity - 1)
                      }
                      disabled={quantity <= 0}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="0"
                      max={maxStickerPackets(article)}
                      value={quantity}
                      onChange={(event) =>
                        setArticleLabelQuantity(article, event.target.value)
                      }
                      className="w-14 rounded-lg border border-gray-300 px-2 py-1 text-center"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setArticleLabelQuantity(article, quantity + 1)
                      }
                      disabled={quantity >= maxStickerPackets(article)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
            {visibleLabelArticles.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-gray-500">
                No available stock labels found for this purchase.
              </div>
            )}
          </div>
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
