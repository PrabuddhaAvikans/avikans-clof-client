import { FieldArray, useFormikContext } from "formik";
import { Link } from "react-router-dom";
import { PackagePlus, SlidersHorizontal, Trash2 } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { FormikInput } from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { SalesFormSection } from "@/features/sales/components/SalesFormSection";
import { cn } from "@/lib/utils";
import {
  computeLineAmounts,
  computeQuotationTotals,
  type QuotationLineItemFormValues,
} from "@/features/sales/schemas/quotationSchema";
import { getChangedSpecDiffs } from "@/lib/quotationCustomization";
import { lineNeedsManufacturing } from "@/lib/productManufacturing";
import { getAppCountryConfig } from "@/lib/countryConfig";
import { formatCurrency } from "@/lib/format";
import type { QuotationProductCustomization } from "@/types/quotation";
import { QuotationCustomizationStatus } from "@/types/status";
import { StatusBadge } from "@/components/ui/StatusBadge";

type LineItemFormValues = {
  lineItems: QuotationLineItemFormValues[];
  discountAmount?: number;
};

interface QuotationLineItemsTableProps {
  onAddProduct: () => void;
  onCustomizeLine?: (index: number) => void;
  title?: string;
  description?: string;
  emptyHint?: string;
  className?: string;
  showFulfillment?: boolean;
}

export function QuotationLineItemsTable({
  onAddProduct,
  onCustomizeLine,
  title = "Line Items",
  description = "Add products with quantity, unit price, discounts, and tax rates. Use Customize for customer-specific configurations without changing the master product.",
  emptyHint = "Add products to set quantities, prices, and tax.",
  className,
  showFulfillment = false,
}: QuotationLineItemsTableProps) {
  const { values, errors, submitCount } = useFormikContext<LineItemFormValues>();
  const documentTotals = computeQuotationTotals(
    values.lineItems,
    values.discountAmount ?? 0,
  );
  const lineItemsError =
    submitCount > 0 && typeof errors.lineItems === "string" ? errors.lineItems : undefined;
  const isEmpty = values.lineItems.length === 0;

  const lineTotals = values.lineItems.map((item) => computeLineAmounts(item));
  const linesExclVat = lineTotals.reduce((sum, line) => sum + line.net, 0);
  const linesInclVat = lineTotals.reduce((sum, line) => sum + line.total, 0);
  const hasAdditionalDiscount = documentTotals.discountAmount > 0;
  const { taxName, currency } = getAppCountryConfig();

  return (
    <SalesFormSection
      title={title}
      description={description}
      className={className}
      action={
        isEmpty ? undefined : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 text-[11px] text-primary"
            leftIcon={<PackagePlus className="h-4 w-4" aria-hidden />}
            onClick={onAddProduct}
          >
            Add Product
          </Button>
        )
      }
    >
      {isEmpty ? (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-md border border-dashed bg-muted/40 px-4 py-8 text-center",
            lineItemsError ? "border-destructive/40" : "border-border",
          )}
        >
          <p className={cn("text-sm font-medium", lineItemsError ? "text-destructive" : "text-foreground")}>
            {lineItemsError ?? "No products yet"}
          </p>
          <p className="mt-1 max-w-xs text-[12px] text-muted-foreground">
            {emptyHint}
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="mt-3"
            leftIcon={<PackagePlus className="h-4 w-4" aria-hidden />}
            onClick={onAddProduct}
          >
            Add Product
          </Button>
        </div>
      ) : (
        <FieldArray name="lineItems">
          {({ remove }) => (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2">Product</th>
                  <th className="py-1.5 pr-2">Qty</th>
                  <th className="py-1.5 pr-2 text-right">Unit Price</th>
                  <th className="py-1.5 pr-2 text-right">Discount %</th>
                  <th className="py-1.5 pr-2 text-right">Tax %</th>
                  <th className="py-1.5 pr-2 text-right">Excl. {taxName}</th>
                  <th className="py-1.5 pr-2 text-right">{taxName}</th>
                  <th className="py-1.5 pr-2 text-right">Line Total</th>
                  <th className="py-1.5" />
                </tr>
              </thead>
              <tbody>
                {values.lineItems.map((item, index) => {
                    const amounts = computeLineAmounts(item);
                    const customization = item.customization as
                      | QuotationProductCustomization
                      | undefined;
                    const changedSpecs =
                      item.isCustomized && customization
                        ? getChangedSpecDiffs(
                            customization.base.specifications,
                            customization.customizedSpecifications,
                          )
                        : [];

                    return (
                      <tr
                        key={`${item.productId}-${index}`}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-1.5 pr-2">
                          <Link
                            to={ROUTES.products.detail(item.productId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-primary hover:underline"
                          >
                            {item.productName}
                          </Link>
                          <p className="text-[10px] text-muted-foreground">
                            {item.productSku}
                            {item.productVersionLabel
                              ? ` · ${item.productVersionLabel}`
                              : ""}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {item.isCustomized ? (
                              <>
                                <MappedStatusBadge
                                  statusMap={QuotationCustomizationStatus}
                                  value={customization?.status ?? "draft"}
                                  dot
                                />
                                <span className="text-[10px] text-amber-700">
                                  Customized
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                Standard
                              </span>
                            )}
                            {showFulfillment && (
                              <StatusBadge
                                variant={
                                  lineNeedsManufacturing(item) ? "warning" : "success"
                                }
                                size="sm"
                              >
                                {lineNeedsManufacturing(item)
                                  ? "Needs manufacturing"
                                  : "Existing product"}
                              </StatusBadge>
                            )}
                            {onCustomizeLine && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-[10px] text-blue-600"
                                leftIcon={<SlidersHorizontal className="h-3 w-3" />}
                                onClick={() => onCustomizeLine(index)}
                              >
                                {item.isCustomized ? "Edit Customization" : "Customize"}
                              </Button>
                            )}
                          </div>
                          {changedSpecs.length > 0 && (
                            <ul className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                              {changedSpecs.slice(0, 4).map((diff) => (
                                <li key={diff.key}>
                                  {diff.label}: {diff.originalValue} →{" "}
                                  <span className="text-foreground">
                                    {diff.customizedValue}
                                  </span>
                                </li>
                              ))}
                              {changedSpecs.length > 4 && (
                                <li>+{changedSpecs.length - 4} more</li>
                              )}
                            </ul>
                          )}
                        </td>
                        <td className="w-24 min-w-[6rem] py-1.5 pr-2">
                          <FormikInput
                            name={`lineItems.${index}.quantity`}
                            type="number"
                            size="sm"
                            inputClassName="text-right tabular-nums"
                          />
                        </td>
                        <td className="w-32 min-w-[7.5rem] py-1.5 pr-2">
                          <FormikInput
                            name={`lineItems.${index}.unitPrice`}
                            type="number"
                            step="0.01"
                            size="sm"
                            inputClassName="min-w-[6rem] text-right tabular-nums"
                          />
                        </td>
                        <td className="w-24 min-w-[5.5rem] py-1.5 pr-2">
                          <FormikInput
                            name={`lineItems.${index}.discountPercent`}
                            type="number"
                            size="sm"
                            inputClassName="text-right tabular-nums"
                          />
                        </td>
                        <td className="w-24 min-w-[5.5rem] py-1.5 pr-2">
                          <FormikInput
                            name={`lineItems.${index}.taxPercent`}
                            type="number"
                            size="sm"
                            inputClassName="text-right tabular-nums"
                          />
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(amounts.net, currency)}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums text-muted-foreground">
                          {formatCurrency(amounts.tax, currency)}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums font-medium">
                          {formatCurrency(amounts.total, currency)}
                        </td>
                        <td className="py-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              {values.lineItems.length > 0 && (
                <tfoot>
                  <tr className="border-t border-border bg-muted/30 text-[11px] font-medium">
                    <td colSpan={5} className="py-2 pr-2 text-right text-muted-foreground">
                      Lines total
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {formatCurrency(linesExclVat, currency)}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {formatCurrency(lineTotals.reduce((sum, line) => sum + line.tax, 0), currency)}
                    </td>
                    <td className="py-2 pr-2 text-right tabular-nums">
                      {formatCurrency(linesInclVat, currency)}
                    </td>
                    <td />
                  </tr>
                  {hasAdditionalDiscount && (
                    <tr className="text-[10px] text-muted-foreground">
                      <td colSpan={9} className="pb-2 pt-1 text-right">
                        Additional discount of{" "}
                        {formatCurrency(documentTotals.discountAmount, currency)} is applied in the
                        order summary below.
                      </td>
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </div>
        )}
      </FieldArray>
      )}
    </SalesFormSection>
  );
}
