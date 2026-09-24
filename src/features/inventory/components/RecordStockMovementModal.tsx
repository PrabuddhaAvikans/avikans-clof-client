import { useMemo } from "react";
import { toast } from "@/components/feedback/toast";
import {
  FormikError,
  FormikForm,
  FormikInput,
  FormikSearchableSelect,
  FormikTextarea,
} from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { toErrorMessage } from "@/app/store/async/types";
import { useRecordStockMovement } from "@/features/inventory/hooks/useInventory";
import {
  RECORDABLE_MOVEMENT_TYPES,
  previewStockChange,
} from "@/features/inventory/lib/stockMovements";
import {
  stockMovementFormSchema,
  type StockMovementFormValues,
} from "@/features/inventory/schemas/inventorySchema";
import type { InventoryItem, StockMovementTypeValue } from "@/types/inventory";

type RecordStockMovementModalProps = {
  open: boolean;
  onClose: () => void;
  items: InventoryItem[];
  initialItemId?: string;
  onRecorded: () => void;
};

const defaultValues: StockMovementFormValues = {
  inventoryItemId: "",
  type: "receipt",
  adjustmentDirection: "increase",
  quantity: 1,
  notes: "",
};

function StockStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
        {formatNumber(value)} {unit}
      </p>
    </div>
  );
}

export function RecordStockMovementModal({
  open,
  onClose,
  items,
  initialItemId = "",
  onRecorded,
}: RecordStockMovementModalProps) {
  const recordMovement = useRecordStockMovement();

  const itemOptions = useMemo(
    () =>
      items.map((item) => ({
        value: item.id,
        label: `${item.sku} - ${item.name}`,
      })),
    [items],
  );

  const initialValues = useMemo(
    (): StockMovementFormValues => ({
      ...defaultValues,
      inventoryItemId: initialItemId,
    }),
    [initialItemId],
  );

  const handleSubmit = async (values: StockMovementFormValues) => {
    const qty = Number(values.quantity) || 0;
    const quantity =
      values.type === "adjustment" && values.adjustmentDirection === "decrease" ? -qty : qty;

    try {
      await recordMovement.mutateAsync({
        inventoryItemId: values.inventoryItemId,
        type: values.type as StockMovementTypeValue,
        quantity,
        reference: values.notes
          ? { referenceType: "manual", referenceId: "manual", notes: values.notes }
          : undefined,
      });
      toast.success("Stock movement recorded");
      onRecorded();
      onClose();
    } catch (error) {
      toast.error(toErrorMessage(error));
    }
  };

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record stock movement"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="record-stock-movement" loading={recordMovement.isPending}>
            Record movement
          </Button>
        </>
      }
    >
      <FormikForm<StockMovementFormValues>
        id="record-stock-movement"
        className="space-y-4"
        initialValues={initialValues}
        enableReinitialize
        validationSchema={stockMovementFormSchema}
        onSubmit={handleSubmit}
      >
        {(formik) => {
          const selectedItem = items.find((item) => item.id === formik.values.inventoryItemId);
          const qty = Number(formik.values.quantity) || 0;
          const preview =
            selectedItem && qty > 0
              ? previewStockChange({
                  item: selectedItem,
                  type: formik.values.type as StockMovementTypeValue,
                  quantity: qty,
                  adjustmentDirection: formik.values.adjustmentDirection ?? "increase",
                })
              : null;

          return (
            <>
              <FormikSearchableSelect
                name="inventoryItemId"
                label="Item"
                required
                placeholder="Search by SKU or name"
                searchPlaceholder="Search items..."
                options={itemOptions}
              />

              {selectedItem && (
                <div className="grid grid-cols-3 gap-2">
                  <StockStat
                    label="On hand"
                    value={selectedItem.quantityOnHand}
                    unit={selectedItem.unit}
                  />
                  <StockStat
                    label="Available"
                    value={selectedItem.quantityAvailable}
                    unit={selectedItem.unit}
                  />
                  <StockStat
                    label="Reserved"
                    value={selectedItem.quantityReserved}
                    unit={selectedItem.unit}
                  />
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  What happened? <span className="text-destructive">*</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {RECORDABLE_MOVEMENT_TYPES.map((option) => {
                    const selected = formik.values.type === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => void formik.setFieldValue("type", option.value)}
                        className={cn(
                          "h-8 rounded-full border px-3 text-xs font-medium",
                          selected
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-card text-foreground hover:bg-muted",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {RECORDABLE_MOVEMENT_TYPES.find((option) => option.value === formik.values.type)
                    ?.description}
                </p>
                <FormikError name="type" className="mt-1" />
              </div>

              {formik.values.type === "adjustment" && (
                <div className="flex gap-1.5">
                  {(
                    [
                      { value: "increase", label: "Increase count" },
                      { value: "decrease", label: "Decrease count" },
                    ] as const
                  ).map((option) => {
                    const selected = formik.values.adjustmentDirection === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          void formik.setFieldValue("adjustmentDirection", option.value)
                        }
                        className={cn(
                          "h-8 flex-1 rounded-full border px-3 text-xs font-medium",
                          selected
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-card text-foreground hover:bg-muted",
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              )}

              <FormikInput
                name="quantity"
                label="Quantity"
                type="number"
                min={0}
                step={0.01}
                required
                hint={selectedItem ? `Unit: ${selectedItem.unit}` : undefined}
              />

              <FormikTextarea
                name="notes"
                label="Reason (optional)"
                rows={2}
                placeholder="e.g. Supplier GRN, stock take, damaged in handling"
              />

              {preview && (
                <div
                  className={cn(
                    "rounded-md border px-3 py-2.5 text-sm",
                    preview.warning
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-border bg-muted/40 text-foreground",
                  )}
                >
                  <p className="font-medium">{preview.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    On hand {formatNumber(selectedItem?.quantityOnHand ?? 0)} →{" "}
                    {formatNumber(preview.nextOnHand)}
                    {" · "}Available {formatNumber(selectedItem?.quantityAvailable ?? 0)} →{" "}
                    {formatNumber(preview.nextAvailable)}
                    {" · "}Reserved {formatNumber(selectedItem?.quantityReserved ?? 0)} →{" "}
                    {formatNumber(preview.nextReserved)}
                  </p>
                  {preview.warning && <p className="mt-1 text-xs font-medium">{preview.warning}</p>}
                </div>
              )}
            </>
          );
        }}
      </FormikForm>
    </Modal>
  );
}
