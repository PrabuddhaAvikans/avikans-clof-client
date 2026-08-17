import { formatCurrency } from "@/lib/format";
import {
  getTaxBreakdownLines,
  resolveEffectiveTaxRate,
} from "@/lib/countryConfig";
import { cn } from "@/lib/utils";

type TaxBreakdownRowsProps = {
  taxAmount: number;
  taxableAmount: number;
  currency: string;
  country?: string;
  className?: string;
};

/** Renders country-configured tax lines (e.g. VAT, or SGST + CGST). */
export function TaxBreakdownRows({
  taxAmount,
  taxableAmount,
  currency,
  country,
  className,
}: TaxBreakdownRowsProps) {
  if (taxAmount <= 0) return null;

  const effectiveRate = resolveEffectiveTaxRate(taxAmount, taxableAmount, country);
  const lines = getTaxBreakdownLines(taxAmount, effectiveRate, country);

  return (
    <>
      {lines.map((line) => (
        <div key={line.code} className={cn("flex justify-between gap-2", className)}>
          <dt className="text-muted-foreground">{line.label}</dt>
          <dd className="tabular-nums font-medium">
            {formatCurrency(line.amount, currency)}
          </dd>
        </div>
      ))}
    </>
  );
}
