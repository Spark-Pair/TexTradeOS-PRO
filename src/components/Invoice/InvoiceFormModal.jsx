import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Edit3, Plus, Save, ScanLine, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Html5Qrcode } from "html5-qrcode";
import Modal from "../Modal";
import Button from "../Button";
import Input from "../Input";
import Select from "../Select";
import { SectionHeader } from "../SectionHeader";
import { fetchMyInvoiceCounter } from "../../api/business";
import { useToast } from "../../context/ToastContext";
import { InvoicePrintPreview } from "./InvoicePreviewModal";
import { listCustomers, listPrototypeInvoices, listPurchases } from "../../utils/prototypeStorage";
import { verifyArticleQr } from "../../api/qr.api";

const todayInput = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const numberValue = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const capitalizeWords = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatInvoiceNumber = (year, nextInvoiceNo) =>
  `${year}-${String(Math.max(1, Number(nextInvoiceNo) || 1)).padStart(4, "0")}`;

const purchasedArticles = () => {
  const soldByArticle = new Map();
  listPrototypeInvoices().forEach((invoice) => (invoice.articles || []).forEach((article) => {
    const articleNo = String(article.article_no || "").trim();
    if (articleNo) soldByArticle.set(articleNo, (soldByArticle.get(articleNo) || 0) + numberValue(article.pcs));
  }));

  return listPurchases().flatMap((purchase) =>
    (purchase.articles || []).map((article) => ({
      ...article,
      purchase_id: purchase._id,
      purchase_number: purchase.purchase_number,
      supplier_name: purchase.supplier_name,
      value: article.article_no,
      stock_pcs: Math.max(0, numberValue(article.quantity_pcs || article.total_pcs) - (soldByArticle.get(article.article_no) || 0)),
      label: `${article.article_no} | ${article.description || "Article"} | Stock ${Math.max(0, numberValue(article.quantity_pcs || article.total_pcs) - (soldByArticle.get(article.article_no) || 0))} pcs | Sale ${article.sale_rate || article.rate || 0}`,
    }))
  ).filter((article) => article.stock_pcs > 0);
};

const newInvoiceArticle = (purchaseArticle) => ({
  _key: uuidv4(),
  article_no: purchaseArticle.article_no,
  purchase_number: purchaseArticle.purchase_number,
  description: purchaseArticle.description || "",
  size: purchaseArticle.size || "",
  unit: numberValue(purchaseArticle.unit),
  quantity_pkt: "",
  dzn: "",
  pcs: "",
  purchase_rate: numberValue(purchaseArticle.rate),
  rate: numberValue(purchaseArticle.sale_rate || purchaseArticle.rate),
  discount: purchaseArticle.discount || "",
});

const syncQuantity = (row, field, value) => {
  const unit = Math.max(0, numberValue(field === "unit" ? value : row.unit));
  const next = { ...row, [field]: value };

  if (field === "quantity_pkt") {
    const pcs = numberValue(value) * unit;
    next.pcs = pcs ? String(pcs) : "";
    next.dzn = pcs ? String(pcs / 12) : "";
  }

  if (field === "dzn") {
    const pcs = numberValue(value) * 12;
    next.pcs = pcs ? String(pcs) : "";
    next.quantity_pkt = unit ? String(pcs / unit) : "";
  }

  if (field === "pcs") {
    const pcs = numberValue(value);
    next.dzn = pcs ? String(pcs / 12) : "";
    next.quantity_pkt = unit ? String(pcs / unit) : "";
  }

  return next;
};

const discountDetails = (discount, pcs, rate) => {
  const raw = String(discount || "").trim();
  if (!raw) return { amount: 0, type: "" };
  const pieces = Math.max(0, numberValue(pcs));
  const unitRate = Math.max(0, numberValue(rate));
  if (!pieces || !unitRate) return { amount: 0, type: raw.endsWith("%") ? "percent" : "rupee" };

  if (raw.endsWith("%")) {
    const percentage = Math.min(100, Math.max(0, numberValue(raw.slice(0, -1))));
    return { amount: pieces * (unitRate * percentage / 100), type: "percent" };
  }

  const perPieceDiscount = Math.min(unitRate, Math.max(0, numberValue(raw)));
  return { amount: pieces * perPieceDiscount, type: "rupee" };
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
    quantity_pkt: numberValue(row.quantity_pkt),
    rate,
    gross_amount: gross,
    discount_type: discount.type,
    discount_amount: discountAmount,
    amount: Math.max(0, gross - discountAmount),
  };
};

const calculateInvoiceTotals = (rows, salesReturnAmount = 0, receivedAmount = 0) => {
  const grossAmount = rows.reduce((sum, row) => sum + Number(row.gross_amount || 0), 0);
  const percentDiscountAmount = rows.reduce((sum, row) => sum + (row.discount_type === "percent" ? Number(row.discount_amount || 0) : 0), 0);
  const rupeeDiscountAmount = rows.reduce((sum, row) => sum + (row.discount_type === "rupee" ? Number(row.discount_amount || 0) : 0), 0);
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

function InvoiceItemModal({ isOpen, onClose, onSubmit, article = null, inventory = [] }) {
  const [selectedArticleNo, setSelectedArticleNo] = useState("");
  const [row, setRow] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    if (article) {
      setSelectedArticleNo(article.article_no);
      setRow(article);
      return;
    }
    setSelectedArticleNo("");
    setRow(null);
  }, [article, inventory, isOpen]);

  const selectedArticle = inventory.find((item) => item.article_no === selectedArticleNo);

  const chooseArticle = (articleNo) => {
    const match = inventory.find((item) => item.article_no === articleNo);
    setSelectedArticleNo(articleNo);
    setRow(match ? newInvoiceArticle(match) : null);
  };

  const update = (field, value) => {
    setRow((prev) => {
      if (!prev) return prev;
      if (["quantity_pkt", "dzn", "pcs"].includes(field)) {
        const next = syncQuantity(prev, field, value);
        const availablePcs = numberValue(selectedArticle?.stock_pcs);
        if (numberValue(next.pcs) > availablePcs) {
          setError(`Only ${availablePcs} pieces are available.`);
          return syncQuantity(prev, "pcs", String(availablePcs));
        }
        setError("");
        return next;
      }
      return { ...prev, [field]: value };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!row?.article_no) {
      setError("Select an article first.");
      return;
    }
    if (numberValue(row.pcs) <= 0) {
      setError("Enter quantity.");
      return;
    }
    if (numberValue(row.pcs) > numberValue(selectedArticle?.stock_pcs)) {
      setError(`Only ${numberValue(selectedArticle?.stock_pcs)} pieces are available.`);
      return;
    }
    onSubmit(calculateArticle(row));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-3xl"
      title={article ? "Edit Invoice Item" : "Add Invoice Item"}
      subtitle="Select the item and enter its sale quantity"
      footer={
        <div className="flex w-full items-center justify-between">
          <p className="min-w-0 flex-1 pr-2 text-xs font-medium text-red-600">{error}</p>
          <div className="flex gap-3">
            <Button outline variant="secondary" onClick={onClose}>Discard</Button>
            <Button icon={Save} onClick={handleSubmit}>{article ? "Save Item" : "Add Item"}</Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3.5 p-0.5 md:grid-cols-3">
        <div className="md:col-span-3">
          <Select label="Search & Select Article" value={selectedArticleNo} onChange={chooseArticle} options={inventory} placeholder="Choose article by number or description" />
          {selectedArticle && (
            <div className="mt-2 grid gap-2 rounded-xl border border-gray-300 bg-gray-50 p-3 text-xs text-gray-600 md:grid-cols-3">
              <p><span className="font-semibold text-gray-800">Article No:</span> {selectedArticle.article_no}</p>
              <p><span className="font-semibold text-gray-800">Available:</span> {selectedArticle.stock_pcs || 0} pcs ({selectedArticle.unit ? (selectedArticle.stock_pcs / selectedArticle.unit).toFixed(2) : 0} pkt)</p>
              <p><span className="font-semibold text-gray-800">Sale Rate:</span> {Number(selectedArticle.sale_rate || selectedArticle.rate || 0).toFixed(2)}</p>
            </div>
          )}
        </div>
        <div className="md:col-span-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">Type quantity in any one box. Packets, dozens and pieces will calculate automatically.</div>
        <Input label="Packets" type="number" min="0" max={selectedArticle?.unit ? selectedArticle.stock_pcs / selectedArticle.unit : 0} value={row?.quantity_pkt || ""} onChange={(e) => update("quantity_pkt", e.target.value)} placeholder="e.g. 2" />
        <Input label="Dozens" type="number" min="0" max={(selectedArticle?.stock_pcs || 0) / 12} value={row?.dzn || ""} onChange={(e) => update("dzn", e.target.value)} placeholder="Auto calculated" />
        <Input label="Pieces" type="number" min="0" max={selectedArticle?.stock_pcs || 0} value={row?.pcs || ""} onChange={(e) => update("pcs", e.target.value)} placeholder="Auto calculated" />
        <Input label="Sale Rate" type="number" min="0" value={row?.rate || ""} onChange={(e) => update("rate", e.target.value)} placeholder="0.00" />
        <Input label="Discount" value={row?.discount || ""} onChange={(e) => update("discount", e.target.value)} placeholder="10% or 50" required={false} />
        <Input label="Amount" value={row ? calculateArticle(row).amount.toFixed(2) : "0.00"} disabled />
        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Modal>
  );
}

let scanAudioContext = null;

const getScanAudioContext = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!scanAudioContext || scanAudioContext.state === "closed") scanAudioContext = new AudioContext();
  return scanAudioContext;
};

const unlockScanAudio = async () => {
  const context = getScanAudioContext();
  if (!context) return false;
  if (context.state === "suspended") await context.resume();
  return context.state === "running";
};

const playScanFeedback = (type) => {
  try {
    const context = getScanAudioContext();
    if (!context || context.state !== "running") {
      navigator.vibrate?.(type === "success" ? 45 : [80, 45, 80]);
      return;
    }
    const tones = type === "success"
      ? [
          { frequency: 1850, start: 0, duration: 0.13 },
          { frequency: 2350, start: 0.105, duration: 0.16 },
        ]
      : [
          { frequency: 420, start: 0, duration: 0.2 },
          { frequency: 320, start: 0.25, duration: 0.24 },
        ];

    tones.forEach(({ frequency, start, duration }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type === "success" ? "square" : "sawtooth";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(type === "success" ? 0.72 : 0.78, context.currentTime + start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + duration);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + start);
      oscillator.stop(context.currentTime + start + duration);
    });

    navigator.vibrate?.(type === "success" ? 45 : [80, 45, 80]);
  } catch {
    // Audio/vibration feedback is optional when a browser blocks it.
  }
};

function InvoiceScanModal({ isOpen, onClose, onApply, inventory = [] }) {
  const scannerRef = useRef(null);
  const scanLockRef = useRef({ value: "", lastSeenAt: 0 });
  const hardwareBufferRef = useRef({ value: "", lastKeyAt: 0 });
  const addScannedArticleRef = useRef(null);
  const scannerId = useMemo(() => `invoice-qr-reader-${uuidv4()}`, []);
  const [rows, setRows] = useState([]);
  const [cameraError, setCameraError] = useState("");
  const [scanError, setScanError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [lastScanned, setLastScanned] = useState(null);
  const [scanningPhoto, setScanningPhoto] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return undefined;
    let stopped = false;
    setRows([]);
    setCameraError("");
    setScanError("");
    setManualCode("");
    setLastScanned(null);
    setScanningPhoto(false);
    setSoundEnabled(scanAudioContext?.state === "running");
    setManualEntryOpen(false);
    scanLockRef.current = { value: "", lastSeenAt: 0 };

    if (!window.isSecureContext) {
      setCameraError("Live camera requires HTTPS. Use Take QR Photo below on this device.");
      return undefined;
    }

    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decodedText) => {
        const now = Date.now();
        if (scanLockRef.current.value === decodedText) {
          scanLockRef.current.lastSeenAt = now;
          return;
        }
        scanLockRef.current = { value: decodedText, lastSeenAt: now };
        addScannedArticleRef.current?.(decodedText);
      },
      () => {
        const lock = scanLockRef.current;
        if (lock.value && Date.now() - lock.lastSeenAt > 1000) {
          scanLockRef.current = { value: "", lastSeenAt: 0 };
        }
      }
    )
      .catch(() => {
        if (!stopped) setCameraError("Camera scanner unavailable. Please allow camera access and reopen this modal.");
      })
      .then(() => {});

    return () => {
      stopped = true;
      const activeScanner = scannerRef.current;
      scannerRef.current = null;
      if (activeScanner?.isScanning) {
        activeScanner.stop().then(() => activeScanner.clear()).catch(() => {});
      } else {
        activeScanner?.clear?.();
      }
    };
  }, [isOpen, scannerId]);

  const addScannedArticle = async (code, { manual = false } = {}) => {
    let articleNo = String(code || "").trim();
    let verifiedQrId = "";
    if (!manual) {
      if (!/^(T1|TTO1)\./.test(articleNo)) {
        setScanError("Rejected: scan a genuine TexTradeOS secure QR sticker.");
        playScanFeedback("error");
        return;
      }
      try {
        const verified = await verifyArticleQr(articleNo);
        articleNo = verified.articleNo;
        verifiedQrId = verified.qrId;
      } catch {
        setScanError("Invalid or altered QR code. Only TexTradeOS stickers are accepted.");
        playScanFeedback("error");
        return;
      }
    }
    const match = inventory.find((item) => item.article_no === articleNo);
    if (!match) {
      setScanError("Article not found or no stock is available.");
      playScanFeedback("error");
      return;
    }
    if (!manual && match.qr_id && verifiedQrId !== match.qr_id) {
      setScanError("This is an older label for this article. Print its latest QR label and scan again.");
      playScanFeedback("error");
      return;
    }
    setScanError("");
    setRows((prev) => {
      const existing = prev.find((row) => row.article_no === articleNo);
      const nextPcs = numberValue(existing?.pcs) + numberValue(match.unit);
      if (nextPcs > numberValue(match.stock_pcs)) {
        setScanError(`Stock limit reached: only ${numberValue(match.stock_pcs)} pieces are available.`);
        playScanFeedback("error");
        return prev;
      }
      setLastScanned({ article_no: match.article_no, description: match.description || "Article" });
      playScanFeedback("success");
      if (existing) {
        return prev.map((row) =>
          row.article_no === articleNo
            ? calculateArticle(syncQuantity(row, "quantity_pkt", String(numberValue(row.quantity_pkt) + 1)))
            : row
        );
      }
      return [...prev, calculateArticle(syncQuantity(newInvoiceArticle(match), "quantity_pkt", "1"))];
    });
  };
  addScannedArticleRef.current = addScannedArticle;

  useEffect(() => {
    if (!isOpen) return undefined;
    const captureHardwareScanner = (event) => {
      const now = Date.now();
      const buffer = hardwareBufferRef.current;
      if (now - buffer.lastKeyAt > 120) buffer.value = "";
      buffer.lastKeyAt = now;
      if (event.key === "Enter") {
        const scanned = buffer.value.trim();
        buffer.value = "";
        if (scanned.length >= 8) {
          event.preventDefault();
          addScannedArticleRef.current?.(scanned);
        }
        return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) buffer.value += event.key;
    };
    window.addEventListener("keydown", captureHardwareScanner, true);
    return () => window.removeEventListener("keydown", captureHardwareScanner, true);
  }, [isOpen]);

  const updateRow = (key, field, value) => {
    setRows((prev) => prev.map((row) =>
      row._key === key ? (() => {
        const next = syncQuantity(row, field, value);
        const availablePcs = numberValue(inventory.find((item) => item.article_no === row.article_no)?.stock_pcs);
        if (numberValue(next.pcs) > availablePcs) {
          setScanError(`Only ${availablePcs} pieces are available for ${row.article_no}.`);
          return calculateArticle(syncQuantity(row, "pcs", String(availablePcs)));
        }
        setScanError("");
        return calculateArticle(next);
      })() : row
    ));
  };

  const applyRows = () => {
    onApply(rows.filter((row) => numberValue(row.pcs) > 0).map(calculateArticle));
  };

  const submitManualCode = (event) => {
    event.preventDefault();
    if (!manualCode.trim()) return;
    addScannedArticle(manualCode, { manual: true });
    setManualCode("");
  };

  const scanQrPhoto = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setScanningPhoto(true);
    setScanError("");
    let photoScanner = null;
    try {
      try { scannerRef.current?.clear(); } catch { /* camera scanner may not have started */ }
      scannerRef.current = null;
      photoScanner = new Html5Qrcode(scannerId);
      const decodedText = await photoScanner.scanFile(file, true);
      addScannedArticle(decodedText);
    } catch {
      setScanError("QR was not clear in the photo. Move closer, keep it straight, and try again.");
      playScanFeedback("error");
    } finally {
      try { photoScanner?.clear(); } catch { /* scanner may already be clear */ }
      setScanningPhoto(false);
    }
  };

  const totalPackets = rows.reduce((sum, row) => sum + numberValue(row.quantity_pkt), 0);

  const enableSound = async () => {
    try {
      const enabled = await unlockScanAudio();
      setSoundEnabled(enabled);
      if (enabled) playScanFeedback("success");
      else setScanError("Sound is blocked by this browser. Check media volume and browser permissions.");
    } catch {
      setScanError("Sound could not be enabled. Check media volume and browser permissions.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-6xl"
      title="Scan QR Labels"
      subtitle="Each successful scan adds 1 packet; repeat scans increase the same row"
      footer={
        <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0"><p className="text-xs font-medium text-gray-700">{rows.length} articles · {totalPackets} packets ready</p>{scanError && <p role="alert" className="mt-1 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-medium leading-4 text-red-700">{scanError}</p>}</div>
          <div className="flex w-full gap-2 sm:w-auto sm:gap-3">
            <Button outline variant="secondary" onClick={onClose}>Close</Button>
            <Button icon={Plus} onClick={applyRows} disabled={rows.length === 0}>Add {totalPackets} Packets</Button>
          </div>
        </div>
      }
    >
      <div className="grid min-w-0 gap-4 p-0.5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="grid min-w-0 content-start gap-3">
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5"><p className="text-xs font-semibold text-sky-900">POS scanner ready</p><p className="mt-0.5 text-xs text-sky-700">Connect a 2D USB/wireless scanner and scan directly. No field selection is needed.</p></div>
          {!cameraError ? <div className="w-full min-w-0 overflow-hidden rounded-2xl border border-gray-300 bg-gray-950 p-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black sm:aspect-[4/3]">
            <div id={scannerId} className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-cover [&_button]:hidden [&_select]:hidden" />
            <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,0.25)]" />
          </div>
            <div className="mt-2 flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400" /><p className="truncate text-xs text-gray-300">Camera ready — hold one QR inside the box</p></div><button type="button" onClick={enableSound} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${soundEnabled ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white hover:bg-white/20"}`}>{soundEnabled ? "Sound On" : "Enable Sound"}</button></div>
        </div> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div id={scannerId} className="hidden" /><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-amber-900">Photo scan mode</p><p className="mt-1 text-xs leading-5 text-amber-700">Live camera is blocked by the browser on HTTP. Take a clear QR photo or enter the article number.</p></div><button type="button" onClick={enableSound} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${soundEnabled ? "bg-emerald-100 text-emerald-700" : "bg-white text-gray-700 ring-1 ring-gray-200"}`}>{soundEnabled ? "Sound On" : "Sound"}</button></div></div>}
        {lastScanned && !scanError && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5"><p className="text-xs font-semibold text-emerald-700">✓ Scan successful</p><p className="mt-0.5 text-sm font-semibold text-gray-800">{lastScanned.article_no}</p><p className="text-xs text-gray-500">{lastScanned.description}</p></div>}
        <div className="min-w-0 rounded-xl border border-gray-200 bg-gray-50 p-3">
          {cameraError && (
            <label className="mb-3 flex w-full cursor-pointer items-center justify-center rounded-xl bg-[#127475] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0f6465]">
              {scanningPhoto ? "Reading QR…" : "Take QR Photo"}
              <input type="file" accept="image/*" capture="environment" onClick={(event) => event.stopPropagation()} onChange={scanQrPhoto} disabled={scanningPhoto} className="hidden" />
            </label>
          )}
          <button type="button" onClick={() => setManualEntryOpen((open) => !open)} className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-left text-xs font-semibold text-gray-700"><span>Enter article number manually</span><span className="text-base text-gray-400">{manualEntryOpen ? "−" : "+"}</span></button>
          {manualEntryOpen && <form onSubmit={submitManualCode} className="mt-2">
            <label className="text-xs font-semibold text-gray-700">Camera not working? Enter article number</label>
            <div className="mt-2 flex gap-2"><input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="P-2026-0001-A01" className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /><Button type="submit" size="sm" disabled={!manualCode.trim()}>Add</Button></div>
          </form>}
        </div>
        </div>

        <div className="grid min-w-0 gap-2 md:hidden">
          {rows.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 px-4 py-10 text-center"><p className="text-sm font-semibold text-gray-700">Ready to scan</p><p className="mt-1 text-xs text-gray-400">One accepted scan adds one packet.</p></div> : rows.map((row) => <div key={row._key} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{row.description}</p><p className="text-xs font-medium text-teal-700">{row.article_no}</p></div><button type="button" onClick={() => setRows((current) => current.filter((item) => item._key !== row._key))} className="rounded-lg p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3"><div><p className="text-[10px] uppercase tracking-wide text-gray-400">Packet quantity</p><div className="mt-1 flex items-center rounded-xl border border-gray-200 bg-gray-50"><button type="button" onClick={() => updateRow(row._key, "quantity_pkt", String(Math.max(0, numberValue(row.quantity_pkt) - 1)))} className="h-9 w-10 text-lg font-semibold text-gray-600">−</button><strong className="min-w-10 text-center text-sm text-gray-900">{row.quantity_pkt}</strong><button type="button" onClick={() => updateRow(row._key, "quantity_pkt", String(numberValue(row.quantity_pkt) + 1))} className="h-9 w-10 text-lg font-semibold text-teal-700">+</button></div></div><div className="grid grid-cols-2 gap-4 text-right text-xs"><div><span className="text-gray-400">Pieces</span><p className="mt-1 font-semibold text-gray-800">{row.pcs}</p></div><div><span className="text-gray-400">Available</span><p className="mt-1 font-semibold text-emerald-700">{numberValue(inventory.find((item) => item.article_no === row.article_no)?.stock_pcs)}</p></div></div></div></div>)}
        </div>

        <div className="hidden min-w-0 overflow-x-auto rounded-xl border border-gray-300 md:block">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50 text-xs font-semibold text-gray-500">
                <th className="px-3 py-2.5 text-left">Article No</th>
                <th className="px-3 py-2.5 text-left">Description</th>
                <th className="px-3 py-2.5 text-left">Pckt</th>
                <th className="px-3 py-2.5 text-left">Dzn</th>
                <th className="px-3 py-2.5 text-left">Pieces</th>
                <th className="px-3 py-2.5 text-left">Available</th>
                <th className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-7 py-12 text-center"><p className="text-sm font-semibold text-gray-700">Ready to scan</p><p className="mt-1 text-xs text-gray-400">Scanned packets appear here. One scan equals one packet.</p></td></tr>
              ) : rows.map((row) => (
                <tr key={row._key}>
                  <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">{row.article_no}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-600">{row.description}</td>
                  {["quantity_pkt", "dzn", "pcs"].map((field) => (
                    <td key={field} className="px-3 py-2.5">
                      <input type="number" min="0" value={row[field]} onChange={(e) => updateRow(row._key, field, e.target.value)} className="w-full rounded-lg border border-gray-400/85 bg-gray-50 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-xs text-gray-500">{numberValue(inventory.find((item) => item.article_no === row.article_no)?.stock_pcs)} pcs</td>
                  <td className="px-2 py-2.5"><button type="button" onClick={() => setRows((current) => current.filter((item) => item._key !== row._key))} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${row.article_no}`}><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

export default function InvoiceFormModal({ isOpen, onClose, onAction }) {
  const { showToast } = useToast();
  const customerInputRef = useRef(null);
  const urduTitleInputRef = useRef(null);
  const salesmanInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const nextButtonRef = useRef(null);
  const [step, setStep] = useState("entry");
  const [entryStage, setEntryStage] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerUrduTitle, setCustomerUrduTitle] = useState("");
  const [customers, setCustomers] = useState([]);
  const [salesmanName, setSalesmanName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [articles, setArticles] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [itemModal, setItemModal] = useState({ isOpen: false, article: null });
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [salesReturnAmount, setSalesReturnAmount] = useState("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [previousCustomers] = useState([]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setStep("entry");
    setEntryStage(1);
    const activeCustomers = listCustomers().filter((customer) => customer.isActive);
    setCustomers(activeCustomers);
    setCustomerId("");
    setSalesmanName("");
    setArticles([]);
    setInventory(purchasedArticles());
    setSalesReturnAmount("");
    setReceivedAmount("");
    setError("");

    fetchMyInvoiceCounter({ year: new Date().getFullYear() }).then((counterRes) => {
      setInvoiceNumber(formatInvoiceNumber(counterRes?.year || new Date().getFullYear(), counterRes?.next_invoice_no || 1));
    }).catch(() => {
      setInvoiceNumber(formatInvoiceNumber(new Date().getFullYear(), 1));
    });
  }, [isOpen]);

  const calculatedArticles = useMemo(() => articles.map(calculateArticle), [articles]);
  const itemInventory = useMemo(() => inventory.map((item) => {
    const usedPcs = articles.reduce((sum, row) =>
      row.article_no === item.article_no && row._key !== itemModal.article?._key
        ? sum + numberValue(row.pcs)
        : sum, 0);
    const stockPcs = Math.max(0, numberValue(item.stock_pcs) - usedPcs);
    return { ...item, stock_pcs: stockPcs, label: `${item.article_no} | ${item.description || "Article"} | Available ${stockPcs} pcs | Sale ${item.sale_rate || item.rate || 0}` };
  }).filter((item) => item.stock_pcs > 0 || item.article_no === itemModal.article?.article_no), [articles, inventory, itemModal.article?._key, itemModal.article?.article_no]);
  const scanInventory = useMemo(() => inventory.map((item) => {
    const usedPcs = articles.reduce((sum, row) => row.article_no === item.article_no ? sum + numberValue(row.pcs) : sum, 0);
    return { ...item, stock_pcs: Math.max(0, numberValue(item.stock_pcs) - usedPcs) };
  }).filter((item) => item.stock_pcs > 0), [articles, inventory]);
  const invoiceTotals = useMemo(
    () => calculateInvoiceTotals(calculatedArticles, salesReturnAmount, receivedAmount),
    [calculatedArticles, receivedAmount, salesReturnAmount]
  );

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer._id === customerId) || null,
    [customerId, customers]
  );

  const customerOptions = useMemo(
    () => customers.map((customer) => ({
      label: customer.customer_name,
      value: customer._id,
    })),
    [customers]
  );

  const draftInvoice = useMemo(() => ({
    invoice_number: invoiceNumber,
    invoice_date: todayInput(),
    customer_id: selectedCustomer?._id || "",
    customer_name: selectedCustomer?.customer_name || "",
    customer_urdu_title: selectedCustomer?.urdu_title || "",
    salesman_name: salesmanName.trim(),
    customer_phone: selectedCustomer?.phone_number || "",
    customer_address: selectedCustomer?.address || "",
    articles: calculatedArticles,
    ...invoiceTotals,
  }), [calculatedArticles, invoiceNumber, invoiceTotals, salesmanName, selectedCustomer]);

  const chooseCustomer = (name) => setCustomerName(name);

  const focusAndSelect = (element) => {
    if (!element) return;
    element.focus();
    if (typeof element.select === "function") element.select();
  };

  const moveOnEnter = (event, nextFocus) => {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    event.stopPropagation();
    requestAnimationFrame(nextFocus);
  };

  const upsertArticle = (article) => {
    setArticles((rows) => {
      const editedIndex = rows.findIndex((row) => row._key === article._key);
      const duplicateIndex = rows.findIndex((row) =>
        row.article_no === article.article_no && row._key !== article._key
      );

      if (duplicateIndex >= 0) {
        const mergedPcs = numberValue(rows[duplicateIndex].pcs) + numberValue(article.pcs);
        return rows
          .filter((_, index) => index !== editedIndex)
          .map((row) => row._key === rows[duplicateIndex]._key
            ? calculateArticle(syncQuantity(row, "pcs", String(mergedPcs)))
            : row);
      }

      if (editedIndex >= 0) {
        return rows.map((row) => row._key === article._key ? article : row);
      }

      const sameArticleIndex = rows.findIndex((row) => row.article_no === article.article_no);
      if (sameArticleIndex >= 0) {
        const mergedPcs = numberValue(rows[sameArticleIndex].pcs) + numberValue(article.pcs);
        return rows.map((row, index) => index === sameArticleIndex
          ? calculateArticle(syncQuantity(row, "pcs", String(mergedPcs)))
          : row);
      }

      return [...rows, article];
    });
    setItemModal({ isOpen: false, article: null });
  };

  const mergeScannedRows = (rows) => {
    setArticles((current) => {
      const next = [...current];
      rows.forEach((incoming) => {
        const index = next.findIndex((row) => row.article_no === incoming.article_no);
        if (index >= 0) {
          const mergedPcs = numberValue(next[index].pcs) + numberValue(incoming.pcs);
          next[index] = calculateArticle(syncQuantity(next[index], "pcs", String(mergedPcs)));
        } else {
          next.push(incoming);
        }
      });
      return next;
    });
    setScanModalOpen(false);
  };

  const removeRow = (key) => setArticles((rows) => rows.filter((row) => row._key !== key));

  const advanceEntryStage = () => {
    if (entryStage === 1 && !selectedCustomer) {
      setError("Select a customer to continue.");
      return;
    }
    if (entryStage === 1 && !salesmanName.trim()) {
      setError("Enter the salesperson name to continue.");
      return;
    }
    if (entryStage === 2 && !calculatedArticles.length) {
      setError("Add at least one article to continue.");
      return;
    }
    setError("");
    setEntryStage((current) => Math.min(3, current + 1));
  };

  const handleNext = () => {
    if (!selectedCustomer) {
      setError("Select a customer.");
      return;
    }
    if (!salesmanName.trim()) {
      setError("Salesman name is required.");
      return;
    }
    if (!calculatedArticles.length) {
      setError("Add at least one article.");
      return;
    }
    const overStockArticle = calculatedArticles.find((row) => {
      const availablePcs = numberValue(inventory.find((item) => item.article_no === row.article_no)?.stock_pcs);
      return numberValue(row.pcs) > availablePcs;
    });
    if (overStockArticle) {
      const availablePcs = numberValue(inventory.find((item) => item.article_no === overStockArticle.article_no)?.stock_pcs);
      setError(`${overStockArticle.article_no}: only ${availablePcs} pieces are available.`);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={step === "entry" ? "New Sales Invoice" : "Review Sales Invoice"}
      subtitle={step === "entry" ? `Invoice ${invoiceNumber || "..."} · Complete the 3 simple sections below` : "Check customer, items and payment before saving"}
      maxWidth="max-w-5xl"
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-h-4 text-xs font-medium text-red-600">{error}</p>
          <div className="flex w-full gap-2 sm:w-auto sm:gap-3">
            {step === "preview" && <Button variant="secondary" outline icon={ArrowLeft} onClick={() => setStep("entry")} disabled={submitting}>Back</Button>}
            {step === "entry" ? (
              <>
                {entryStage > 1 && <Button className="flex-1 sm:flex-none" variant="secondary" outline icon={ArrowLeft} onClick={() => { setError(""); setEntryStage((current) => current - 1); }}>Back</Button>}
                {entryStage < 3
                  ? <Button className="flex-1 sm:flex-none" ref={nextButtonRef} icon={ArrowRight} iconPosition="right" onClick={advanceEntryStage}>{entryStage === 1 ? "Continue to Items" : "Continue to Payment"}</Button>
                  : <Button className="flex-1 sm:flex-none" ref={nextButtonRef} icon={ArrowRight} iconPosition="right" onClick={handleNext}>Review Invoice</Button>}
              </>
            ) : (
              <Button className="flex-1 sm:flex-none" icon={Save} onClick={handleSave} loading={submitting}>Save Invoice</Button>
            )}
          </div>
        </div>
      }
    >
      {step === "entry" ? (
        <div className="grid gap-5 p-0.5">
          <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 text-center text-[11px] font-semibold sm:text-xs">
            <button type="button" onClick={() => setEntryStage(1)} className={`border-r border-gray-200 px-1.5 py-2.5 sm:px-3 ${entryStage === 1 ? "bg-teal-50 text-teal-700" : "bg-white text-gray-700"}`}>1 · Customer</button>
            <button type="button" disabled={entryStage < 2} onClick={() => setEntryStage(2)} className={`border-r border-gray-200 px-1.5 py-2.5 sm:px-3 ${entryStage === 2 ? "bg-teal-50 text-teal-700" : "text-gray-400"}`}>2 · Items</button>
            <button type="button" disabled={entryStage < 3} onClick={() => setEntryStage(3)} className={`px-1.5 py-2.5 sm:px-3 ${entryStage === 3 ? "bg-teal-50 text-teal-700" : "text-gray-400"}`}>3 · Payment</button>
          </div>
          <section className={entryStage === 1 ? "block" : "hidden"}>
            <SectionHeader step="1" title="Who is buying?" subtitle="Select the customer and salesperson handling this sale" />
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <Select label="Customer *" value={customerId} onChange={setCustomerId} options={customerOptions} placeholder="Choose customer" />
              <Input ref={salesmanInputRef} label="Salesperson *" value={salesmanName} onChange={(e) => setSalesmanName(capitalizeWords(e.target.value))} placeholder="Who made this sale?" required={false} />
            </div>
            {selectedCustomer && (
              <div className="mt-3 grid gap-2 rounded-xl border border-gray-300 bg-gray-50 p-3 text-xs text-gray-600 md:grid-cols-4">
                <p><span className="font-semibold text-gray-800">Person:</span> {selectedCustomer.person_name || "-"}</p>
                <p lang="ur"><span className="font-semibold text-gray-800">Urdu:</span> {selectedCustomer.urdu_title || "-"}</p>
                <p><span className="font-semibold text-gray-800">Phone:</span> {selectedCustomer.phone_number || "-"}</p>
                <p><span className="font-semibold text-gray-800">City:</span> {selectedCustomer.city || "-"}</p>
              </div>
            )}
          </section>
          <section className="hidden">
            <div className="hidden">
            <SectionHeader step="1" title="Customer Details" subtitle="Type a customer name or choose one used on a previous invoice" />
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
              <div>
                <Input ref={customerInputRef} label="Customer Name" value={customerName} onChange={(e) => chooseCustomer(e.target.value)} capitalize onKeyDown={(event) => moveOnEnter(event, () => focusAndSelect(salesmanInputRef.current))} list="invoice-customer-history" placeholder="Enter customer name" />
                <datalist id="invoice-customer-history">
                  {previousCustomers.map((customer) => <option key={customer.name} value={customer.name} />)}
                </datalist>
              </div>
              <Input ref={salesmanInputRef} label="Salesman Name" value={salesmanName} onChange={(e) => setSalesmanName(capitalizeWords(e.target.value))} onKeyDown={(event) => moveOnEnter(event, () => focusAndSelect(urduTitleInputRef.current))} placeholder="Optional" required={false} />
              <Input ref={urduTitleInputRef} label="Urdu Title" value={customerUrduTitle} onChange={(e) => setCustomerUrduTitle(e.target.value)} onKeyDown={(event) => moveOnEnter(event, () => focusAndSelect(phoneInputRef.current))} placeholder="اردو نام / عنوان" dir="rtl" lang="ur" required={false} />
              <Input ref={phoneInputRef} label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(event) => moveOnEnter(event, () => focusAndSelect(addressInputRef.current))} placeholder="Optional" required={false} />
              <Input ref={addressInputRef} label="Address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" required={false} />
            </div>
            </div>
          </section>

          <section className={entryStage === 2 ? "block" : "hidden"}>
            <SectionHeader
              step="2"
              title="Invoice Items"
              subtitle={`${calculatedArticles.length} item${calculatedArticles.length === 1 ? "" : "s"} added`}
              right={<div className="flex gap-2"><Button size="sm" outline icon={ScanLine} onClick={async () => { await unlockScanAudio().catch(() => false); setScanModalOpen(true); }}>Scan QR</Button><Button size="sm" icon={Plus} onClick={() => setItemModal({ isOpen: true, article: null })}>Add Item</Button></div>}
            />
            <div className="grid gap-2 md:hidden">
              {calculatedArticles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center"><p className="text-sm font-semibold text-gray-700">No sale item added</p><p className="mt-1 text-xs text-gray-400">Tap Add Item, or scan the packet label.</p><Button className="mt-4" size="sm" icon={Plus} onClick={() => setItemModal({ isOpen: true, article: null })}>Add Sale Item</Button></div>
              ) : calculatedArticles.map((article) => (
                <div key={article._key} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{article.description || article.article_no}</p><p className="mt-0.5 text-xs font-medium text-teal-700">{article.article_no}</p></div><div className="flex gap-1"><button type="button" onClick={() => setItemModal({ isOpen: true, article })} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" aria-label="Edit item"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => removeRow(article._key)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Delete item"><Trash2 className="h-4 w-4" /></button></div></div>
                  <div className="mt-3 grid grid-cols-4 gap-2 border-t border-gray-100 pt-3 text-xs"><div><span className="text-gray-400">Packets</span><p className="font-semibold text-gray-700">{article.quantity_pkt || 0}</p></div><div><span className="text-gray-400">Pieces</span><p className="font-semibold text-gray-700">{article.pcs || 0}</p></div><div><span className="text-gray-400">Rate</span><p className="font-semibold text-gray-700">{article.rate.toFixed(2)}</p></div><div className="text-right"><span className="text-gray-400">Amount</span><p className="font-bold text-emerald-700">{article.amount.toFixed(2)}</p></div></div>
                </div>
              ))}
              {calculatedArticles.length > 0 && <div className="flex items-center justify-between rounded-xl bg-gray-900 px-4 py-3 text-sm text-white"><span>Items total</span><strong className="tabular-nums">{invoiceTotals.net_amount.toFixed(2)}</strong></div>}
            </div>
            <div className="hidden overflow-x-auto rounded-xl border border-gray-300 md:block">
              <table className="w-full min-w-[920px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50 text-xs font-semibold text-gray-500">
                    <th className="w-10 px-2 py-2.5">#</th>
                    <th className="px-2 py-2.5 text-left">Article No</th>
                    <th className="px-2 py-2.5 text-left">Description</th>
                    <th className="px-2 py-2.5 text-left">Size</th>
                    <th className="px-2 py-2.5 text-left">Pckt</th>
                    <th className="px-2 py-2.5 text-left">Dzn</th>
                    <th className="px-2 py-2.5 text-left">Pieces</th>
                    <th className="px-2 py-2.5 text-left">Sale Rate</th>
                    <th className="px-2 py-2.5 text-left">Discount</th>
                    <th className="px-3 py-2.5 text-right">Amount</th>
                    <th className="w-24 px-2 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {calculatedArticles.length === 0 ? (
                    <tr><td colSpan={11} className="px-7 py-10 text-center"><p className="text-sm font-semibold text-gray-700">No items added yet</p><p className="mt-1 text-xs text-gray-400">Add an article manually or scan its QR label.</p><Button className="mt-4" size="sm" icon={Plus} onClick={() => setItemModal({ isOpen: true, article: null })}>Add First Item</Button></td></tr>
                  ) : calculatedArticles.map((article, index) => (
                    <tr key={article._key} className="group border-b border-gray-200 hover:bg-emerald-50/30">
                      <td className="px-2 py-3 text-center text-xs text-gray-400">{index + 1}</td>
                      <td className="px-2 py-3 text-sm font-semibold text-gray-800">{article.article_no}</td>
                      <td className="px-2 py-3 text-sm text-gray-600">{article.description}</td>
                      <td className="px-2 py-3 text-sm text-gray-600">{article.size || "-"}</td>
                      <td className="px-2 py-3 text-sm tabular-nums text-gray-600">{article.quantity_pkt || 0}</td>
                      <td className="px-2 py-3 text-sm tabular-nums text-gray-600">{article.dzn || 0}</td>
                      <td className="px-2 py-3 text-sm tabular-nums text-gray-600">{article.pcs || 0}</td>
                      <td className="px-2 py-3 text-sm tabular-nums text-gray-600">{article.rate.toFixed(2)}</td>
                      <td className="px-2 py-3 text-sm text-gray-600">{article.discount || "-"}</td>
                      <td className="px-3 py-3 text-right text-sm font-semibold tabular-nums text-emerald-700">{article.amount.toFixed(2)}</td>
                      <td className="px-2 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setItemModal({ isOpen: true, article })} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-800" aria-label="Edit item"><Edit3 className="h-4 w-4" /></button>
                          <button type="button" onClick={() => removeRow(article._key)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" aria-label="Delete item"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300 bg-gray-50 font-semibold">
                    <td colSpan={9} className="px-4 py-3 text-right text-sm text-gray-600">Total</td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-emerald-700">{invoiceTotals.net_amount.toFixed(2)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className={entryStage === 3 ? "block" : "hidden"}>
            <SectionHeader step="3" title="Payment Details" subtitle="Enter received cash; balance will calculate automatically" />
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
              <Input label="Returned Goods Amount" type="number" min="0" step="0.01" value={salesReturnAmount} onChange={(e) => setSalesReturnAmount(e.target.value)} placeholder="0.00" required={false} />
              <Input label="Cash Received Now" type="number" min="0" step="0.01" value={receivedAmount} onChange={(e) => setReceivedAmount(e.target.value)} placeholder="0.00" required={false} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-gray-300 bg-gray-50 p-3 text-sm md:grid-cols-5">
              <div><span className="text-gray-500">Items Total</span><p className="font-semibold tabular-nums">{invoiceTotals.gross_amount.toFixed(2)}</p></div>
              <div><span className="text-gray-500">Discount</span><p className="font-semibold tabular-nums text-amber-700">-{invoiceTotals.total_discount_amount.toFixed(2)}</p></div>
              <div><span className="text-gray-500">Net Bill</span><p className="font-semibold tabular-nums text-emerald-700">{invoiceTotals.total_amount.toFixed(2)}</p></div>
              <div><span className="text-gray-500">Cash Received</span><p className="font-semibold tabular-nums text-sky-700">{invoiceTotals.received_amount.toFixed(2)}</p></div>
              <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-gray-200"><span className="text-gray-500">Balance Due</span><p className="text-base font-bold tabular-nums text-red-600">{invoiceTotals.balance_amount.toFixed(2)}</p></div>
            </div>
          </section>
        </div>
      ) : (
        <InvoicePrintPreview invoice={draftInvoice} businessName="Akhlaq Garments" printMode="a5" />
      )}

      <InvoiceItemModal isOpen={itemModal.isOpen} article={itemModal.article} inventory={itemInventory} onClose={() => setItemModal({ isOpen: false, article: null })} onSubmit={upsertArticle} />
      <InvoiceScanModal isOpen={scanModalOpen} inventory={scanInventory} onClose={() => setScanModalOpen(false)} onApply={mergeScannedRows} />
    </Modal>
  );
}
