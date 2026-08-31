import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import Modal from "../Modal";
import Input from "../Input";
import Button from "../Button";

const INITIAL_STATE = {
  supplier_name: "",
  person_name: "",
  urdu_title: "",
  phone_number: "",
  address: "",
  city: "",
  isActive: true,
};

export default function SupplierFormModal({ isOpen, onClose, onSubmit, supplier = null, loading = false }) {
  const [formData, setFormData] = useState(INITIAL_STATE);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(supplier ? { ...INITIAL_STATE, ...supplier } : INITIAL_STATE);
  }, [isOpen, supplier]);

  const update = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(formData);
  };

  const isEditing = Boolean(supplier?._id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-2xl"
      title={isEditing ? "Edit Supplier" : "Add Supplier"}
      subtitle={isEditing ? "Update supplier profile details" : "Create a supplier profile"}
      footer={
        <div className="flex gap-3">
          <Button outline variant="secondary" onClick={onClose} className="w-1/3">
            Discard
          </Button>
          <Button icon={Save} className="grow" onClick={handleSubmit} loading={loading}>
            {isEditing ? "Save Supplier" : "Create Supplier"}
          </Button>
        </div>
      }
    >
      <form className="grid grid-cols-1 gap-3.5 p-0.5 md:grid-cols-2" onSubmit={handleSubmit}>
        <Input label="Supplier Name" value={formData.supplier_name} onChange={(e) => update("supplier_name", e.target.value)} placeholder="Supplier business name" capitalize />
        <Input label="Person Name" value={formData.person_name} onChange={(e) => update("person_name", e.target.value)} placeholder="Contact person" capitalize />
        <Input label="Urdu Title" value={formData.urdu_title} onChange={(e) => update("urdu_title", e.target.value)} placeholder="اردو نام / عنوان" dir="rtl" lang="ur" />
        <Input label="Phone Number" value={formData.phone_number} onChange={(e) => update("phone_number", e.target.value)} placeholder="Optional" required={false} />
        <Input label="City" value={formData.city} onChange={(e) => update("city", e.target.value)} placeholder="City" capitalize />
        <Input label="Address" value={formData.address} onChange={(e) => update("address", e.target.value)} placeholder="Optional" required={false} className="md:col-span-2" />
        <button type="submit" className="hidden" aria-hidden="true" />
      </form>
    </Modal>
  );
}
