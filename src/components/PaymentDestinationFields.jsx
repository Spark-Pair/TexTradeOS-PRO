import Select from "./Select";
import Input from "./Input";

export default function PaymentDestinationFields({ method, partyType = "customer", accounts = [], suppliers = [], customers = [], destinationCategory = "self", destinationPartyId = "", destinationAccountId = "", clearingDate = "", onChange }) {
  const supplierSource = partyType === "supplier" && method === "online";
  if (method === "cash" || method === "self_cheque" || (partyType === "supplier" && !supplierSource)) return null;
  const required = method === "online";
  const categoryOptions = supplierSource ? [{ value: "self", label: "Self Account" }, { value: "customer", label: "Customer Account" }] : required ? [{ value: "self", label: "Self" }, { value: "supplier", label: "Supplier" }] : [{ value: "", label: "No destination account" }, { value: "self", label: "Self" }, { value: "supplier", label: "Supplier" }];
  const supplierOptions = suppliers.map((supplier) => ({ value: String(supplier._id), label: supplier.supplier_name || "Unnamed supplier" }));
  const customerOptions = customers.map((customer) => ({ value: String(customer._id), label: customer.customer_name || "Unnamed customer" }));
  const partyOptions = supplierSource ? customerOptions : supplierOptions;
  const destinationAccounts = accounts.filter((account) => account.isActive !== false && (destinationCategory === "self" ? account.category === "self" : account.category === (supplierSource ? "customer" : "supplier") && String(account.party_id) === String(destinationPartyId)));
  const accountOptions = destinationAccounts.map((account) => ({ value: account._id, label: `${account.account_title}${account.bank_name ? ` · ${account.bank_name}` : ""}` }));
  return <div className="md:col-span-2 grid gap-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-3 md:grid-cols-2">
    <Select label={`${supplierSource ? "Source" : "Destination"} Type${required ? "" : " (Optional)"}`} value={destinationCategory} onChange={(value) => onChange({ destinationCategory: value, destinationPartyId: "", destinationAccountId: "" })} options={categoryOptions} />
    {destinationCategory === (supplierSource ? "customer" : "supplier") && <Select label={supplierSource ? "Customer" : "Supplier"} value={destinationPartyId} onChange={(value) => onChange({ destinationPartyId: value, destinationAccountId: "" })} options={partyOptions} placeholder={`Select ${supplierSource ? "customer" : "supplier"}`} />}
    {destinationCategory && <Select label={`${supplierSource ? "Source" : "Destination"} Account${required ? "" : " (Optional)"}`} value={destinationAccountId} onChange={(value) => onChange({ destinationAccountId: value })} options={accountOptions} placeholder="Select account" />}
    {(method === "cheque" || method === "slip") && destinationCategory && <Input label="Clearing Date" type="date" value={clearingDate} onChange={(event) => onChange({ clearingDate: event.target.value })} required={false} />}
  </div>;
}
