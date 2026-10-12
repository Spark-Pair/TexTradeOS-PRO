import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Input from "../components/Input";
import Button from "../components/Button";
import { useToast } from "../context/ToastContext";
import useAuth from "../hooks/useAuth";
import { updateMyBusiness } from "../api/business";

const fields = [
  ["name", "Business name", "e.g. Your Garments Store", true],
  ["urdu_name", "Business name (Urdu)", "Optional"],
  ["person", "Owner / contact person", "Optional"],
  ["phone", "Phone", "Optional"],
  ["email", "Email", "Optional"],
  ["tax_number", "Tax / NTN number", "Optional"],
];

export default function BusinessSetup() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...(user?.business || {}) });
  const [saving, setSaving] = useState(false);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name?.trim()) return showToast({ type: "error", message: "Business name is required" });
    setSaving(true);
    try {
      await updateMyBusiness(form);
      await refreshUser();
      showToast({ type: "success", message: "Business details saved" });
      navigate("/", { replace: true });
    } catch (error) {
      showToast({ type: "error", message: error?.response?.data?.message || "Could not save business details" });
    } finally { setSaving(false); }
  };
  return <div className="min-h-screen bg-gradient-to-br from-teal-50 to-green-100 flex items-center justify-center p-6">
    <Card title="Business setup" subtitle="Enter these details once. They will appear on your invoices." className="w-full max-w-2xl">
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">{fields.map(([name, label, placeholder, required]) => <Input key={name} name={name} label={label} placeholder={placeholder} value={form[name] || ""} onChange={change} required={required === true} />)}</div>
        <label className="grid gap-1 text-sm font-medium text-gray-700">Business address<textarea name="address" rows="3" placeholder="Optional" value={form.address || ""} onChange={change} className="rounded-xl border border-gray-300 px-3 py-2 font-normal outline-none focus:border-teal-600" /></label>
        <Button type="submit" loading={saving} className="w-full">Save and continue</Button>
      </form>
    </Card>
  </div>;
}
