import { useFormikContext } from "formik";
import { FileText, Send, Eye } from "lucide-react";
import { Button, StatusBadge } from "@/components/ui";
import { QuotationTotalsSummary } from "@/features/sales/components/QuotationTotalsSummary";
import {
  computeLineAmounts,
  computeQuotationTotals,
  type QuotationFormValues,
} from "@/features/sales/schemas/quotationSchema";
import { formatCurrency } from "@/lib/format";
import { Priority } from "@/types/status";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="max-w-[62%] truncate text-right text-[12px] font-medium text-foreground">
        {value || "—"}
      </dd>
    </div>
  );
}

export function QuotationFormPreview() {
  const { values } = useFormikContext<QuotationFormValues>();
  const totals = computeQuotationTotals(values.lineItems, values.discountAmount ?? 0);
  const priorityLabel = Priority[values.priority as keyof typeof Priority]?.label ?? values.priority;

  return (
    <aside className="space-y-3">
      <section className="rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quotation Preview
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
          <StatusBadge variant="warning" size="sm">
            Draft
          </StatusBadge>
        </div>

        <dl className="mt-3">
          <Row label="Quote Date" value={values.quoteDate} />
          <Row label="Valid Until" value={values.validUntil} />
          <Row label="Priority" value={priorityLabel} />
        </dl>

        <div className="mt-3 border-t border-border pt-3">
          <QuotationTotalsSummary totals={totals} compact />
        </div>

        {values.lineItems.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
            {values.lineItems.slice(0, 5).map((item, index) => {
              const lineTotal = computeLineAmounts(item).total;
              return (
              <li key={`${item.productId}-${index}`} className="text-[11px]">
                <p className="truncate font-medium text-foreground">{item.productName}</p>
                <p className="text-muted-foreground">
                  Qty {item.quantity} · {formatCurrency(lineTotal, "LKR")}
                </p>
              </li>
            );
            })}
            {values.lineItems.length > 5 && (
              <li className="text-[10px] text-muted-foreground">
                +{values.lineItems.length - 5} more
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="space-y-1.5 rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </p>
        <Button type="button" variant="outline" size="sm" className="h-8 w-full justify-start text-[12px]" leftIcon={<Eye className="h-3.5 w-3.5" />}>
          Preview as Customer
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 w-full justify-start text-[12px]" leftIcon={<FileText className="h-3.5 w-3.5" />}>
          Duplicate Quotation
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-8 w-full justify-start text-[12px]" leftIcon={<Send className="h-3.5 w-3.5" />}>
          Email Customer
        </Button>
      </section>
    </aside>
  );
}
