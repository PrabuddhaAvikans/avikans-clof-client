import { useFormikContext } from "formik";
import { ClipboardCheck, Factory, Truck } from "lucide-react";
import { Button, StatusBadge } from "@/components/ui";
import { QuotationTotalsSummary } from "@/features/sales/components/QuotationTotalsSummary";
import { computeQuotationTotals } from "@/features/sales/schemas/quotationSchema";
import type { SalesOrderFormValues } from "@/features/sales/schemas/salesOrderSchema";
import { Priority } from "@/types/status";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="max-w-[62%] truncate text-right text-[12px] font-medium text-foreground">
        {value || "-"}
      </dd>
    </div>
  );
}

export function SalesOrderFormPreview() {
  const { values } = useFormikContext<SalesOrderFormValues>();
  const totals = computeQuotationTotals(values.lineItems, values.discountAmount ?? 0);
  const priorityLabel = Priority[values.priority as keyof typeof Priority]?.label ?? values.priority;
  const address = values.deliveryAddress;

  return (
    <aside className="space-y-3">
      <section className="rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Order Preview
        </p>
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {values.customerName || "Select customer"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {values.lineItems.length} line item{values.lineItems.length === 1 ? "" : "s"}
            </p>
          </div>
          <StatusBadge variant="info" size="sm">
            New
          </StatusBadge>
        </div>

        <dl className="mt-3">
          <Row label="Priority" value={priorityLabel} />
          <Row label="Delivery Date" value={values.requestedDeliveryDate ?? ""} />
          <Row
            label="Manufacturing"
            value={values.requiresManufacturing ? "Required" : "Not required"}
          />
          <Row
            label="Ship To"
            value={[address?.city, address?.country].filter(Boolean).join(", ")}
          />
        </dl>

        <div className="mt-3 border-t border-border pt-3">
          <QuotationTotalsSummary totals={totals} compact />
        </div>
      </section>

      <section className="space-y-1.5 rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </p>
        <Button type="button" variant="outline" size="sm" className="h-8 w-full justify-start text-[12px]" leftIcon={<ClipboardCheck className="h-3.5 w-3.5" />}>
          Continue to Review
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 w-full justify-start text-[12px]" leftIcon={<Truck className="h-3.5 w-3.5" />}>
          Plan Delivery
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 w-full justify-start text-[12px]" leftIcon={<Factory className="h-3.5 w-3.5" />}>
          Create Manufacturing Job
        </Button>
      </section>
    </aside>
  );
}
