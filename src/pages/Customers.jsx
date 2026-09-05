import { useMemo, useRef, useState } from "react";
import { CircleCheck, Edit3, MoreVertical, Plus, UserRoundCheck, Users2, XCircle } from "lucide-react";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import TableToolbar from "../components/table/TableToolbar";
import FilterDrawer from "../components/FilterDrawer";
import ContextMenu from "../components/ContextMenu";
import ConfirmModal from "../components/ConfirmModal";
import StatusBadge from "../components/StatusBadge";
import CustomerFormModal from "../components/User/CustomerFormModal";
import PartyDetailsModal from "../components/User/PartyDetailsModal";
import { useToast } from "../context/ToastContext";
import { listCustomers, saveCustomer, toggleCustomerStatus } from "../utils/prototypeStorage";

const PAGE_SIZE = 30;

export default function Customers() {
  const { showToast } = useToast();
  const tableScrollRef = useRef(null);
  const [customers, setCustomers] = useState(() => listCustomers());
  const [activeMenu, setActiveMenu] = useState(null);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [formModal, setFormModal] = useState({ isOpen: false, customer: null });
  const [statusTarget, setStatusTarget] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({ name: "", city: "", status: "" });

  const filteredCustomers = useMemo(() => {
    const name = filters.name.trim().toLowerCase();
    const city = filters.city.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesName = !name
        || customer.customer_name.toLowerCase().includes(name)
        || customer.person_name.toLowerCase().includes(name);
      const matchesCity = !city || customer.city.toLowerCase().includes(city);
      const matchesStatus = !filters.status
        || (filters.status === "active" ? customer.isActive : !customer.isActive);
      return matchesName && matchesCity && matchesStatus;
    });
  }, [customers, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));
  const pageCustomers = filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const stats = useMemo(() => ({
    total: customers.length,
    active: customers.filter((customer) => customer.isActive).length,
    inactive: customers.filter((customer) => !customer.isActive).length,
  }), [customers]);

  const refresh = () => setCustomers(listCustomers());

  const handleSubmit = (payload) => {
    if (!payload.customer_name.trim() || !payload.person_name.trim() || !payload.urdu_title.trim() || !payload.city.trim()) {
      showToast({ type: "error", message: "Customer name, person name, Urdu title, and city are required" });
      return;
    }
    saveCustomer(payload);
    refresh();
    setFormModal({ isOpen: false, customer: null });
    showToast({ type: "success", message: payload._id ? "Customer updated successfully" : "Customer created successfully" });
  };

  const handleStatusChange = () => {
    if (!statusTarget) return;
    toggleCustomerStatus(statusTarget._id);
    refresh();
    showToast({ type: "success", message: "Customer status changed successfully" });
    setStatusTarget(null);
  };

  const filterConfig = [
    {
      label: "Customer",
      placeholder: "Search customer or person",
      type: "text",
      value: filters.name,
      onChange: (e) => setFilters((prev) => ({ ...prev, name: e.target.value })),
    },
    {
      label: "City",
      placeholder: "City",
      type: "text",
      value: filters.city,
      onChange: (e) => setFilters((prev) => ({ ...prev, city: e.target.value })),
    },
    {
      label: "Status",
      type: "select",
      value: filters.status,
      options: [
        { label: "All", value: "" },
        { label: "Active Only", value: "active" },
        { label: "Inactive Only", value: "inactive" },
      ],
      onChange: (value) => setFilters((prev) => ({ ...prev, status: value })),
    },
  ];

  const applyFilters = () => {
    setCurrentPage(1);
    setIsFilterOpen(false);
    tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetFilters = () => {
    setFilters({ name: "", city: "", status: "" });
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  return (
    <>
      <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col">
        <PageHeader title="Customers" subtitle="Create and manage customer profiles." actionLabel="Add Customer" actionIcon={Plus} onAction={() => setFormModal({ isOpen: true, customer: null })} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard label="Total Customers" value={stats.total} icon={Users2} />
          <StatCard label="Active Customers" value={stats.active} icon={CircleCheck} variant="success" />
          <StatCard label="Inactive Customers" value={stats.inactive} icon={XCircle} variant="danger" />
        </div>

        <div className="rounded-3xl bg-white border border-gray-300 overflow-hidden flex-1 flex flex-col">
          <TableToolbar currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} onFilter={() => setIsFilterOpen(true)} />

          <div className="grid gap-2 overflow-auto p-3 md:hidden">
            {pageCustomers.length === 0 ? <div className="py-12 text-center text-sm text-gray-400">No customers found.</div> : pageCustomers.map((customer) => (
              <div key={customer._id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-gray-900">{customer.customer_name}</p><p className="mt-1 text-xs text-gray-500">{customer.person_name || "No contact person"} · {customer.city || "No city"}</p></div><StatusBadge active={customer.isActive} /></div><div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3"><a href={customer.phone_number ? `tel:${customer.phone_number}` : undefined} className="text-sm font-medium text-teal-700">{customer.phone_number || "No phone"}</a><div className="flex gap-2"><button type="button" onClick={() => setFormModal({ isOpen: true, customer })} className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700">Edit</button><button type="button" onClick={() => setStatusTarget(customer)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${customer.isActive ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>{customer.isActive ? "Deactivate" : "Activate"}</button></div></div></div>
            ))}
          </div>

          <div ref={tableScrollRef} className="hidden flex-1 overflow-auto md:block">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-gray-100" style={{ boxShadow: "0 1px 0 0 rgba(209,213,219,1)" }}>
                <tr className="text-sm tracking-wider text-gray-500">
                  <th className="px-5 py-3.5 font-medium">Id</th>
                  <th className="px-5 py-3.5 font-medium">Customer</th>
                  <th className="px-5 py-3.5 font-medium">Person</th>
                  <th className="px-5 py-3.5 font-medium">Urdu Title</th>
                  <th className="px-5 py-3.5 font-medium">Phone</th>
                  <th className="px-5 py-3.5 font-medium">City</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pageCustomers.length === 0 ? (
                  <tr><td colSpan={8} className="px-7 py-16 text-center text-sm text-gray-400">No customers found.</td></tr>
                ) : pageCustomers.map((customer, index) => (
                  <tr key={customer._id} onClick={() => setDetailsTarget(customer)} className="cursor-pointer hover:bg-teal-50/40">
                    <td className="px-5 py-4 text-sm font-medium text-gray-500">{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-800">{customer.customer_name}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{customer.person_name}</td>
                    <td className="px-5 py-4 text-sm text-gray-700" dir="rtl" lang="ur">{customer.urdu_title}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{customer.phone_number || "-"}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">{customer.city}</td>
                    <td className="px-5 py-4"><StatusBadge active={customer.isActive} /></td>
                    <td className="px-5 py-4 text-right relative">
                      <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === customer._id ? null : customer._id); }} className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100" aria-label="Open actions menu">
                        <MoreVertical size={18} />
                      </button>
                      <ContextMenu isOpen={activeMenu === customer._id}>
                        <button onClick={(e) => { e.stopPropagation(); setFormModal({ isOpen: true, customer }); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-gray-600 hover:bg-gray-200 cursor-pointer">
                          <Edit3 size={16} strokeWidth={2.5} /> Edit Customer
                        </button>
                        <div className="h-[1px] bg-gray-200 my-1.5" />
                        <button onClick={(e) => { e.stopPropagation(); setStatusTarget(customer); setActiveMenu(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl cursor-pointer ${customer.isActive ? "text-red-600 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"}`}>
                          <UserRoundCheck size={16} strokeWidth={2.5} /> {customer.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </ContextMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <PartyDetailsModal isOpen={Boolean(detailsTarget)} party={detailsTarget} type="customer" onClose={() => setDetailsTarget(null)} onEdit={(item) => { setDetailsTarget(null); setFormModal({ isOpen: true, customer: item }); }} onToggle={(item) => { setDetailsTarget(null); setStatusTarget(item); }} />
      <CustomerFormModal isOpen={formModal.isOpen} customer={formModal.customer} onClose={() => setFormModal({ isOpen: false, customer: null })} onSubmit={handleSubmit} />
      <FilterDrawer isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filters={filterConfig} onApply={applyFilters} onReset={resetFilters} />
      <ConfirmModal
        isOpen={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusChange}
        title={statusTarget?.isActive ? "Deactivate Customer" : "Activate Customer"}
        message={`Are you sure you want to ${statusTarget?.isActive ? "deactivate" : "activate"} "${statusTarget?.customer_name || "this customer"}"?`}
        confirmText={statusTarget?.isActive ? "Deactivate" : "Activate"}
        variant={statusTarget?.isActive ? "danger" : "success"}
      />
    </>
  );
}
