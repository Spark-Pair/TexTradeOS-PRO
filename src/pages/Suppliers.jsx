import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CircleCheck, Edit3, MoreVertical, Plus, RefreshCw, Store, UserRoundCheck, XCircle } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import TableToolbar from "../components/table/TableToolbar";
import FilterDrawer from "../components/FilterDrawer";
import ContextMenu from "../components/ContextMenu";
import ConfirmModal from "../components/ConfirmModal";
import StatusBadge from "../components/StatusBadge";
import SupplierFormModal from "../components/User/SupplierFormModal";
import PartyDetailsModal from "../components/User/PartyDetailsModal";
import { useToast } from "../context/ToastContext";
import { createSupplier, fetchSuppliers, toggleSupplier, updateSupplier } from "../api/commerce";

const PAGE_SIZE = 30;
const errorMessage = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

export default function Suppliers() {
  const { showToast } = useToast();
  const tableScrollRef = useRef(null);
  const [suppliers, setSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeMenu, setActiveMenu] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [formModal, setFormModal] = useState({ isOpen: false, supplier: null });
  const [statusTarget, setStatusTarget] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ name: "", city: "", status: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchSuppliers();
      setSuppliers(Array.isArray(data) ? data : []);
    } catch (error) {
      setSuppliers([]);
      setLoadError(errorMessage(error, "Could not load suppliers from the server"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const filteredSuppliers = useMemo(() => {
    const name = filters.name.trim().toLowerCase();
    const city = filters.city.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesName = !name || (supplier.supplier_name || "").toLowerCase().includes(name) || (supplier.person_name || "").toLowerCase().includes(name);
      const matchesCity = !city || (supplier.city || "").toLowerCase().includes(city);
      const matchesStatus = !filters.status || (filters.status === "active" ? supplier.isActive : !supplier.isActive);
      return matchesName && matchesCity && matchesStatus;
    });
  }, [filters, suppliers]);

  const totalPages = Math.max(1, Math.ceil(filteredSuppliers.length / PAGE_SIZE));
  const pageSuppliers = filteredSuppliers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const stats = useMemo(() => ({ total: suppliers.length, active: suppliers.filter((supplier) => supplier.isActive).length, inactive: suppliers.filter((supplier) => !supplier.isActive).length }), [suppliers]);

  const handleSubmit = async (payload) => {
    if (isSaving) return;
    if (!payload.supplier_name.trim() || !payload.person_name.trim() || !payload.urdu_title.trim() || !payload.city.trim()) {
      showToast({ type: "error", message: "Supplier name, person name, Urdu title, and city are required" });
      return;
    }
    setIsSaving(true);
    try {
      if (payload._id) await updateSupplier(payload._id, payload);
      else await createSupplier(payload);
      await loadSuppliers();
      setFormModal({ isOpen: false, supplier: null });
      showToast({ type: "success", message: payload._id ? "Supplier updated successfully" : "Supplier created successfully" });
    } catch (error) {
      showToast({ type: "error", message: errorMessage(error, "Could not save supplier") });
      throw error;
    } finally { setIsSaving(false); }
  };

  const handleStatusChange = async () => {
    if (!statusTarget || isChangingStatus) return;
    setIsChangingStatus(true);
    try {
      await toggleSupplier(statusTarget._id);
      await loadSuppliers();
      showToast({ type: "success", message: "Supplier status changed successfully" });
      setStatusTarget(null);
    } catch (error) {
      showToast({ type: "error", message: errorMessage(error, "Could not change supplier status") });
    } finally { setIsChangingStatus(false); }
  };

  const filterConfig = [
    { label: "Supplier", placeholder: "Search supplier or person", type: "text", value: filters.name, onChange: (e) => setFilters((prev) => ({ ...prev, name: e.target.value })) },
    { label: "City", placeholder: "City", type: "text", value: filters.city, onChange: (e) => setFilters((prev) => ({ ...prev, city: e.target.value })) },
    { label: "Status", type: "select", value: filters.status, options: [{ label: "All", value: "" }, { label: "Active Only", value: "active" }, { label: "Inactive Only", value: "inactive" }], onChange: (value) => setFilters((prev) => ({ ...prev, status: value })) },
  ];
  const applyFilters = () => { setCurrentPage(1); setIsFilterOpen(false); tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); };
  const resetFilters = () => { setFilters({ name: "", city: "", status: "" }); setCurrentPage(1); setIsFilterOpen(false); };

  const content = isLoading ? <div className="flex flex-1 items-center justify-center text-sm text-gray-500">Loading suppliers…</div> : loadError ? <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"><AlertTriangle className="text-amber-500" size={28} /><div><p className="font-semibold text-gray-800">Supplier data unavailable</p><p className="mt-1 text-sm text-gray-500">{loadError}</p><p className="mt-1 text-xs text-gray-400">No cached or demo supplier data will be shown.</p></div><button type="button" onClick={loadSuppliers} className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"><RefreshCw size={15} /> Retry</button></div> : <><div className="grid gap-2 overflow-auto p-3 md:hidden">{pageSuppliers.length === 0 ? <div className="py-12 text-center text-sm text-gray-400">No suppliers found.</div> : pageSuppliers.map((supplier) => <div key={supplier._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-gray-900">{supplier.supplier_name}</p><p className="mt-1 text-xs text-gray-500">{supplier.person_name || "No contact person"} · {supplier.city || "No city"}</p></div><StatusBadge active={supplier.isActive} /></div><div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3"><a href={supplier.phone_number ? `tel:${supplier.phone_number}` : undefined} className="text-sm font-medium text-teal-700">{supplier.phone_number || "No phone"}</a><div className="flex gap-2"><button type="button" onClick={() => setFormModal({ isOpen: true, supplier })} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">Edit</button><button type="button" onClick={() => setStatusTarget(supplier)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${supplier.isActive ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{supplier.isActive ? "Deactivate" : "Activate"}</button></div></div></div>)}</div><div ref={tableScrollRef} className="hidden flex-1 overflow-auto md:block"><table className="w-full text-left border-collapse"><thead className="sticky top-0 z-20 bg-gray-100" style={{ boxShadow: "0 1px 0 0 rgba(209,213,219,1)" }}><tr className="text-sm tracking-wider text-gray-500"><th className="px-5 py-3.5 font-medium">Id</th><th className="px-5 py-3.5 font-medium">Supplier</th><th className="px-5 py-3.5 font-medium">Person</th><th className="px-5 py-3.5 font-medium">Urdu Title</th><th className="px-5 py-3.5 font-medium">Phone</th><th className="px-5 py-3.5 font-medium">City</th><th className="px-5 py-3.5 font-medium">Status</th><th className="px-5 py-3.5 font-medium text-right">Actions</th></tr></thead><tbody className="divide-y divide-gray-200">{pageSuppliers.length === 0 ? <tr><td colSpan={8} className="px-7 py-16 text-center text-sm text-gray-400">No suppliers found.</td></tr> : pageSuppliers.map((supplier, index) => <tr key={supplier._id} onClick={() => setDetailsTarget(supplier)} className="cursor-pointer hover:bg-teal-50/40"><td className="px-5 py-4 text-sm font-medium text-gray-500">{(currentPage - 1) * PAGE_SIZE + index + 1}</td><td className="px-5 py-4 text-sm font-semibold text-gray-800">{supplier.supplier_name}</td><td className="px-5 py-4 text-sm text-gray-600">{supplier.person_name}</td><td className="px-5 py-4 text-sm text-gray-700" dir="rtl" lang="ur">{supplier.urdu_title}</td><td className="px-5 py-4 text-sm text-gray-600">{supplier.phone_number || "-"}</td><td className="px-5 py-4 text-sm text-gray-600">{supplier.city}</td><td className="px-5 py-4"><StatusBadge active={supplier.isActive} /></td><td className="px-5 py-4 text-right relative"><button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === supplier._id ? null : supplier._id); }} className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100" aria-label="Open actions menu"><MoreVertical size={18} /></button><ContextMenu isOpen={activeMenu === supplier._id}><button onClick={(e) => { e.stopPropagation(); setFormModal({ isOpen: true, supplier }); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-gray-600 hover:bg-gray-200 cursor-pointer"><Edit3 size={16} strokeWidth={2.5} /> Edit Supplier</button><div className="h-[1px] bg-gray-200 my-1.5" /><button onClick={(e) => { e.stopPropagation(); setStatusTarget(supplier); setActiveMenu(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer ${supplier.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"}`}><UserRoundCheck size={16} strokeWidth={2.5} /> {supplier.isActive ? "Deactivate" : "Activate"}</button></ContextMenu></td></tr>)}</tbody></table></div></>;

  return <><div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col"><PageHeader title="Suppliers" subtitle="Create and manage supplier profiles." actionLabel="Add Supplier" actionIcon={Plus} onAction={() => setFormModal({ isOpen: true, supplier: null })} /><div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"><StatCard label="Total Suppliers" value={stats.total} icon={Store} /><StatCard label="Active Suppliers" value={stats.active} icon={CircleCheck} variant="success" /><StatCard label="Inactive Suppliers" value={stats.inactive} icon={XCircle} variant="danger" /></div><div className="rounded-3xl bg-white border border-gray-300 overflow-hidden flex-1 flex flex-col"><TableToolbar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onFilter={() => setIsFilterOpen(true)} />{content}</div></div><PartyDetailsModal isOpen={Boolean(detailsTarget)} party={detailsTarget} type="supplier" onClose={() => setDetailsTarget(null)} onEdit={(item) => { setDetailsTarget(null); setFormModal({ isOpen: true, supplier: item }); }} onToggle={(item) => { setDetailsTarget(null); setStatusTarget(item); }} /><SupplierFormModal isOpen={formModal.isOpen} supplier={formModal.supplier} onClose={() => { if (!isSaving) setFormModal({ isOpen: false, supplier: null }); }} onSubmit={handleSubmit} /><FilterDrawer isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filters={filterConfig} onApply={applyFilters} onReset={resetFilters} /><ConfirmModal isOpen={Boolean(statusTarget)} onClose={() => { if (!isChangingStatus) setStatusTarget(null); }} onConfirm={handleStatusChange} isLoading={isChangingStatus} closeOnConfirm={false} title={statusTarget?.isActive ? "Deactivate Supplier" : "Activate Supplier"} message={`Are you sure you want to ${statusTarget?.isActive ? "deactivate" : "activate"} "${statusTarget?.supplier_name || "this supplier"}"?`} confirmText={statusTarget?.isActive ? "Deactivate" : "Activate"} variant={statusTarget?.isActive ? "danger" : "success"} /></>;
}
