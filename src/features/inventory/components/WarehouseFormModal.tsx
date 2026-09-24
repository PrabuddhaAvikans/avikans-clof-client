import { useMemo } from "react";
import { toast } from "@/components/feedback/toast";
import { FormikForm, FormikInput, FormikSelect, FormikTextarea } from "@/components/forms";
import { Button, Modal } from "@/components/ui";
import {
  warehouseFormSchema,
  type WarehouseFormValues,
} from "@/features/inventory/schemas/inventorySchema";
import {
  addWarehouse,
  findWarehouseByCode,
  findWarehouseByName,
  suggestWarehouseCode,
  updateWarehouse,
  type Warehouse,
} from "@/lib/warehouses";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export type WarehouseFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (name: string) => void;
  defaultName?: string;
  warehouse?: Warehouse | null;
};

export function WarehouseFormModal({
  open,
  onClose,
  onSaved,
  defaultName = "",
  warehouse = null,
}: WarehouseFormModalProps) {
  const isEditing = Boolean(warehouse);

  const initialValues = useMemo<WarehouseFormValues>(
    () => ({
      code: warehouse?.code ?? suggestWarehouseCode(defaultName),
      name: warehouse?.name ?? defaultName,
      address: warehouse?.address ?? "",
      status: warehouse?.status ?? "active",
    }),
    [defaultName, warehouse],
  );

  const handleSubmit = (values: WarehouseFormValues) => {
    const payload: Warehouse = {
      code: values.code,
      name: values.name,
      address: values.address ?? "",
      status: values.status,
    };

    if (!isEditing) {
      const existing =
        findWarehouseByCode(payload.code) ?? findWarehouseByName(payload.name);
      if (existing) {
        onSaved(existing.name);
        onClose();
        toast.info(`"${existing.name}" already exists.`);
        return;
      }
    } else if (warehouse) {
      const codeTaken = findWarehouseByCode(payload.code);
      if (codeTaken && codeTaken.code.toLowerCase() !== warehouse.code.toLowerCase()) {
        toast.error("That warehouse code already exists.");
        return;
      }
      const nameTaken = findWarehouseByName(payload.name);
      if (nameTaken && nameTaken.code.toLowerCase() !== warehouse.code.toLowerCase()) {
        toast.error("That warehouse name already exists.");
        return;
      }
    }

    const saved = isEditing && warehouse
      ? updateWarehouse(warehouse.code, payload)
      : addWarehouse(payload);

    onSaved(saved.name);
    onClose();
    toast.success(isEditing ? `Updated ${saved.name}.` : `Added ${saved.name}.`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Warehouse" : "Add Warehouse"}
      size="sm"
      footer={null}
    >
      {open && (
        <FormikForm<WarehouseFormValues>
          initialValues={initialValues}
          validationSchema={warehouseFormSchema}
          onSubmit={handleSubmit}
          enableReinitialize
          className="space-y-4"
        >
          {(formik) => (
            <>
              <FormikInput
                name="code"
                label="Warehouse code"
                required
                placeholder="e.g. MAIN"
              />
              <FormikInput
                name="name"
                label="Name"
                required
                placeholder="e.g. Main Warehouse"
              />
              <FormikTextarea
                name="address"
                label="Address"
                rows={2}
                placeholder="Optional location or address"
              />
              <FormikSelect
                name="status"
                label="Status"
                required
                options={STATUS_OPTIONS}
              />
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={formik.isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" loading={formik.isSubmitting}>
                  {isEditing ? "Save" : "Add"}
                </Button>
              </div>
            </>
          )}
        </FormikForm>
      )}
    </Modal>
  );
}
