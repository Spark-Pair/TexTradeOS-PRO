import { useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import Button from "../Button";
import Input from "../Input";
import Modal from "../Modal";
import Select from "../Select";
import { fetchMyReferenceData } from "../../api/business";
import PaymentDestinationFields from "../PaymentDestinationFields";
import { fetchBankAccounts, fetchSuppliers } from "../../api/commerce";

const today = () => new Date().toISOString().slice(0, 10);
const initialPayment = () => ({
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
});

export default function PartyPaymentModal({
  isOpen,
  onClose,
  party,
  type = "customer",
  onSubmit,
  isLoading = false,
}) {
  const [payment, setPayment] = useState(initialPayment);
  const [banks, setBanks] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const isCustomer = type === "customer";
  const method = payment.method || "cash";
  const name = party?.[isCustomer ? "customer_name" : "supplier_name"] || "";
  const set = (key, value) =>
    setPayment((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (isOpen) setPayment(initialPayment());
  }, [isOpen, party?._id]);
  useEffect(() => {
    if (!isOpen) return;
    Promise.all([fetchMyReferenceData(), fetchBankAccounts(), fetchSuppliers()]).then(([referenceResponse, accountRows, supplierRows]) => { setBanks(Array.isArray(referenceResponse?.reference_data?.bank_names) ? referenceResponse.reference_data.bank_names : []); setAccounts(Array.isArray(accountRows) ? accountRows : []); setSuppliers(Array.isArray(supplierRows) ? supplierRows : []); }).catch(() => { setBanks([]); setAccounts([]); setSuppliers([]); });
  }, [isOpen]);

  const save = () =>
    onSubmit?.({
      ...payment,
      amount: Number(payment.amount || 0),
      reference_no: method === "cash" ? "" : payment.reference_no,
      bank_name: method === "cheque" ? payment.bank_name : "",
      cheque_date: method === "cheque" ? payment.cheque_date : "",
      slip_date: method === "slip" ? payment.slip_date : "",
      bank_account_id: method === "cash" ? "" : payment.bank_account_id,
      clearing_date: method === "cheque" || method === "slip" ? payment.clearing_date : "",
    });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCustomer ? "Customer Payment" : "Supplier Payment"}
      subtitle={name}
      footer={
        <div className="flex gap-3">
          <Button
            outline
            onClick={onClose}
            disabled={isLoading}
            className="w-32"
          >
            Cancel
          </Button>
          <Button
            icon={isLoading ? Loader2 : CreditCard}
            onClick={save}
            disabled={isLoading}
            className="grow"
          >
            {isLoading ? "Saving..." : "Save Payment"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            label="Payment Date"
            type="date"
            value={payment.payment_date}
            onChange={(e) => set("payment_date", e.target.value)}
          />
          <Input
            label="Amount"
            type="number"
            min="0"
            step="0.01"
            value={payment.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0.00"
          />
          <Select
            label="Payment Method"
            value={method}
            onChange={(value) => setPayment((current) => ({ ...current, method: value, destination_category: value === "online" ? "self" : "", destination_party_id: "", bank_account_id: "" }))}
            options={[
              { value: "cash", label: "Cash" },
              { value: "cheque", label: "Cheque" },
              { value: "slip", label: "Slip" },
              { value: "online", label: "Online" },
            ]}
          />
        </div>
        {method !== "cash" && (
          <Input
            label="Reff No"
            value={payment.reference_no}
            onChange={(e) => set("reference_no", e.target.value)}
          />
        )}
        {method === "cheque" && (
          <div className="grid gap-3 md:grid-cols-2">
            <Select
              label="Bank"
              value={payment.bank_name}
              onChange={(value) => set("bank_name", value)}
              options={banks.map((bank) => ({ value: bank, label: bank }))}
              placeholder="Select bank"
            />
            <Input
              label="Cheque Date"
              type="date"
              value={payment.cheque_date}
              onChange={(e) => set("cheque_date", e.target.value)}
            />
          </div>
        )}
        {method === "slip" && (
          <Input
            label="Slip Date"
            type="date"
            value={payment.slip_date}
            onChange={(e) => set("slip_date", e.target.value)}
          />
        )}
        <PaymentDestinationFields method={method} accounts={accounts} suppliers={suppliers} destinationCategory={payment.destination_category} destinationPartyId={payment.destination_party_id} destinationAccountId={payment.bank_account_id} clearingDate={payment.clearing_date} onChange={(changes) => setPayment((current) => ({ ...current, ...(changes.destinationCategory !== undefined ? { destination_category: changes.destinationCategory } : {}), ...(changes.destinationPartyId !== undefined ? { destination_party_id: changes.destinationPartyId } : {}), ...(changes.destinationAccountId !== undefined ? { bank_account_id: changes.destinationAccountId } : {}), ...(changes.clearingDate !== undefined ? { clearing_date: changes.clearingDate } : {}) }))} />
      </div>
    </Modal>
  );
}
