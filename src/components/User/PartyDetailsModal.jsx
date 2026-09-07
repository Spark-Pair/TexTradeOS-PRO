import { useState } from "react";
import { BookOpen, Edit3, Power } from "lucide-react";
import Button from "../Button";
import Modal from "../Modal";
import ModalDetails from "../ModalDetails";
import StatusBadge from "../StatusBadge";
import PartyStatementModal from "./PartyStatementModal";

const money = (value) => `Rs ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function PartyDetailsModal({ isOpen, onClose, party, type = "customer", onEdit, onToggle }) {
  const [statementOpen, setStatementOpen] = useState(false);
  const isCustomer = type === "customer";
  const isActive = party?.isActive;
  const name = party?.[isCustomer ? "customer_name" : "supplier_name"];

  return <>
    <Modal isOpen={isOpen} onClose={onClose} title={`${isCustomer ? "Customer" : "Supplier"} Info`} subtitle="Overview of registered details" badge={<StatusBadge active={isActive} />} footer={<div className="flex flex-wrap gap-3"><Button icon={BookOpen} outline onClick={() => setStatementOpen(true)} className="grow">View Statement</Button><Button icon={Edit3} variant="warning" onClick={() => onEdit?.(party)} className="grow">Edit Details</Button><Button icon={Power} outline variant={isActive ? "danger" : "success"} className="w-40" onClick={() => onToggle?.(party)}>{isActive ? "Deactivate" : "Activate"}</Button></div>}>
      <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 p-4"><p className="text-xs font-medium uppercase tracking-wider text-teal-600">Current Balance</p><p className="mt-1 text-2xl font-bold text-teal-900">{money(party?.balance)}</p><p className="mt-1 text-xs text-teal-700">{isCustomer ? "Amount receivable from customer" : "Amount payable to supplier"}</p></div>
      <ModalDetails data={[{ label: "Name", value: name },{ label: "Contact Person", value: party?.person_name },{ label: "Urdu Title", value: party?.urdu_title },{ label: "Phone", value: party?.phone_number || "-" },{ label: "City", value: party?.city || "-" },{ label: "Address", value: party?.address || "-" }]} />
    </Modal>
    <PartyStatementModal isOpen={statementOpen} onClose={() => setStatementOpen(false)} party={party} type={type} />
  </>;
}
