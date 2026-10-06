import { useState } from "react";
import { useFormikContext } from "formik";
import { FileText, MapPin, Quote, UserRound } from "lucide-react";
import { Button, StatusBadge } from "@/components/ui";
import { toast } from "@/components/feedback/toast";
import { CustomerContactHistoryModal } from "@/features/customers/components/CustomerContactHistoryModal";
import { downloadCustomerCard } from "@/features/customers/lib/customerCardExport";
import type { CustomerFormValues } from "@/features/customers/schemas/customerSchema";
import { CUSTOMER_TYPE_OPTIONS } from "@/features/shared/components/CustomerSelectorModal";
import { formatCurrency } from "@/lib/format";
import { http } from "@/services/apiClient";
import { asRecord } from "@/services/mappers/common";
import { mapCustomer } from "@/services/mappers/customerMappers";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="max-w-[62%] truncate text-right text-[12px] font-medium text-foreground" title={value || "-"}>
        {value || "-"}
      </dd>
    </div>
  );
}

function formatAddress(address: { city: string; state: string; country: string } | undefined) {
  if (!address?.city) return "";
  return [address.city, address.state, address.country].filter(Boolean).join(", ");
}

export type CustomerFormPreviewProps = {
  customerId?: string;
  onCreateQuotation?: () => void;
  onManageAddresses?: () => void;
  createQuotationPending?: boolean;
};

export function CustomerFormPreview({
  customerId,
  onCreateQuotation,
  onManageAddresses,
  createQuotationPending = false,
}: CustomerFormPreviewProps) {
  const { values } = useFormikContext<CustomerFormValues>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const typeLabel =
    CUSTOMER_TYPE_OPTIONS.find((option) => option.value === values.type)?.label ?? values.type;
  const contactName = values.contactSameAsName
    ? values.name
    : values.contactPerson?.name;

  const billingActive =
    values.billingAddresses?.[values.activeBillingAddressIndex] ?? values.billingAddresses?.[0];

  const shipToAddress = values.deliverySameAsBilling
    ? billingActive
    : values.shippingAddresses?.[values.activeShippingAddressIndex ?? 0] ??
      values.shippingAddresses?.[0];

  const shipTo = formatAddress(shipToAddress);
  const hasCustomerId = Boolean(customerId);

  const handleViewContactHistory = () => {
    if (!customerId) {
      toast.info("Save the customer first to view contact history.");
      return;
    }
    setHistoryOpen(true);
  };

  const handleExportCustomerCard = async () => {
    if (!customerId) {
      toast.info("Save the customer first to export the customer card.");
      return;
    }

    setExporting(true);
    try {
      const customer = mapCustomer(
        asRecord(await http.get(`/api/customers/${customerId}`)),
      );
      downloadCustomerCard(customer);
      toast.success("Customer card exported.");
    } catch {
      toast.error("Failed to export customer card.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <aside className="space-y-3">
      <section className="rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Customer Preview
        </p>
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold tabular-nums text-foreground" title={values.code || "Customer #"}>
              {values.code || "Customer #"}
            </p>
            <p className="truncate text-sm font-semibold text-foreground" title={values.name || "Customer name"}>
              {values.name || "Customer name"}
            </p>
          </div>
          <StatusBadge
            variant={values.status === "active" ? "success" : "warning"}
            size="sm"
          >
            {values.status === "active" ? "Active" : "Inactive"}
          </StatusBadge>
        </div>

        <dl className="mt-3">
          <Row label="Type" value={typeLabel} />
          <Row label="Email" value={values.email} />
          <Row label="Phone" value={values.phone} />
          <Row label="Contact" value={contactName ?? ""} />
          <Row label="Billing" value={formatAddress(billingActive)} />
          <Row label="Ship To" value={shipTo} />
          <Row
            label="Credit Limit"
            value={
              values.creditLimit != null
                ? formatCurrency(Number(values.creditLimit), "LKR")
                : ""
            }
          />
          <Row
            label="Payment Terms"
            value={
              values.paymentTermsDays != null
                ? `${values.paymentTermsDays} days`
                : ""
            }
          />
        </dl>
      </section>

      <section className="space-y-1.5 rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-start text-[12px]"
          leftIcon={<Quote className="h-3.5 w-3.5" />}
          onClick={onCreateQuotation}
          disabled={!onCreateQuotation || createQuotationPending}
          loading={createQuotationPending}
        >
          Create Quotation
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-start text-[12px]"
          leftIcon={<UserRound className="h-3.5 w-3.5" />}
          onClick={handleViewContactHistory}
          disabled={!hasCustomerId}
        >
          View Contact History
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-start text-[12px]"
          leftIcon={<MapPin className="h-3.5 w-3.5" />}
          onClick={onManageAddresses}
          disabled={!onManageAddresses}
        >
          Manage Addresses
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-start text-[12px]"
          leftIcon={<FileText className="h-3.5 w-3.5" />}
          onClick={() => void handleExportCustomerCard()}
          disabled={!hasCustomerId || exporting}
          loading={exporting}
        >
          Export Customer Card
        </Button>
      </section>

      {customerId ? (
        <CustomerContactHistoryModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          customerId={customerId}
          customerName={values.name || undefined}
        />
      ) : null}
    </aside>
  );
}
