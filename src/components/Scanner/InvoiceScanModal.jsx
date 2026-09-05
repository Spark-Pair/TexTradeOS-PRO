import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Html5Qrcode } from "html5-qrcode";
import Modal from "../Modal";
import Button from "../Button";
import { verifyArticleQr } from "../../api/qr.api";

const numberValue = (value) => {
  const parsed = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
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

let scanAudioContext = null;

const getScanAudioContext = () => {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!scanAudioContext || scanAudioContext.state === "closed") scanAudioContext = new AudioContext();
  return scanAudioContext;
};

export const unlockScanAudio = async () => {
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

export default function InvoiceScanModal({ isOpen, onClose, onApply, inventory = [], contextLabel = "invoice" }) {
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
      subtitle={`Each successful scan adds 1 packet; repeat scans increase the same row${contextLabel ? ` for this ${contextLabel}` : ""}`}
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

