import { Edit3, KeyRound, Power } from "lucide-react";
import Button from "../Button";
import Modal from "../Modal";
import ModalDetails from "../ModalDetails";
import StatusBadge from "../StatusBadge";

export default function UserDetailsModal({
  isOpen,
  onClose,
  initialData,
  onAction,
  canEdit = false,
}) {
  const isActive = initialData?.isActive;
  const businessName = initialData?.business_name || initialData?.businessId?.name || "-";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="User Info"
      subtitle="Overview of registered details"
      badge={<StatusBadge active={initialData?.isActive} />}
      footer={
        <div className="flex flex-wrap gap-3">
          {canEdit && <Button icon={Edit3} outline variant="warning" onClick={() => onAction("openEdit", initialData)} className="grow">Edit User</Button>}
          <Button
            icon={KeyRound}
            variant="warning"
            onClick={() => onAction("resetPassword", initialData)}
            className="grow"
          >
            Reset Password
          </Button>
          <Button
            icon={Power}
            outline
            variant={isActive ? "danger" : "success"}
            className="w-40"
            onClick={() => onAction("toggleStatus", initialData)}
          >
            {isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      }
    >
      {
        <ModalDetails
          data={[
            { label: "Name", value: initialData?.name },
            { label: "Username", value: initialData?.username },
            { label: "Business Name", value: businessName },
            { label: "Role", value: initialData?.role, className: 'capitalize' },
          ]}
        />
      }
    </Modal>
  );
}
