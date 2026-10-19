import { Edit3, Power } from "lucide-react";
import Button from "./Button";
import Modal from "./Modal";
import ModalDetails from "./ModalDetails";
import StatusBadge from "./StatusBadge";

const categoryLabel = { customer: "Customer", supplier: "Supplier", self: "Self" };

export default function BankAccountDetailsModal({ isOpen, onClose, account, onEdit, onToggle }) {
  const active = account?.isActive;
  return <Modal isOpen={isOpen} onClose={onClose} title="Bank Account Info" subtitle="Overview of registered account details" badge={<StatusBadge active={active} />} footer={<div className="flex gap-3"><Button icon={Edit3} variant="warning" onClick={() => onEdit?.(account)} className="grow">Edit Details</Button><Button icon={Power} outline variant={active ? "danger" : "success"} className="w-40" onClick={() => onToggle?.(account)}>{active ? "Deactivate" : "Activate"}</Button></div>}>
    <ModalDetails data={[{ label: "Category", value: categoryLabel[account?.category] || "-" }, { label: "Customer / Supplier", value: account?.party_name || (account?.category === "self" ? "Own Account" : "-" ) }, { label: "Account Title", value: account?.account_title }, { label: "Account No", value: account?.account_no || "-" }, { label: "Bank", value: account?.bank_name || "-" }, { label: "Cheque Book Serial", value: account?.category === "self" && (account?.cheque_serial_start || account?.cheque_serial_end) ? `${account.cheque_serial_start || "-"} – ${account.cheque_serial_end || "-"}` : "-" }]} />
  </Modal>;
}
