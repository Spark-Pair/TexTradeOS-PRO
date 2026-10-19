import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CircleDollarSign,
  CreditCard,
  Edit3,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  ReceiptText,
  Save,
  Trash2,
} from "lucide-react";
import Button from "../components/Button";
import FilterDrawer from "../components/FilterDrawer";
import Input from "../components/Input";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import Select from "../components/Select";
import StatCard from "../components/StatCard";
import Amount from "../components/Amount";
import TableToolbar from "../components/table/TableToolbar";
import ContextMenu from "../components/ContextMenu";
import PaymentDetailsModal from "../components/PaymentDetailsModal";
import PaymentDestinationFields from "../components/PaymentDestinationFields";
import PaymentClearanceModal from "../components/PaymentClearanceModal";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../context/ToastContext";
import {
  createCustomerPayment,
  createSupplierPayment,
  fetchCustomers,
  fetchBankAccounts,
  fetchPayments,
  fetchSuppliers,
  updatePayment,
  deletePayment,
  deleteInvoicePayment,
  updateInvoicePayment,
} from "../api/commerce";
import { fetchMyReferenceData } from "../api/business";

const PAGE_SIZE = 30;
const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => <Amount value={value} decimals={2} />;
const errorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;
const emptyForm = () => ({
  party_type: "customer",
  party_id: "",
  payment_date: today(),
  method: "cash",
  amount: "",
  reference_no: "",
  bank_name: "",
  cheque_date: "",
  slip_date: "",
  bank_account_id: "",
  destination_category: "",
  destination_party_id: "",
  clearing_date: "",
  source_payment_id: "",
  cheque_type: "",
  cheque_no: "",
  cheque_account_id: "",
});
const methodLabel = (value) =>
  ({ cash: "Cash", cheque: "Cheque", self_cheque: "Self Cheque", slip: "Slip", online: "Online" })[value] ||
  value ||
  "-";

export default function Payments() {
  const { showToast } = useToast();
  const tableScrollRef = useRef(null);
  const [customers, setCustomers] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [banks, setBanks] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [allPayments, setAllPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    party_type: "",
    method: "",
    date_from: "",
    date_to: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clearanceTarget, setClearanceTarget] = useState(null);

  const loadPayments = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [customerRows, supplierRows, paymentRows, referenceResponse, accountRows] =
        await Promise.all([
          fetchCustomers(),
          fetchSuppliers(),
          fetchPayments(appliedFilters),
          fetchMyReferenceData(),
          fetchBankAccounts(),
        ]);
      setCustomers(Array.isArray(customerRows) ? customerRows : []);
      setSuppliers(Array.isArray(supplierRows) ? supplierRows : []);
      setPayments(Array.isArray(paymentRows) ? paymentRows : []);
      const allRows = await fetchPayments({});
      setAllPayments(Array.isArray(allRows) ? allRows : (Array.isArray(paymentRows) ? paymentRows : []));
      setBanks(
        Array.isArray(referenceResponse?.reference_data?.bank_names)
          ? referenceResponse.reference_data.bank_names
          : [],
      );
      setBankAccounts(Array.isArray(accountRows) ? accountRows : []);
    } catch (e) {
      setPayments([]);
      setLoadError(errorMessage(e, "Could not load payments"));
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const totals = useMemo(
    () =>
      payments.reduce(
        (acc, payment) => {
          acc.count += 1;
          if (payment.party_type === "customer")
            acc.customer += Number(payment.amount || 0);
          if (payment.party_type === "supplier")
            acc.supplier += Number(payment.amount || 0);
          return acc;
        },
        { count: 0, customer: 0, supplier: 0 },
      ),
    [payments],
  );
  const totalPages = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const pagePayments = payments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const parties = form.party_type === "customer" ? customers : suppliers;
  const partyOptions = useMemo(
    () =>
      parties.map((party) => ({
        value: String(party._id),
        label:
          party[
            form.party_type === "customer" ? "customer_name" : "supplier_name"
          ] || "Unnamed account",
      })),
    [parties, form.party_type],
  );
  const usedInstrumentIds = useMemo(() => new Set(allPayments.filter((payment) => payment.party_type === "supplier" && payment.source_payment_id).map((payment) => String(payment.source_payment_id))), [allPayments]);
  const pendingInstruments = useMemo(() => allPayments.filter((payment) => payment.party_type === "customer" && (payment.method === "cheque" || payment.method === "slip") && payment.payment_id && !payment.bank_account_id && !payment.source_payment_id && (!usedInstrumentIds.has(String(payment.payment_id)) || String(payment.payment_id) === String(form.source_payment_id))), [allPayments, usedInstrumentIds, form.source_payment_id]);
  const isIssuedInstrument = (payment) => {
    if (!["cheque", "slip", "self_cheque"].includes(payment.method)) return false;
    if (payment.source === "invoice" || payment.source_payment_id || payment.bank_account_id) return true;
    return payment.party_type !== "customer" || usedInstrumentIds.has(String(payment.payment_id));
  };
  const selfIssued = useMemo(() => new Set(allPayments.filter((payment) => payment.cheque_type === "self" && payment.cheque_account_id && payment.cheque_no).map((payment) => `${payment.cheque_account_id}:${payment.cheque_no}`)), [allPayments]);
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  const openAddModal = () => {
    setForm(emptyForm());
    setEditingPayment(null);
    setPaymentModalOpen(true);
  };
  const closeAddModal = () => {
    if (!isSaving) setPaymentModalOpen(false);
  };
  const openEditModal = (payment) => {
    setEditingPayment(payment);
    setForm({
      ...emptyForm(),
      party_type: payment.party_type || "customer",
      party_id: payment.party_id || "",
      payment_date: payment.payment_date || today(),
      method: payment.method || "cash",
      amount: payment.amount ?? "",
      reference_no: payment.reference_no || "",
      bank_name: payment.bank_name || "",
      cheque_date: payment.cheque_date || "",
      slip_date: payment.slip_date || "",
      bank_account_id: payment.bank_account_id || "",
      destination_category: payment.destination_category || "",
      destination_party_id: payment.destination_party_id || "",
      clearing_date: payment.clearing_date || "",
      source_payment_id: payment.source_payment_id || "",
      cheque_type: payment.cheque_type || "",
      cheque_no: payment.cheque_no || (payment.method === "self_cheque" ? payment.reference_no || "" : ""),
      cheque_account_id: payment.cheque_account_id || "",
    });
    setDetailsTarget(null);
    setActiveMenu(null);
    setPaymentModalOpen(true);
  };
  const recordId = (payment) => payment.source === "party" ? payment.payment_id : String(payment.id || "").replace(/^invoice-/, "");
  const applyFilters = () => {
    setAppliedFilters(filters);
    setCurrentPage(1);
    setIsFilterOpen(false);
    tableScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  const resetFilters = () => {
    const clean = { party_type: "", method: "", date_from: "", date_to: "" };
    setFilters(clean);
    setAppliedFilters(clean);
    setCurrentPage(1);
    setIsFilterOpen(false);
  };

  const submitPayment = async () => {
    if (!form.party_id) {
      showToast({
        type: "error",
        message: `Select a ${form.party_type} first`,
      });
      return;
    }
    if (Number(form.amount || 0) <= 0) {
      showToast({
        type: "error",
        message: "Payment amount must be greater than zero",
      });
      return;
    }
    if (form.party_type === "customer" && form.method === "online" && !form.bank_account_id) { showToast({ type: "error", message: "Select a destination bank account for online payment" }); return; }
    if (form.method === "self_cheque" && (!form.cheque_account_id || !form.cheque_no)) { showToast({ type: "error", message: "Select self cheque account and cheque number" }); return; }
    if (form.party_type === "supplier" && (form.method === "cheque" || form.method === "slip") && !form.source_payment_id) { showToast({ type: "error", message: "Select a pending cheque/slip" }); return; }
    if (form.method === "online" && form.destination_category === "supplier" && !form.destination_party_id) { showToast({ type: "error", message: "Select a destination supplier" }); return; }
    setIsSaving(true);
    try {
      const payload = {
        payment_date: form.payment_date,
        method: form.method,
        amount: Number(form.amount || 0),
        reference_no: form.method === "cash" ? "" : form.reference_no,
        bank_name: form.method === "cheque" ? form.bank_name : "",
        cheque_date: form.method === "cheque" || form.method === "self_cheque" ? form.cheque_date : "",
        slip_date: form.method === "slip" ? form.slip_date : "",
        bank_account_id: form.method !== "cash" && form.method !== "self_cheque" ? form.bank_account_id : "",
        cheque_type: form.method === "self_cheque" ? "self" : "",
        cheque_no: form.method === "self_cheque" ? form.cheque_no : "",
        cheque_account_id: form.method === "self_cheque" ? form.cheque_account_id : "",
        source_payment_id: form.party_type === "supplier" && (form.method === "cheque" || form.method === "slip") ? form.source_payment_id : "",
        clearing_date: form.method === "cheque" || form.method === "slip" ? form.clearing_date : "",
      };
      if (editingPayment) {
        const id = recordId(editingPayment);
        editingPayment.source === "invoice"
          ? await updateInvoicePayment(id, payload)
          : await updatePayment(id, { ...payload, party_type: form.party_type, party_id: form.party_id });
      } else {
        form.party_type === "customer"
          ? await createCustomerPayment(form.party_id, payload)
          : await createSupplierPayment(form.party_id, payload);
      }
      showToast({
        type: "success",
        message:
          form.party_type === "customer"
            ? `Customer payment ${editingPayment ? "updated" : "saved"}`
            : `Supplier payment ${editingPayment ? "updated" : "saved"}`,
      });
      setPaymentModalOpen(false);
      setEditingPayment(null);
      setForm(emptyForm());
      await loadPayments();
    } catch (e) {
      showToast({
        type: "error",
        message: errorMessage(e, "Could not save payment"),
      });
    } finally {
      setIsSaving(false);
    }
  };
  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const id = recordId(deleteTarget);
      deleteTarget.source === "invoice" ? await deleteInvoicePayment(id) : await deletePayment(id);
      setDeleteTarget(null);
      showToast({ type: "success", message: "Payment deleted successfully" });
      await loadPayments();
    } catch (e) {
      showToast({ type: "error", message: errorMessage(e, "Could not delete payment") });
    } finally {
      setIsDeleting(false);
    }
  };

  const filterConfig = [
    {
      label: "Type",
      type: "select",
      value: filters.party_type,
      options: [
        { label: "All", value: "" },
        { label: "Customer", value: "customer" },
        { label: "Supplier", value: "supplier" },
      ],
      onChange: (value) =>
        setFilters((current) => ({ ...current, party_type: value })),
    },
    {
      label: "Method",
      type: "select",
      value: filters.method,
      options: [
        { label: "All", value: "" },
        { label: "Cash", value: "cash" },
        { label: "Cheque", value: "cheque" },
        { label: "Slip", value: "slip" },
        { label: "Online", value: "online" },
      ],
      onChange: (value) =>
        setFilters((current) => ({ ...current, method: value })),
    },
    {
      label: "From Date",
      type: "date",
      value: filters.date_from,
      onChange: (e) =>
        setFilters((current) => ({ ...current, date_from: e.target.value })),
    },
    {
      label: "To Date",
      type: "date",
      value: filters.date_to,
      onChange: (e) =>
        setFilters((current) => ({ ...current, date_to: e.target.value })),
    },
  ];

  const dataState = isLoading ? (
    <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-gray-500">
      <Loader2 size={18} className="animate-spin" /> Loading payments...
    </div>
  ) : loadError ? (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-6 text-center">
      <AlertTriangle size={24} className="text-amber-500" />
      <div>
        <p className="text-sm font-semibold text-gray-800">
          Payments unavailable
        </p>
        <p className="mt-1 text-sm text-gray-500">{loadError}</p>
      </div>
      <button
        onClick={loadPayments}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-semibold"
      >
        <RefreshCw size={15} /> Retry
      </button>
    </div>
  ) : null;

  return (
    <>
      <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col">
        <PageHeader
          title="Payments"
          subtitle="Record and review customer receipts and supplier payments."
          actionLabel="Add Payment"
          actionIcon={Plus}
          onAction={openAddModal}
        />
        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <StatCard
            label="Payment Entries"
            value={totals.count}
            icon={ReceiptText}
          />
          <StatCard
            label="Customer Received"
            value={money(totals.customer)}
            icon={CircleDollarSign}
            variant="success"
          />
          <StatCard
            label="Supplier Paid"
            value={money(totals.supplier)}
            icon={CreditCard}
            variant="warning"
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-gray-300 bg-white">
          <TableToolbar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onFilter={() => setIsFilterOpen(true)}
          />
          {dataState || (
            <>
              <div className="grid gap-2 overflow-auto p-3 md:hidden">
                {pagePayments.length ? (
                  pagePayments.map((payment) => (
                    <PaymentCard key={payment.id} payment={payment} onClick={() => setDetailsTarget(payment)} />
                  ))
                ) : (
                  <div className="py-16 text-center text-sm text-gray-400">
                    No payments found.
                  </div>
                )}
              </div>
              <div
                ref={tableScrollRef}
                className="hidden flex-1 overflow-auto md:block"
              >
                <table className="w-full min-w-[900px] text-left">
                  <thead
                    className="sticky top-0 z-20 bg-gray-100"
                    style={{ boxShadow: "0 1px 0 0 rgba(209,213,219,1)" }}
                  >
                    <tr className="text-sm text-gray-500">
                      <th className="px-5 py-3.5">Id</th>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Account</th>
                      <th className="px-5 py-3.5">Type</th>
                      <th className="px-5 py-3.5">Method</th>
                      <th className="px-5 py-3.5">Reff No</th>
                      <th className="px-5 py-3.5">Details</th>
                      <th className="px-5 py-3.5 text-right">Amount</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pagePayments.length ? (
                      pagePayments.map((payment, index) => (
                        <tr key={payment.id} onClick={() => setDetailsTarget(payment)} className="cursor-pointer hover:bg-teal-50/40">
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {(currentPage - 1) * PAGE_SIZE + index + 1}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">
                            {payment.payment_date || "-"}
                          </td>
                          <td className="px-5 py-4 text-sm font-semibold text-gray-800">
                            {payment.party_name || "-"}
                          </td>
                          <td className="px-5 py-4 text-sm capitalize text-gray-600">
                            {payment.party_type}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-700">
                            {methodLabel(payment.method)}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">
                            {payment.reference_no || "-"}
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-500">
                            {detailsOf(payment)}
                          </td>
                          <td className="px-5 py-4 text-right text-sm font-bold text-teal-800">
                            {money(payment.amount)}
                          </td>
                          <td className="relative px-5 py-4 text-right"><button onClick={(event) => { event.stopPropagation(); setActiveMenu(activeMenu === payment.id ? null : payment.id); }} className="p-2 text-gray-400"><MoreVertical size={18}/></button><ContextMenu isOpen={activeMenu === payment.id}><button onClick={(event) => { event.stopPropagation(); setDetailsTarget(payment); setActiveMenu(null); }} className="flex w-full gap-3 px-3 py-2.5 text-sm"><Edit3 size={16}/> View Details</button>{isIssuedInstrument(payment) && <button onClick={(event) => { event.stopPropagation(); setClearanceTarget(payment); setActiveMenu(null); }} className="flex w-full gap-3 px-3 py-2.5 text-sm"><ReceiptText size={16}/> Clearance</button>}<button onClick={(event) => { event.stopPropagation(); openEditModal(payment); }} className="flex w-full gap-3 px-3 py-2.5 text-sm"><Edit3 size={16}/> Edit Payment</button><button onClick={(event) => { event.stopPropagation(); setDeleteTarget(payment); setActiveMenu(null); }} className="flex w-full gap-3 px-3 py-2.5 text-sm text-red-600"><Trash2 size={16}/> Delete Payment</button></ContextMenu></td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={9}
                          className="py-16 text-center text-sm text-gray-400"
                        >
                          No payments found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={closeAddModal}
        form={form}
        set={set}
        setForm={setForm}
        partyOptions={partyOptions}
        banks={banks}
        customers={customers}
        suppliers={suppliers}
        accounts={bankAccounts}
        pendingInstruments={pendingInstruments}
        selfIssued={selfIssued}
        onSubmit={submitPayment}
        isSaving={isSaving}
        isEditing={Boolean(editingPayment)}
        isInvoicePayment={editingPayment?.source === "invoice"}
      />
      <PaymentDetailsModal isOpen={Boolean(detailsTarget)} payment={detailsTarget} onClose={() => setDetailsTarget(null)} showClearance={Boolean(detailsTarget && isIssuedInstrument(detailsTarget))} onClearance={(payment) => setClearanceTarget(payment)} onEdit={(payment) => openEditModal(payment)} onDelete={(payment) => setDeleteTarget(payment)} />
      <PaymentClearanceModal isOpen={Boolean(clearanceTarget)} payment={clearanceTarget} accounts={bankAccounts} banks={banks} onClose={() => setClearanceTarget(null)} />
      <FilterDrawer
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filterConfig}
        onApply={applyFilters}
        onReset={resetFilters}
      />
      <ConfirmModal isOpen={Boolean(deleteTarget)} onClose={() => { if (!isDeleting) setDeleteTarget(null); }} onConfirm={confirmDelete} isLoading={isDeleting} closeOnConfirm={false} title="Delete Payment" message={`Are you sure you want to delete this ${deleteTarget?.party_type || ""} payment of ${deleteTarget?.amount ?? ""}?`} confirmText="Delete" variant="danger" />
    </>
  );
}

function PaymentModal({
  isOpen,
  onClose,
  form,
  set,
  setForm,
  partyOptions,
  banks,
  customers,
  suppliers,
  accounts,
  pendingInstruments,
  selfIssued,
  onSubmit,
  isSaving,
  isEditing,
  isInvoicePayment,
}) {
  const method = form.method || "cash";
  const lockedAmount = form.party_type === "supplier" && (method === "cheque" || method === "slip");
  const availablePendingMethods = new Set(pendingInstruments.map((payment) => payment.method));
  const methodOptions = form.party_type === "supplier"
    ? [
      { value: "cash", label: "Cash" },
      ...(availablePendingMethods.has("cheque") ? [{ value: "cheque", label: "Cheque" }] : []),
      ...(availablePendingMethods.has("slip") ? [{ value: "slip", label: "Slip" }] : []),
      { value: "online", label: "Online" },
      { value: "self_cheque", label: "Self Cheque" },
    ]
    : [{ value: "cash", label: "Cash" }, { value: "cheque", label: "Cheque" }, { value: "slip", label: "Slip" }, { value: "online", label: "Online" }];
  const pendingOptions = pendingInstruments.filter((payment) => payment.method === method).map((payment) => ({ value: payment.payment_id, label: `${payment.party_name || "Customer"} · ${payment.bank_name || ""} · ${payment.reference_no || payment.cheque_no || "No ref"} · ${payment.amount}` }));
  const selectedInstrument = pendingInstruments.find((payment) => String(payment.payment_id) === String(form.source_payment_id));
  const supplierInstrument = form.party_type === "supplier" && (method === "cheque" || method === "slip");
  useEffect(() => {
    if (form.party_type === "supplier" && (method === "cheque" || method === "slip") && pendingOptions.length === 0) {
      setForm((current) => ({ ...current, method: "cash", source_payment_id: "", amount: "", reference_no: "", bank_name: "", cheque_date: "" }));
    }
  }, [form.party_type, method, pendingOptions.length, setForm]);
  const selfAccounts = accounts.filter((account) => account.category === "self" && account.isActive !== false);
  const selfAccountOptions = selfAccounts.map((account) => ({ value: account._id, label: `${account.account_title}${account.bank_name ? ` · ${account.bank_name}` : ""}` }));
  const selectedSelfAccount = selfAccounts.find((account) => account._id === form.cheque_account_id);
  const serialStart = Number(selectedSelfAccount?.cheque_serial_start); const serialEnd = Number(selectedSelfAccount?.cheque_serial_end);
  const serialOptions = selectedSelfAccount && Number.isFinite(serialStart) && Number.isFinite(serialEnd) && serialEnd >= serialStart && serialEnd - serialStart <= 5000 ? Array.from({ length: serialEnd - serialStart + 1 }, (_, index) => String(serialStart + index)).filter((serial) => !selfIssued.has(`${selectedSelfAccount._id}:${serial}`)).map((serial) => ({ value: serial, label: serial })) : [];
  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? undefined : onClose}
      maxWidth="max-w-2xl"
      title="Add Payment"
      subtitle={isEditing ? "Edit customer receipt or supplier payment" : "Enter customer receipt or supplier payment"}
      footer={
        <div className="flex gap-3">
          <Button
            outline
            variant="secondary"
            onClick={onClose}
            disabled={isSaving}
            className="w-1/3"
          >
            Discard
          </Button>
          <Button
            icon={Save}
            className="grow"
            onClick={onSubmit}
            loading={isSaving}
            disabled={isSaving}
          >
            {isEditing ? "Update Payment" : "Save Payment"}
          </Button>
        </div>
      }
    >
      <form
        className="grid grid-cols-1 gap-3.5 p-0.5 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <Select
          label="Account Type"
          disabled={isInvoicePayment}
          value={form.party_type}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              party_type: value,
              party_id: "", method: "cash", source_payment_id: "", cheque_account_id: "", cheque_no: "", destination_category: "", destination_party_id: "", bank_account_id: "", clearing_date: "",
            }))
          }
          options={[
            { value: "customer", label: "Customer" },
            { value: "supplier", label: "Supplier" },
          ]}
        />
        <Select
          label={form.party_type === "customer" ? "Customer" : "Supplier"}
          disabled={isInvoicePayment}
          value={form.party_id}
          onChange={(value) => set("party_id", value)}
          options={partyOptions}
          placeholder={`Select ${form.party_type}`}
        />
        <Select
          label="Method"
          value={method}
          onChange={(value) => setForm((current) => ({ ...current, method: value, destination_category: value === "online" ? "self" : "" , destination_party_id: "", bank_account_id: "" }))}
          options={methodOptions}
        />
        {supplierInstrument && pendingOptions.length > 0 && <Select label={`${method === "cheque" ? "Pending Cheque" : "Pending Slip"}`} value={form.source_payment_id} onChange={(value) => { const source = pendingInstruments.find((payment) => payment.payment_id === value); setForm((current) => ({ ...current, source_payment_id: value, amount: source?.amount ?? current.amount, reference_no: source?.reference_no || source?.cheque_no || current.reference_no, bank_name: source?.bank_name || current.bank_name, cheque_date: source?.cheque_date || current.cheque_date, slip_date: source?.slip_date || current.slip_date })); }} options={pendingOptions} placeholder={`Select pending ${method}`} />}
        <Input
          label="Payment Date"
          type="date"
          value={form.payment_date}
          onChange={(e) => set("payment_date", e.target.value)}
        />
        {!supplierInstrument && <Input label="Amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" readOnly={lockedAmount} />}
        {supplierInstrument && <><Input label="Amount" type="number" value={selectedInstrument?.amount ?? form.amount} readOnly className="opacity-65" /><Input label="Reff No" value={selectedInstrument?.reference_no || selectedInstrument?.cheque_no || form.reference_no} readOnly className="opacity-65" />{method === "cheque" ? <Input label="Cheque Date" type="date" value={selectedInstrument?.cheque_date || form.cheque_date} readOnly className="opacity-65" /> : <Input label="Slip Date" type="date" value={selectedInstrument?.slip_date || form.slip_date} readOnly className="opacity-65" />}</>}
        {!supplierInstrument && method !== "cash" && method !== "self_cheque" && (
          <Input
            label="Reff No"
            value={form.reference_no}
            onChange={(e) => set("reference_no", e.target.value)}
          />
        )}
        {method === "self_cheque" && <><Select label="Self Cheque Account" value={form.cheque_account_id} onChange={(value) => setForm((current) => ({ ...current, cheque_account_id: value, cheque_no: "" }))} options={selfAccountOptions} placeholder="Select self account" /><Select label="Reff No / Cheque No" value={form.cheque_no} onChange={(value) => set("cheque_no", value)} options={serialOptions} placeholder="Select cheque no" /><Input label="Cheque Date" type="date" value={form.cheque_date} onChange={(e) => set("cheque_date", e.target.value)} /></>}
        {method === "cheque" && form.party_type !== "supplier" && (
          <Select
            label="Bank"
            value={form.bank_name}
            onChange={(value) => set("bank_name", value)}
            options={(banks || []).map((bank) => ({
              value: bank,
              label: bank,
            }))}
            placeholder="Select bank"
          />
        )}
        {method === "cheque" && form.party_type !== "supplier" && (
          <Input
            label="Cheque Date"
            type="date"
            value={form.cheque_date}
            onChange={(e) => set("cheque_date", e.target.value)}
          />
        )}
        {method === "slip" && form.party_type !== "supplier" && (
          <Input
            label="Slip Date"
            type="date"
            value={form.slip_date}
            onChange={(e) => set("slip_date", e.target.value)}
          />
        )}
        <PaymentDestinationFields partyType={form.party_type} method={method} accounts={accounts} customers={customers} suppliers={suppliers} destinationCategory={form.destination_category} destinationPartyId={form.destination_party_id} destinationAccountId={form.bank_account_id} clearingDate={form.clearing_date} onChange={(changes) => setForm((current) => ({ ...current, ...(changes.destinationCategory !== undefined ? { destination_category: changes.destinationCategory } : {}), ...(changes.destinationPartyId !== undefined ? { destination_party_id: changes.destinationPartyId } : {}), ...(changes.destinationAccountId !== undefined ? { bank_account_id: changes.destinationAccountId } : {}), ...(changes.clearingDate !== undefined ? { clearing_date: changes.clearingDate } : {}) }))} />
        <button
          type="submit"
          className="hidden"
          aria-hidden="true"
          disabled={isSaving}
        />
      </form>
    </Modal>
  );
}

function PaymentCard({ payment, onClick }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left">
      <div className="flex justify-between gap-3">
        <div>
          <p className="font-bold text-gray-900">{payment.party_name || "-"}</p>
          <p className="text-xs capitalize text-gray-500">
            {payment.party_type} · {methodLabel(payment.method)} ·{" "}
            {payment.payment_date || "-"}
          </p>
        </div>
        <b className="text-sm text-teal-800">{money(payment.amount)}</b>
      </div>
      <div className="mt-3 flex justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
        <span>Reff No</span>
        <span className="font-semibold text-gray-700">
          {payment.reference_no || "-"}
        </span>
      </div>
    </button>
  );
}

function detailsOf(payment) {
  if (payment.method === "cheque" || payment.method === "self_cheque")
    return (
      [payment.bank_name, payment.cheque_date].filter(Boolean).join(" / ") ||
      "-"
    );
  if (payment.method === "slip") return payment.slip_date || "-";
  if (payment.source === "invoice") return "Invoice payment";
  return "-";
}
