import { useEffect, useMemo, useState } from "react";
import { Save, X } from "lucide-react";
import Button from "./Button";
import Input from "./Input";
import Modal from "./Modal";
import ModalDetails from "./ModalDetails";
import Select from "./Select";
import Amount from "./Amount";
import { createPaymentClearance } from "../api/commerce";
import { useToast } from "../context/ToastContext";

const today = () => new Date().toISOString().slice(0, 10);
const errorMessage = (error) => error?.response?.data?.message || error?.message || "Could not save clearance";

export default function PaymentClearanceModal({ isOpen, onClose, payment, accounts = [], banks = [] }) {
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ clearance_date: today(), settlement_method: "transfer", amount: "", reference_no: "", bank_account_id: "", settlement_bank_name: "", settlement_date: "", notes: "" });
  const paymentId = payment?.source === "party" ? payment?.payment_id : String(payment?.id || "").replace(/^invoice-/, "");
  const accountOptions = useMemo(() => accounts.filter((account) => account.isActive !== false).map((account) => ({ value: account._id, label: `${account.account_title}${account.bank_name ? ` · ${account.bank_name}` : ""}` })), [accounts]);
  useEffect(() => {
    if (isOpen) setForm({ clearance_date: today(), settlement_method: "transfer", amount: payment?.amount ?? "", reference_no: "", bank_account_id: "", settlement_bank_name: "", settlement_date: "", notes: "" });
  }, [isOpen, paymentId, payment?.amount]);
  if (!isOpen) return null;

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    if (!payment || !paymentId || Number(form.amount || 0) <= 0) {
      showToast({ type: "error", message: "Clearance amount must be greater than zero" });
      return;
    }
    setIsSaving(true);
    try {
      await createPaymentClearance(payment.source, paymentId, { ...form, amount: Number(form.amount || 0) });
      showToast({ type: "success", message: "Clearance record saved" });
      setForm((current) => ({ ...current, amount: "", reference_no: "", settlement_bank_name: "", settlement_date: "", notes: "" }));
    } catch (error) {
      showToast({ type: "error", message: errorMessage(error) });
    } finally {
      setIsSaving(false);
    }
  };

  return <Modal isOpen={isOpen} onClose={isSaving ? undefined : onClose} maxWidth="max-w-3xl" title="Add Clearance Record" subtitle="Record the replacement or settlement for this cheque/slip" footer={<div className="flex gap-3"><Button outline variant="secondary" onClick={onClose} disabled={isSaving} className="w-1/3"><X size={16} /> Close</Button><Button icon={Save} onClick={save} loading={isSaving} className="grow">Save Clearance</Button></div>}>
    <div className="space-y-5">
      <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-3">
        <ModalDetails data={[{ label: "Account", value: payment?.party_name || "-" }, { label: "Type", value: payment?.party_type || "-" }, { label: "Method", value: payment?.method === "self_cheque" ? "Self Cheque" : payment?.method || "-" }, { label: "Reference No", value: payment?.reference_no || payment?.cheque_no || "-" }, { label: "Payment Amount", value: <Amount value={payment?.amount || 0} decimals={2} /> }, { label: "Destination", value: payment?.destination_account_title || "No destination account" }]} />
      </div>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <Select label="Settlement Method" value={form.settlement_method} onChange={(value) => set("settlement_method", value)} options={[{ value: "cash", label: "Cash" }, { value: "cheque", label: "Cheque" }, { value: "slip", label: "Slip" }, { value: "transfer", label: "Transfer" }, { value: "online", label: "Online" }]} />
        <Input label="Clearance Date" type="date" value={form.clearance_date} onChange={(event) => set("clearance_date", event.target.value)} />
        <Input label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={(event) => set("amount", event.target.value)} />
        <Input label="Reff No" value={form.reference_no} onChange={(event) => set("reference_no", event.target.value)} />
        {form.settlement_method !== "cash" && <Select label={`New Destination Account${["online", "transfer"].includes(form.settlement_method) ? " (Required)" : " (Optional)"}`} value={form.bank_account_id} onChange={(value) => set("bank_account_id", value)} options={accountOptions} placeholder="Select account" />}
        {(form.settlement_method === "cheque" || form.settlement_method === "slip") && <><Select label="New Bank" value={form.settlement_bank_name} onChange={(value) => set("settlement_bank_name", value)} options={banks.map((bank) => ({ value: bank, label: bank }))} placeholder="Select bank" /><Input label={`${form.settlement_method === "cheque" ? "Cheque" : "Slip"} Date`} type="date" value={form.settlement_date} onChange={(event) => set("settlement_date", event.target.value)} /></>}
        <Input label="Notes" required={false} value={form.notes} onChange={(event) => set("notes", event.target.value)} />
      </div>
    </div>
  </Modal>;
}
