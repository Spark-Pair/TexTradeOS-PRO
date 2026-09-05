import { Edit3, Power } from "lucide-react";
import Button from "../Button";
import Modal from "../Modal";
import ModalDetails from "../ModalDetails";
import StatusBadge from "../StatusBadge";

export default function PartyDetailsModal({
  isOpen,
  onClose,
  party,
  type = "customer",
  onEdit,
  onToggle,
}) {
  const isCustomer = type === "customer";
  const isActive = party?.isActive;
  const name = party?.[isCustomer ? "customer_name" : "supplier_name"];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${isCustomer ? "Customer" : "Supplier"} Info`}
      subtitle="Overview of registered details"
      badge={<StatusBadge active={isActive} />}
      footer={
        <div className="flex gap-3">
          <Button
            icon={Edit3}
            variant="warning"
            onClick={() => onEdit?.(party)}
            className="grow"
          >
            Edit Details
          </Button>
          <Button
            icon={Power}
            outline
            variant={isActive ? "danger" : "success"}
            className="w-40"
            onClick={() => onToggle?.(party)}
          >
            {isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      }
    >
      <ModalDetails
        data={[
          { label: "Name", value: name },
          { label: "Contact Person", value: party?.person_name },
          { label: "Urdu Title", value: party?.urdu_title },
          { label: "Phone", value: party?.phone_number || "-" },
          { label: "City", value: party?.city || "-" },
        ]}
      />
    </Modal>
  );
}
