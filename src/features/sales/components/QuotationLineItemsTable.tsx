import { FieldArray, useFormikContext } from "formik";
import { Plus, Trash2 } from "lucide-react";
import { FormikInput } from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { SalesFormSection } from "@/features/sales/components/SalesFormSection";
import {
  computeLineAmounts,
  computeQuotationTotals,
  type QuotationLineItemFormValues,
} from "@/features/sales/schemas/quotationSchema";
import { getAppCountryConfig } from "@/lib/countryConfig";
import { formatCurrency } from "@/lib/format";

type LineItemFormValues = {
  lineItems: QuotationLineItemFormValues[];
  discountAmount?: number;
};

interface QuotationLineItemsTableProps {
  onAddProduct: () => void;
  title?: string;
  description?: string;
}

export function QuotationLineItemsTable({
  onAddProduct,
  title = "Line Items",
  description = "Add products with quantity, unit price, discounts, and tax rates.",
}: QuotationLineItemsTableProps) {
  const { values, errors } = useFormikContext<LineItemFormValues>();
  const documentTotals = computeQuotationTotals(
    values.lineItems,
    values.discountAmount ?? 0,
  );

  const lineTotals = values.lineItems.map((item) => computeLineAmounts(item));
  const linesExclVat = lineTotals.reduce((sum, line) => sum + line.net, 0);
  const linesInclVat = lineTotals.reduce((sum, line) => sum + line.total, 0);
  const hasAdditionalDiscount = documentTotals.discountAmount > 0;
  const { taxName, currency } = getAppCountryConfig();

  return (
    <SalesFormSection
      title={title}
      description={description}
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-blue-600"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={onAddProduct}
        >
          Add Product
        </Button>
      }
    >
      {typeof errors.lineItems === "string" && (
        <p className="mb-2 text-[12px] text-red-600">{errors.lineItems}</p>
      )}
      <FieldArray name="lineItems">
        {({ remove }) => (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-[12px]">
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
                {values.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-6 text-center text-muted-foreground">
                      No products added yet.
                    </td>
                  </tr>
                ) : (
                  values.lineItems.map((item, index) => {
                    const amounts = computeLineAmounts(item);
                    return (
                      <tr
                        key={`${item.productId}-${index}`}
                        className="border-b border-border last:border-0"
                      >
                        <td className="py-1.5 pr-2">
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-[10px] text-muted-foreground">{item.productSku}</p>
                        </td>
                        <td className="py-1.5 pr-2">
                          <FormikInput
                            name={`lineItems.${index}.quantity`}
                            type="number"
                            className="w-20"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <FormikInput
                            name={`lineItems.${index}.unitPrice`}
                            type="number"
                            step="0.01"
                            className="w-28"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <FormikInput
                            name={`lineItems.${index}.discountPercent`}
                            type="number"
                            className="w-16"
                          />
                        </td>
                        <td className="py-1.5 pr-2">
                          <FormikInput
                            name={`lineItems.${index}.taxPercent`}
                            type="number"
                            className="w-16"
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
                  })
                )}
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
    </SalesFormSection>
  );
}
