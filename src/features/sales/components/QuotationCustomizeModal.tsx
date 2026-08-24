import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getVersionById } from "@/lib/productVersion";
import {
  applyCustomizationChanges,
  buildSpecDiffs,
  createCustomizationFromVersion,
  CUSTOMIZABLE_SPEC_FIELDS,
  finalizeCustomizationEstimation,
  type CustomizableSpecKey,
} from "@/lib/quotationCustomization";
import type { Product, ProductSpecifications } from "@/types/product";
import type { QuotationProductCustomization } from "@/types/quotation";
import { QuotationCustomizationStatus } from "@/types/status";
import type { QuotationLineItemFormValues } from "@/features/sales/schemas/quotationSchema";

export type QuotationCustomizeModalProps = {
  open: boolean;
  product: Product | null;
  versionId: string;
  quantity: number;
  unitPrice: number;
  /** When editing an existing customized line. */
  existingCustomization?: QuotationProductCustomization | null;
  onClose: () => void;
  onSave: (line: QuotationLineItemFormValues) => void;
};

function isNumericSpecKey(key: CustomizableSpecKey): boolean {
  return (
    key === "diameterMm" ||
    key === "lengthMm" ||
    key === "widthMm" ||
    key === "heightMm" ||
    key === "wattage"
  );
}

export function QuotationCustomizeModal({
  open,
  product,
  versionId,
  quantity,
  unitPrice,
  existingCustomization,
  onClose,
  onSave,
}: QuotationCustomizeModalProps) {
  const [customization, setCustomization] =
    useState<QuotationProductCustomization | null>(null);
  const [qty, setQty] = useState(quantity);
  const [sellingPrice, setSellingPrice] = useState(unitPrice);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !product) return;

    if (existingCustomization) {
      setCustomization(existingCustomization);
      setSellingPrice(existingCustomization.estimation.sellingPrice);
      setNotes(existingCustomization.notes ?? "");
      setQty(quantity);
      return;
    }

    const version = getVersionById(product, versionId);
    if (!version) return;

    setCustomization(
      createCustomizationFromVersion(product, version, {
        sellingPrice: unitPrice,
      }),
    );
    setSellingPrice(unitPrice);
    setQty(quantity);
    setNotes("");
  }, [open, product, versionId, unitPrice, quantity, existingCustomization]);

  const diffs = useMemo(() => {
    if (!customization) return [];
    return buildSpecDiffs(
      customization.base.specifications,
      customization.customizedSpecifications,
    );
  }, [customization]);

  const changedCount = diffs.filter((d) => d.changed).length;

  if (!product || !customization) return null;

  const updateSpec = (key: CustomizableSpecKey, raw: string) => {
    const nextSpecs: ProductSpecifications = {
      ...customization.customizedSpecifications,
    };

    if (raw === "") {
      delete nextSpecs[key];
    } else if (isNumericSpecKey(key)) {
      (nextSpecs as Record<string, unknown>)[key] = Number(raw);
    } else {
      (nextSpecs as Record<string, unknown>)[key] = raw;
    }

    setCustomization(
      applyCustomizationChanges(customization, {
        customizedSpecifications: nextSpecs,
        sellingPrice,
        notes,
      }),
    );
  };

  const updateOperationHours = (operationId: string, hours: number) => {
    const customizedOperations = customization.customizedOperations.map((op) =>
      op.id === operationId ? { ...op, estimatedHours: Math.max(0, hours) } : op,
    );
    setCustomization(
      applyCustomizationChanges(customization, {
        customizedOperations,
        sellingPrice,
        notes,
      }),
    );
  };

  const updateBomQuantity = (bomId: string, quantityValue: number) => {
    const customizedBom = customization.customizedBom.map((item) => {
      if (item.id !== bomId) return item;
      const qtyVal = Math.max(0, quantityValue);
      const requiredQuantity = qtyVal * (1 + (item.wastePercent || 0) / 100);
      return {
        ...item,
        quantity: qtyVal,
        requiredQuantity,
        lineCost: requiredQuantity * item.unitCost,
      };
    });
    setCustomization(
      applyCustomizationChanges(customization, {
        customizedBom,
        sellingPrice,
        notes,
      }),
    );
  };

  const handleSave = () => {
    const estimated = finalizeCustomizationEstimation(customization, sellingPrice);
    const ready = {
      ...estimated,
      notes: notes || estimated.notes,
    };

    onSave({
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      description: product.description,
      productVersionId: ready.base.productVersionId,
      productVersionLabel: ready.base.productVersionLabel,
      quantity: qty,
      unitPrice: sellingPrice,
      discountPercent: 0,
      taxPercent: 18,
      isCustomized: true,
      customization: ready,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Customize Product"
      size="xl"
      className="max-h-[90vh]"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave}>
            Save Customization
          </Button>
        </>
      }
    >
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              {product.name}{" "}
              <span className="text-muted-foreground">
                · {customization.base.productVersionLabel}
              </span>
            </p>
            <p className="text-[12px] text-muted-foreground">
              Quotation-level configuration. Master product is not modified.
            </p>
          </div>
          <MappedStatusBadge
            statusMap={QuotationCustomizationStatus}
            value={customization.status}
            dot
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Quantity"
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          />
          <Input
            label="Selling Price"
            type="number"
            min={0}
            step={0.01}
            value={sellingPrice}
            onChange={(e) => {
              const next = Math.max(0, Number(e.target.value) || 0);
              setSellingPrice(next);
              setCustomization(
                applyCustomizationChanges(customization, { sellingPrice: next, notes }),
              );
            }}
          />
          <div className="rounded-md border border-border bg-muted/20 px-3 py-2 text-[12px]">
            <p className="text-muted-foreground">Estimated cost</p>
            <p className="text-sm font-medium tabular-nums">
              {formatCurrency(customization.estimation.costPrice)}
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Margin {formatPercent(customization.estimation.marginPercent)} · Profit{" "}
              {formatCurrency(customization.estimation.expectedProfit)}
            </p>
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-foreground">
              Specifications
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {changedCount} field{changedCount === 1 ? "" : "s"} changed
            </span>
          </div>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[640px] text-[12px]">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2">Original Value</th>
                  <th className="px-3 py-2">Customized Value</th>
                </tr>
              </thead>
              <tbody>
                {CUSTOMIZABLE_SPEC_FIELDS.map(({ key, label }) => {
                  const diff = diffs.find((d) => d.key === key)!;
                  const customValue =
                    customization.customizedSpecifications[key] ?? "";
                  return (
                    <tr
                      key={key}
                      className={`border-b border-border last:border-0 ${
                        diff.changed ? "bg-amber-50/40" : ""
                      }`}
                    >
                      <td className="px-3 py-1.5 font-medium text-foreground">
                        {label}
                      </td>
                      <td className="px-3 py-1.5 text-muted-foreground">
                        {diff.originalValue}
                        {diff.changed && customValue !== "" && (
                          <span className="ml-1 text-muted-foreground">→</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <Input
                          type={isNumericSpecKey(key) ? "number" : "text"}
                          className="h-8"
                          value={customValue === undefined || customValue === null ? "" : String(customValue)}
                          onChange={(e) => updateSpec(key, e.target.value)}
                          placeholder={diff.originalValue === "-" ? undefined : String(diff.originalValue)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {customization.customizedBom.length > 0 && (
          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-foreground">
              Components / Materials
            </h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[520px] text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Component</th>
                    <th className="px-3 py-2">Original Qty</th>
                    <th className="px-3 py-2">Customized Qty</th>
                    <th className="px-3 py-2 text-right">Line Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {customization.customizedBom.map((item, index) => {
                    const original = customization.base.bom[index];
                    const changed = original && original.quantity !== item.quantity;
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-border last:border-0 ${
                          changed ? "bg-amber-50/40" : ""
                        }`}
                      >
                        <td className="px-3 py-1.5">
                          <p className="font-medium">{item.inventoryItemName}</p>
                          <p className="text-[10px] text-muted-foreground">{item.sku}</p>
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {original?.quantity ?? "-"} {item.unit}
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            className="h-8 w-24"
                            value={item.quantity}
                            onChange={(e) =>
                              updateBomQuantity(item.id, Number(e.target.value) || 0)
                            }
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right tabular-nums">
                          {formatCurrency(item.lineCost)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {customization.customizedOperations.length > 0 && (
          <section>
            <h3 className="mb-2 text-[13px] font-semibold text-foreground">
              Manufacturing Operations
            </h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[520px] text-[12px]">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2">Operation</th>
                    <th className="px-3 py-2">Workstation</th>
                    <th className="px-3 py-2">Original Hours</th>
                    <th className="px-3 py-2">Customized Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {customization.customizedOperations.map((op, index) => {
                    const original = customization.base.operations[index];
                    const changed =
                      original && original.estimatedHours !== op.estimatedHours;
                    return (
                      <tr
                        key={op.id}
                        className={`border-b border-border last:border-0 ${
                          changed ? "bg-amber-50/40" : ""
                        }`}
                      >
                        <td className="px-3 py-1.5 font-medium">{op.name}</td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {op.workstation || "-"}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">
                          {original?.estimatedHours ?? "-"}
                        </td>
                        <td className="px-3 py-1.5">
                          <Input
                            type="number"
                            min={0}
                            step={0.1}
                            className="h-8 w-24"
                            value={op.estimatedHours}
                            onChange={(e) =>
                              updateOperationHours(op.id, Number(e.target.value) || 0)
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <Textarea
          label="Customization Notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Customer-specific requirements, mounting notes, etc."
        />

        {customization.approval.required && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            This customization changes cost or margin enough to require approval
            after estimation (Draft → Estimated → Pending Approval → Approved).
          </p>
        )}
      </div>
    </Modal>
  );
}
