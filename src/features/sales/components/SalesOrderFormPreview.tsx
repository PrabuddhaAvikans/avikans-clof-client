import { useFormikContext } from "formik";
import { FormikInput } from "@/components/forms";
import { StatusBadge } from "@/components/ui";
import { QuotationTotalsSummary } from "@/features/sales/components/QuotationTotalsSummary";
import { computeQuotationTotals } from "@/features/sales/schemas/quotationSchema";
import type { SalesOrderFormValues } from "@/features/sales/schemas/salesOrderSchema";
import { formatDate } from "@/lib/format";
import { lineNeedsManufacturing } from "@/lib/productManufacturing";
import { Priority, type PriorityValue } from "@/types/status";

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

export function SalesOrderFormPreview() {
  const { values } = useFormikContext<SalesOrderFormValues>();
  const totals = computeQuotationTotals(values.lineItems, values.discountAmount ?? 0);
  const address = values.deliveryAddress;
  const shipTo = [address?.city, address?.country].filter(Boolean).join(", ");
  const manufactureCount = values.lineItems.filter(lineNeedsManufacturing).length;
  const manufacturingValue =
    values.lineItems.length === 0
      ? "Follows products"
      : manufactureCount === 0
        ? "Not required"
        : manufactureCount === values.lineItems.length
          ? "Required"
          : `Mixed · ${manufactureCount} need production`;

  return (
    <aside>
      <section className="rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Order Preview
        </p>
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p
              className="truncate text-sm font-semibold text-foreground"
              title={values.customerName || "Select customer"}
            >
              {values.customerName || "Select customer"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {values.lineItems.length} product{values.lineItems.length === 1 ? "" : "s"}
            </p>
          </div>
          <StatusBadge variant="info" size="sm">
            Draft
          </StatusBadge>
        </div>

        <dl className="mt-3">
          <Row
            label="Delivery Date"
            value={values.requestedDeliveryDate ? formatDate(values.requestedDeliveryDate) : "-"}
          />
          <Row
            label="Priority"
            value={
              Priority[values.priority as PriorityValue]?.label ??
              values.priority ??
              "-"
            }
          />
          <Row
            label="Manufacturing"
            value={manufacturingValue}
          />
          <Row label="Ship To" value={shipTo} />
        </dl>

        <div className="mt-3 border-t border-border pt-3">
          <FormikInput
            name="discountAmount"
            label="Additional Discount (LKR)"
            type="number"
            min={0}
            step={0.01}
          />
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <QuotationTotalsSummary totals={totals} compact />
        </div>
      </section>
    </aside>
  );
}
