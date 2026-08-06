import type { QuotationTotalsBreakdown } from "@/features/sales/schemas/quotationSchema";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface QuotationTotalsSummaryProps {
  totals: QuotationTotalsBreakdown;
  currency?: string;
  className?: string;
  compact?: boolean;
}

function SummaryRow({
  label,
  value,
  emphasize,
  negative,
  muted,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  negative?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3",
        emphasize && "border-t border-border pt-2 text-sm font-semibold",
      )}
    >
      <dt className={emphasize ? "text-foreground" : "text-muted-foreground"}>{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          emphasize && "font-semibold text-foreground",
          negative && "text-red-600",
          muted && !emphasize && "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function QuotationTotalsSummary({
  totals,
  currency = "LKR",
  className,
  compact = false,
}: QuotationTotalsSummaryProps) {
  const textSize = compact ? "text-[12px]" : "text-sm";
  const showAdditionalDiscount = totals.discountAmount > 0;
  const subtotalLabel = showAdditionalDiscount
    ? "Subtotal after item discounts (excl. VAT)"
    : "Subtotal (excl. VAT)";

  return (
    <dl className={cn("space-y-1.5", textSize, className)}>
      <SummaryRow
        label={subtotalLabel}
        value={formatCurrency(totals.subtotal, currency)}
        muted
      />
      {showAdditionalDiscount ? (
        <SummaryRow
          label="Additional discount"
          value={`-${formatCurrency(totals.discountAmount, currency)}`}
          negative
        />
      ) : null}
      {showAdditionalDiscount ? (
        <SummaryRow
          label="Amount (excl. VAT)"
          value={formatCurrency(totals.taxableAmount, currency)}
          muted
        />
      ) : null}
      <SummaryRow label="VAT" value={formatCurrency(totals.taxAmount, currency)} />
      <SummaryRow
        label="Total (incl. VAT)"
        value={formatCurrency(totals.totalAmount, currency)}
        emphasize
      />
    </dl>
  );
}
