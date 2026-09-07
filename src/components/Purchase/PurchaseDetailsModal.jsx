import { Boxes, PackageCheck, Printer, ReceiptText, Wallet } from "lucide-react";
import Button from "../Button";
import Modal from "../Modal";
import { formatDate, formatNumbers } from "../../utils";

export default function PurchaseDetailsModal({ purchase, onClose, onPrintLabels }) {
  const articles = purchase?.articles || [];
  const totalPieces = articles.reduce((sum, article) => sum + Number(article.quantity_pcs || article.total_pcs || 0), 0);

  const summary = [
    ["Articles", formatNumbers(purchase?.article_count || articles.length || 0, 0), ReceiptText, "text-sky-700"],
    ["Packets", formatNumbers(purchase?.packet_count || 0, 0), Boxes, "text-amber-700"],
    ["Pieces", `${formatNumbers(totalPieces, 0)} pcs`, PackageCheck, "text-teal-700"],
    ["Total Amount", formatNumbers(purchase?.total_amount || 0, 2), Wallet, "text-emerald-700"],
  ];

  return (
    <Modal
      isOpen={Boolean(purchase)}
      onClose={onClose}
      title={purchase?.purchase_number || "Purchase Details"}
      subtitle={`${formatDate(purchase?.purchase_date, "DD MMM yyyy")} · ${purchase?.supplier_name || "Unknown supplier"}`}
      maxWidth="max-w-5xl"
      footer={<div className="flex justify-end"><Button icon={Printer} onClick={onPrintLabels}>Print Barcode Labels</Button></div>}
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {summary.map(([label, value, Icon, color]) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2"><Icon className={`h-4 w-4 ${color}`} /><p className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</p></div>
              <p className={`mt-2 text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-2 md:hidden">{articles.map((article, index) => <div key={`${article.article_no}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-3"><div className="flex justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-gray-900">{article.description || "Untitled article"}</p><p className="text-xs font-medium text-teal-700">{article.article_no}</p></div><strong className="text-sm text-emerald-700">{formatNumbers(article.amount || 0, 2)}</strong></div><div className="mt-3 grid grid-cols-4 gap-2 border-t border-gray-200 pt-2 text-xs"><div><span className="text-gray-400">Packets</span><p className="font-semibold">{formatNumbers(article.quantity_pkt || 0, 0)}</p></div><div><span className="text-gray-400">Pieces</span><p className="font-semibold">{formatNumbers(article.quantity_pcs || article.total_pcs || 0, 0)}</p></div><div><span className="text-gray-400">Unit</span><p className="font-semibold">{formatNumbers(article.unit || 0, 0)}</p></div><div className="text-right"><span className="text-gray-400">Rate</span><p className="font-semibold">{formatNumbers(article.rate || 0, 2)}</p></div></div></div>)}</div>

        <div className="hidden overflow-x-auto rounded-xl border border-gray-300 md:block">
          <table className="w-full min-w-[850px] border-collapse text-left">
            <thead className="bg-gray-50 text-xs font-semibold text-gray-500"><tr><th className="px-3 py-3">Article No</th><th className="px-3 py-3">Description</th><th className="px-3 py-3">Size</th><th className="px-3 py-3">Unit</th><th className="px-3 py-3">Packets</th><th className="px-3 py-3">Pieces</th><th className="px-3 py-3">Rate</th><th className="px-3 py-3 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-gray-200">{articles.map((article, index) => <tr key={`${article.article_no}-${index}`}><td className="px-3 py-3 text-sm font-semibold text-teal-700">{article.article_no}</td><td className="px-3 py-3 text-sm text-gray-700">{article.description || "-"}</td><td className="px-3 py-3 text-sm text-gray-600">{article.size || "-"}</td><td className="px-3 py-3 text-sm text-gray-600">{formatNumbers(article.unit || 0, 0)}</td><td className="px-3 py-3 text-sm text-gray-600">{formatNumbers(article.quantity_pkt || 0, 0)}</td><td className="px-3 py-3 text-sm text-gray-600">{formatNumbers(article.quantity_pcs || article.total_pcs || 0, 0)}</td><td className="px-3 py-3 text-sm text-gray-600">{formatNumbers(article.rate || 0, 2)}</td><td className="px-3 py-3 text-right text-sm font-semibold text-emerald-700">{formatNumbers(article.amount || 0, 2)}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
