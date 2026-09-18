import { useMemo } from "react";
import { useFormikContext } from "formik";
import { CheckCircle2, Circle } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import type { InventoryFormValues } from "@/features/inventory/schemas/inventorySchema";
import {
  calculateMarginPercent,
  calculateProfit,
  calculateSellingPrice,
} from "@/lib/inventoryPricing";
import { deriveFormStockStatus } from "@/lib/inventorySku";
import { formatCurrency, formatNumber } from "@/lib/format";
import { InventoryItemTypeLabels, PricingMethodLabels } from "@/types/inventory";
import { StockStatus } from "@/types/status";
import { cn } from "@/lib/utils";

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

export function InventoryFormPreview() {
  const { values } = useFormikContext<InventoryFormValues>();
  const trackStock = values.trackStock !== false;
  const typeLabel = InventoryItemTypeLabels[values.itemType] ?? values.itemType;
  const stockStatus = deriveFormStockStatus(
    Number(values.quantityOnHand) || 0,
    Number(values.reorderLevel) || 0,
    trackStock,
  );

  const pricing = useMemo(() => {
    const costPrice = Number(values.costPrice) || 0;
    const sellingPrice = calculateSellingPrice(
      costPrice,
      values.pricingMethod,
      Number(values.markupPercent) || 0,
      Number(values.markupFixedAmount) || 0,
      Number(values.sellingPrice) || 0,
    );
    return {
      costPrice,
      sellingPrice,
      profit: calculateProfit(costPrice, sellingPrice),
      marginPercent: calculateMarginPercent(costPrice, sellingPrice),
    };
  }, [values]);

  const checks = [
    { label: "Identity", ok: Boolean(values.sku && values.name) },
    { label: "Type & unit", ok: Boolean(values.itemType && values.unit) },
    { label: "Category", ok: Boolean(values.category) },
    { label: "Warehouse", ok: Boolean(values.warehouse) },
    { label: "Cost price", ok: Number(values.costPrice) > 0 || Number(values.buyingPrice) > 0 },
    { label: "Selling price", ok: pricing.sellingPrice > 0 },
  ];
  const completeCount = checks.filter((check) => check.ok).length;

  return (
    <aside className="space-y-3">
      <section className="rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Item preview
        </p>
        <div className="mt-2 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold tabular-nums text-foreground">
              {values.sku || "SKU"}
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {values.name || "New inventory item"}
            </p>
          </div>
          <StatusBadge variant={values.status === "active" ? "success" : "neutral"} size="sm">
            {values.status === "active" ? "Active" : "Inactive"}
          </StatusBadge>
        </div>
        <dl className="mt-3">
          <Row label="Type" value={typeLabel} />
          <Row label="Unit" value={values.unit} />
          <Row label="Category" value={values.category} />
          <Row label="Warehouse" value={values.warehouse} />
          <Row label="Supplier" value={values.supplier ?? ""} />
        </dl>
      </section>

      <section className="rounded-md border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Stock
          </p>
          {trackStock ? (
            <MappedStatusBadge statusMap={StockStatus} value={stockStatus} dot />
          ) : (
            <StatusBadge variant="neutral" size="sm">
              Not tracked
            </StatusBadge>
          )}
        </div>
        <dl className="mt-2">
          <Row
            label="On hand"
            value={trackStock ? formatNumber(Number(values.quantityOnHand) || 0) : "—"}
          />
          <Row
            label="Reorder at"
            value={trackStock ? formatNumber(Number(values.reorderLevel) || 0) : "—"}
          />
        </dl>
      </section>

      <section className="rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Pricing
        </p>
        <dl className="mt-2">
          <Row label="Cost" value={formatCurrency(pricing.costPrice)} />
          <Row label="Selling" value={formatCurrency(pricing.sellingPrice)} />
          <Row label="Profit" value={formatCurrency(pricing.profit)} />
          <Row label="Margin" value={`${pricing.marginPercent.toFixed(1)}%`} />
          <Row label="Method" value={PricingMethodLabels[values.pricingMethod] ?? values.pricingMethod} />
        </dl>
      </section>

      <section className="rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Setup {completeCount}/{checks.length}
        </p>
        <ul className="mt-2 space-y-1.5">
          {checks.map((check) => (
            <li key={check.label} className="flex items-center gap-2 text-[12px]">
              {check.ok ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span className={cn(check.ok ? "text-foreground" : "text-muted-foreground")}>
                {check.label}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
