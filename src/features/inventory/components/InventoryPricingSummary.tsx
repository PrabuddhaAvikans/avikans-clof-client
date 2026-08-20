import { useMemo } from "react";
import { useFormikContext } from "formik";
import {
  calculateMarginPercent,
  calculateProfit,
  calculateSellingPrice,
} from "@/lib/inventoryPricing";
import { formatCurrency } from "@/lib/format";
import type { InventoryFormValues } from "@/features/inventory/schemas/inventorySchema";
import { PricingMethodLabels } from "@/types/inventory";

export function InventoryPricingSummary() {
  const { values } = useFormikContext<InventoryFormValues>();

  const computed = useMemo(() => {
    const costPrice = Number(values.costPrice) || 0;
    const sellingPrice =
      values.pricingMethod === "manual"
        ? Number(values.sellingPrice) || 0
        : calculateSellingPrice(
            costPrice,
            values.pricingMethod,
            Number(values.markupPercent) || 0,
            Number(values.markupFixedAmount) || 0,
            Number(values.sellingPrice) || 0,
          );
    const profit = calculateProfit(costPrice, sellingPrice);
    const marginPercent = calculateMarginPercent(costPrice, sellingPrice);

    return { costPrice, sellingPrice, profit, marginPercent };
  }, [values]);

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <h4 className="mb-3 text-sm font-medium text-foreground">Pricing Summary</h4>
      <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Cost Price (BOM)</dt>
          <dd className="font-medium">{formatCurrency(computed.costPrice, "LKR")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Selling Price</dt>
          <dd className="font-medium">{formatCurrency(computed.sellingPrice, "LKR")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Profit</dt>
          <dd className="font-medium">{formatCurrency(computed.profit, "LKR")}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Margin</dt>
          <dd className="font-medium">{computed.marginPercent.toFixed(1)}%</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Method: {PricingMethodLabels[values.pricingMethod]} · Cost price is never used as selling
        price for direct sales.
      </p>
    </div>
  );
}
