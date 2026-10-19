import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useAnimationControls, useReducedMotion } from "framer-motion";
import { Building2, Check, FileText, ImageUp, MapPin, Palette, Save, Trash2 } from "lucide-react";
import Input from "../components/Input";
import Button from "../components/Button";
import PageHeader from "../components/PageHeader";
import { useToast } from "../context/ToastContext";
import useAuth from "../hooks/useAuth";
import { updateMyBusiness } from "../api/business";

const fields = [
  ["name", "Business name", "e.g. Your Garments Store", true],
  ["urdu_name", "Business name (Urdu)", "Optional"],
  ["tagline", "Invoice tagline", "e.g. Garments Stock Lot"],
  ["person", "Owner / contact person", "Optional"],
  ["phone", "Phone", "Optional"],
  ["email", "Email", "Optional"],
  ["tax_number", "Tax / NTN number", "Optional"],
];

function SectionCard({ icon: Icon, title, description, children, className = "", bodyClassName = "p-5 sm:p-6", headerRight = null }) {
  return <section className={`overflow-hidden rounded-3xl border border-gray-300 bg-white ${className}`}>
    <div className={`flex items-center gap-3 border-b border-gray-200 bg-gray-50 py-4 ${Icon ? "icon-section-header" : "px-5 sm:px-6"}`}>
      {Icon && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-gray-300 bg-white text-gray-600"><Icon size={17} /></span>}
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-gray-800">{title}</h2><p className="mt-0.5 text-xs text-gray-400">{description}</p></div>
      {headerRight}
    </div>
    <div className={bodyClassName}>{children}</div>
  </section>;
}

function AnimatedSwitch({ checked, onChange }) {
  const knobControls = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const initialized = useRef(false);

  useEffect(() => {
    const restingPosition = checked ? 20 : 0;
    if (!initialized.current || reduceMotion) {
      initialized.current = true;
      knobControls.set({ x: restingPosition });
      return;
    }
    knobControls.start({
      x: restingPosition,
      transition: { type: "spring", stiffness: 380, damping: 30, mass: 0.55 },
    });
  }, [checked, knobControls, reduceMotion]);

  return <button type="button" role="switch" aria-checked={checked} onClick={onChange} className={`relative h-6 w-11 shrink-0 overflow-hidden rounded-full border transition-colors duration-300 ease-out focus:outline-none ${checked ? "border-[#127475] bg-[#127475]" : "border-gray-300 bg-gray-300"}`}>
    <motion.span initial={false} animate={knobControls} className="absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm will-change-transform" />
    <span className="sr-only">{checked ? "Disable customized invoice" : "Enable customized invoice"}</span>
  </button>;
}

export default function BusinessSetup() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ primary_color: "#0b74b7", custom_invoice_enabled: false, ...(user?.business || {}) });
  const [saving, setSaving] = useState(false);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const selectLogo = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    const supported = file.type === "image/png" || file.type === "image/svg+xml" || ["png", "svg"].includes(extension);
    if (!supported) return showToast({ type: "error", message: "Upload a PNG or SVG logo" });
    if (file.size > 1024 * 1024) return showToast({ type: "error", message: "Logo must be smaller than 1 MB" });
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, logo_data: String(reader.result || "") }));
    reader.onerror = () => showToast({ type: "error", message: "Could not read the selected logo" });
    reader.readAsDataURL(file);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name?.trim()) return showToast({ type: "error", message: "Business name is required" });
    setSaving(true);
    try {
      await updateMyBusiness(form);
      await refreshUser();
      showToast({ type: "success", message: "Business details saved" });
      if (!user?.businessProfileComplete) navigate("/", { replace: true });
    } catch (error) {
      showToast({ type: "error", message: error?.response?.data?.message || "Could not save business details" });
    } finally { setSaving(false); }
  };
  const primaryColor = /^#[0-9a-f]{6}$/i.test(form.primary_color || "") ? form.primary_color : "#0b74b7";
  return <div className="relative z-10 mx-auto flex h-full min-h-0 max-w-7xl flex-col">
    <PageHeader title="Business Profile" subtitle="Manage the identity and contact details used across invoices." rightContent={<div className="hidden sm:block"><Button type="submit" form="business-profile-form" icon={Save} loading={saving}>{saving ? "Saving..." : "Save Changes"}</Button></div>} />
    <form id="business-profile-form" onSubmit={submit} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="grid content-start gap-4">
          <SectionCard icon={FileText} title="Customized Invoice" description="Branded Customer 2 design." bodyClassName="" headerRight={<AnimatedSwitch checked={Boolean(form.custom_invoice_enabled)} onChange={() => setForm((current) => ({ ...current, custom_invoice_enabled: !current.custom_invoice_enabled }))} />}>
            <label className="group relative flex h-48 cursor-pointer items-center justify-center overflow-hidden bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px] p-8 outline-none focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#127475]/20">
              {form.logo_data ? <>
                <img src={form.logo_data} alt="Business logo preview" className="h-full w-full object-contain" />
                <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow-sm backdrop-blur"><Check size={12} strokeWidth={2.5} aria-hidden="true" /> Ready</span>
                <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-gray-900/75 px-3 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-sm backdrop-blur-sm transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none">Click to replace</span>
              </> : <div className="flex flex-col items-center text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-teal-100 bg-white text-[#127475] shadow-sm"><ImageUp size={21} aria-hidden="true" /></span>
                <strong className="mt-3 text-sm font-semibold text-gray-800">Upload business logo</strong>
                <span className="mt-1 text-xs text-gray-400">Transparent PNG or SVG</span>
              </div>}
                <input type="file" accept="image/png,image/svg+xml,.png,.svg" onChange={selectLogo} className="sr-only" />
            </label>

              <div className="flex items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700">Invoice logo</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">PNG or SVG · Max 1 MB</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#127475] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#0f6465] focus-within:ring-2 focus-within:ring-teal-300">
                    <ImageUp size={14} aria-hidden="true" />{form.logo_data ? "Replace" : "Upload"}
                    <input type="file" accept="image/png,image/svg+xml,.png,.svg" onChange={selectLogo} className="sr-only" />
                  </label>
                  {form.logo_data && <button type="button" onClick={() => setForm((current) => ({ ...current, logo_data: "" }))} className="grid h-8 w-8 place-items-center rounded-xl border border-gray-300 bg-white text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-100" aria-label="Remove logo" title="Remove logo"><Trash2 size={14} aria-hidden="true" /></button>}
                </div>
              </div>
          </SectionCard>

          <SectionCard icon={Palette} title="Brand Color" description="Sets invoice colors.">
            <div className="flex items-end gap-3">
              <label className="relative grid h-[42px] w-[42px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-xl border border-black/10 shadow-sm transition hover:scale-[1.03]" style={{ backgroundColor: primaryColor }}>
                <Palette size={17} className="text-white drop-shadow" aria-hidden="true" />
                <input type="color" name="primary_color" value={primaryColor} onChange={change} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Choose primary business color" />
              </label>
              <div className="min-w-0 flex-1">
                <label htmlFor="primary-color-value" className="text-xs font-medium text-gray-600">Primary color</label>
                <input id="primary-color-value" name="primary_color" value={form.primary_color || "#0b74b7"} onChange={change} pattern="#[0-9A-Fa-f]{6}" maxLength="7" required className="mt-1 w-full rounded-xl border border-gray-400 px-3.5 py-2 font-mono text-sm uppercase outline-none transition focus:ring-2 focus:ring-teal-300" aria-label="Primary color hex value" />
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[11px] text-gray-400"><span>Invoice palette</span><span>Auto-generated</span></div>
              <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-black/5"><span className="flex-1" style={{ backgroundColor: primaryColor }} /><span className="flex-1 opacity-75" style={{ backgroundColor: primaryColor }} /><span className="flex-1 opacity-45" style={{ backgroundColor: primaryColor }} /><span className="flex-1 opacity-20" style={{ backgroundColor: primaryColor }} /></div>
            </div>
          </SectionCard>
        </div>

        <div className="grid content-start gap-4">
          <SectionCard icon={Building2} title="Business Identity" description="Names and tagline shown on printed documents.">
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.slice(0, 3).map(([name, label, placeholder, required]) => <Input key={name} name={name} label={label} placeholder={placeholder} value={form[name] || ""} onChange={change} required={required === true} />)}
            </div>
          </SectionCard>

          <SectionCard icon={MapPin} title="Contact & Registration" description="Business contact and tax information.">
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.slice(3).map(([name, label, placeholder, required]) => <Input key={name} name={name} label={label} placeholder={placeholder} value={form[name] || ""} onChange={change} required={required === true} />)}
              <label className="grid gap-1.5 text-sm text-gray-700 sm:col-span-2"><span>Business address <span className="text-gray-400">(Optional)</span></span><textarea name="address" rows="4" placeholder="Optional" value={form.address || ""} onChange={change} className="resize-y rounded-xl border border-gray-400 px-4 py-2 font-normal outline-none transition focus:ring-2 focus:ring-teal-300" /></label>
            </div>
          </SectionCard>
        </div>
      </div>
      <div className="mt-4 flex justify-end rounded-3xl border border-gray-300 bg-white p-4 sm:hidden"><Button type="submit" icon={Save} loading={saving} className="w-full">Save Changes</Button></div>
    </form>
  </div>;
}
