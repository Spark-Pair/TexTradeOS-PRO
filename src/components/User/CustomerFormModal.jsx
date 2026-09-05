import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import Modal from "../Modal";
import Input from "../Input";
import Button from "../Button";

const INITIAL_STATE = {
  customer_name: "",
  person_name: "",
  urdu_title: "",
  phone_number: "",
  address: "",
  city: "",
  isActive: true,
};

export default function CustomerFormModal({ isOpen, onClose, onSubmit, customer = null, loading = false }) {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(customer ? { ...INITIAL_STATE, ...customer } : INITIAL_STATE);
    setIsSubmitting(false);
  }, [customer, isOpen]);

  const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event) => {
    event?.preventDefault?.();
    if (loading || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = Boolean(customer?._id);
  const busy = loading || isSubmitting;

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? undefined : onClose}
      maxWidth="max-w-2xl"
      title={isEditing ? "Edit Customer" : "Add Customer"}
      subtitle={isEditing ? "Update customer profile details" : "Create a customer profile"}
      footer={
        <div className="flex gap-3">
          <Button outline variant="secondary" onClick={onClose} disabled={busy} className="w-1/3">
            Discard
          </Button>
          <Button icon={Save} className="grow" onClick={handleSubmit} loading={busy} disabled={busy}>
            {isEditing ? "Save Customer" : "Create Customer"}
          </Button>
        </div>
      }
    >
      <form className="grid grid-cols-1 gap-3.5 p-0.5 md:grid-cols-2" onSubmit={handleSubmit}>
        <Input label="Customer Name" value={formData.customer_name} onChange={(e) => update("customer_name", e.target.value)} placeholder="Customer business name" capitalize />
        <Input label="Person Name" value={formData.person_name} onChange={(e) => update("person_name", e.target.value)} placeholder="Contact person" capitalize />
        <Input label="Urdu Title" value={formData.urdu_title} onChange={(e) => update("urdu_title", e.target.value)} placeholder="اردو نام / عنوان" dir="rtl" lang="ur" />
        <Input label="Phone Number" value={formData.phone_number} onChange={(e) => update("phone_number", e.target.value)} placeholder="Optional" required={false} />
        <Input label="City" value={formData.city} onChange={(e) => update("city", e.target.value)} placeholder="City" capitalize />
        <Input label="Address" value={formData.address} onChange={(e) => update("address", e.target.value)} placeholder="Optional" required={false} className="md:col-span-2" />
        <button type="submit" className="hidden" aria-hidden="true" disabled={busy} />
      </form>
    </Modal>
  );
}
