import { Fragment, useMemo } from "react";
import { FieldArray, useFormikContext } from "formik";
import { Plus, Trash2 } from "lucide-react";
import { FormikCheckbox, FormikInput, FormikTextarea } from "@/components/forms";
import { Button } from "@/components/ui/Button";
import type { ProductFormSchemaValues } from "@/features/products/schemas/productSchema";
import {
  calculateLineCost,
  calculateRequiredQuantity,
  calculateTotalMaterialCost,
} from "@/lib/bomCosting";
import { formatCurrency } from "@/lib/format";
import type { BomItem } from "@/types/product";

type ProductBomEditorProps = {
  readOnly?: boolean;
  currency?: string;
  onAddItem?: () => void;
};

export function ProductBomEditor({
  readOnly = false,
  currency = "LKR",
  onAddItem,
}: ProductBomEditorProps) {
  const { values } = useFormikContext<ProductFormSchemaValues>();

  const totalMaterialCost = useMemo(
    () =>
      calculateTotalMaterialCost(
        values.bom.map((line) => ({
          requiredQuantity: calculateRequiredQuantity(
            Number(line.quantity) || 0,
            Number(line.wastePercent) || 0,
          ),
          unitCost: Number(line.unitCost) || 0,
        })),
      ),
    [values.bom],
  );

  if (readOnly) {
    const bom = values.bom as unknown as BomItem[];
    return (
      <ProductBomReadOnlyTable bom={bom} currency={currency} totalMaterialCost={totalMaterialCost} />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          BOM uses inventory cost price for manufacturing costing - not selling price.
        </p>
        {onAddItem && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={onAddItem}
          >
            Add Component
          </Button>
        )}
      </div>

      <FieldArray name="bom">
        {({ remove }) =>
          values.bom.length === 0 ? (
            <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              No BOM components yet. Add inventory items to define materials.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[980px] text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left uppercase tracking-wide text-muted-foreground">
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Component</th>
                    <th className="w-24 min-w-[6rem] px-2 py-2">Qty</th>
                    <th className="px-2 py-2">Unit</th>
                    <th className="w-24 min-w-[5.5rem] whitespace-nowrap px-2 py-2">Waste %</th>
                    <th className="px-2 py-2">Required Qty</th>
                    <th className="px-2 py-2">Cost Price</th>
                    <th className="px-2 py-2">Line Cost</th>
                    <th className="px-2 py-2">Req.</th>
                    <th className="px-2 py-2">Notes</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {values.bom.map((line, index) => {
                    const requiredQty = calculateRequiredQuantity(
                      Number(line.quantity) || 0,
                      Number(line.wastePercent) || 0,
                    );
                    const lineCost = calculateLineCost(requiredQty, Number(line.unitCost) || 0);

                    return (
                      <tr key={`${line.inventoryItemId}-${index}`} className="border-b border-border align-top">
                        <td className="px-2 py-2 text-muted-foreground">{index + 1}</td>
                        <td className="px-2 py-2">
                          <div className="font-medium text-foreground">{line.inventoryItemName}</div>
                          <div className="text-muted-foreground">{line.sku}</div>
                        </td>
                        <td className="w-24 min-w-[6rem] px-2 py-2">
                          <FormikInput
                            name={`bom.${index}.quantity`}
                            type="number"
                            min={0.01}
                            step={0.01}
                            size="sm"
                            inputClassName="text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2">{line.unit}</td>
                        <td className="w-24 min-w-[5.5rem] px-2 py-2">
                          <FormikInput
                            name={`bom.${index}.wastePercent`}
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            size="sm"
                            inputClassName="text-right tabular-nums"
                          />
                        </td>
                        <td className="px-2 py-2 font-medium">{requiredQty.toFixed(2)}</td>
                        <td className="px-2 py-2">{formatCurrency(line.unitCost ?? 0, currency)}</td>
                        <td className="px-2 py-2 font-medium">{formatCurrency(lineCost, currency)}</td>
                        <td className="px-2 py-2">
                          <FormikCheckbox name={`bom.${index}.isRequired`} label="" />
                        </td>
                        <td className="min-w-[120px] px-2 py-2">
                          <FormikTextarea name={`bom.${index}.notes`} rows={1} />
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => remove(index)}
                            aria-label="Remove BOM line"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </FieldArray>

      <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Total Material Cost: </span>
        <span className="font-semibold text-foreground">{formatCurrency(totalMaterialCost, currency)}</span>
      </div>
    </div>
  );
}

type ProductBomReadOnlyTableProps = {
  bom: BomItem[];
  currency: string;
  totalMaterialCost: number;
  onApproveAlternative?: (lineId: string, alternativeId: string) => void;
};

export function ProductBomReadOnlyTable({
  bom,
  currency,
  totalMaterialCost,
  onApproveAlternative,
}: ProductBomReadOnlyTableProps) {
  if (bom.length === 0) {
    return <p className="text-sm text-muted-foreground">No BOM lines defined for this version.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Component</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2">Unit</th>
              <th className="px-3 py-2 text-right">Waste %</th>
              <th className="px-3 py-2 text-right">Required Qty</th>
              <th className="px-3 py-2 text-right">Cost Price</th>
              <th className="px-3 py-2 text-right">Line Cost</th>
              <th className="px-3 py-2">Required</th>
              <th className="px-3 py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {bom.map((line) => (
              <Fragment key={line.id}>
                <tr className="border-b border-border align-top">
                  <td className="px-3 py-2 text-muted-foreground">{line.sequence}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{line.inventoryItemName}</div>
                    <div className="text-xs text-muted-foreground">{line.sku}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{line.quantity}</td>
                  <td className="px-3 py-2">{line.unit}</td>
                  <td className="px-3 py-2 text-right">{line.wastePercent}%</td>
                  <td className="px-3 py-2 text-right font-medium">{line.requiredQuantity.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(line.unitCost, currency)}</td>
                  <td className="px-3 py-2 text-right font-medium">{formatCurrency(line.lineCost, currency)}</td>
                  <td className="px-3 py-2">{line.isRequired ? "Yes" : "Optional"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{line.notes ?? "-"}</td>
                </tr>
                {line.alternatives.length > 0 && (
                  <tr className="border-b border-border bg-muted/10">
                    <td colSpan={10} className="px-3 py-2">
                      <div className="text-xs font-medium text-muted-foreground">Alternatives</div>
                      <div className="mt-1 space-y-1">
                        {line.alternatives.map((alt) => (
                          <div
                            key={alt.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-border bg-card px-2 py-1.5 text-xs"
                          >
                            <div>
                              <span className="font-medium">{alt.inventoryItemName}</span>
                              <span className="ml-2 text-muted-foreground">{alt.sku}</span>
                              <span className="ml-2">{formatCurrency(alt.unitCost, currency)}</span>
                              {alt.notes && (
                                <span className="ml-2 text-muted-foreground">- {alt.notes}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={alt.isApproved ? "text-green-600" : "text-amber-600"}>
                                {alt.isApproved ? "Approved" : "Pending approval"}
                              </span>
                              {!alt.isApproved && onApproveAlternative && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => onApproveAlternative(line.id, alt.id)}
                                >
                                  Approve
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Total Material Cost: </span>
        <span className="font-semibold">{formatCurrency(totalMaterialCost, currency)}</span>
      </div>
    </div>
  );
}

export function bomItemsToFormValues(
  bom: BomItem[],
): ProductFormSchemaValues["bom"] {
  return bom.map((item) => ({
    inventoryItemId: item.inventoryItemId,
    inventoryItemName: item.inventoryItemName,
    sku: item.sku,
    quantity: item.quantity,
    unit: item.unit,
    unitCost: item.unitCost,
    wastePercent: item.wastePercent,
    isRequired: item.isRequired,
    notes: item.notes ?? "",
    sequence: item.sequence,
    alternatives: item.alternatives.map(({ id: _id, ...alt }) => alt),
  }));
}
