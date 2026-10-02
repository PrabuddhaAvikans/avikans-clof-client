import { useMemo } from "react";
import { toast } from "@/components/feedback/toast";
import { FormikForm, FormikInput, FormikSelect, FormikTextarea } from "@/components/forms";
import { Button, Modal } from "@/components/ui";
import {
  warehouseFormSchema,
  type WarehouseFormValues,
} from "@/features/inventory/schemas/inventorySchema";
import {
  useCreateWarehouse,
  useUpdateWarehouse,
} from "@/features/inventory/hooks/useWarehousesApi";
import {
  suggestWarehouseCode,
  WAREHOUSES_UPDATED_EVENT,
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
  const createWarehouse = useCreateWarehouse();
  const updateWarehouse = useUpdateWarehouse();

  const initialValues = useMemo<WarehouseFormValues>(
    () => ({
      code: warehouse?.code ?? suggestWarehouseCode(defaultName),
      name: warehouse?.name ?? defaultName,
      address: warehouse?.address ?? "",
      status: warehouse?.status ?? "active",
    }),
    [defaultName, warehouse],
  );

  const handleSubmit = async (values: WarehouseFormValues) => {
    const payload = {
      code: values.code,
      name: values.name,
      address: values.address ?? "",
      status: values.status,
    };

    try {
      const saved =
        isEditing && warehouse?.id
          ? await updateWarehouse.mutateAsync({ id: warehouse.id, data: payload })
          : await createWarehouse.mutateAsync(payload);

      window.dispatchEvent(new Event(WAREHOUSES_UPDATED_EVENT));
      onSaved(saved.name);
      onClose();
      toast.success(isEditing ? `Updated ${saved.name}.` : `Added ${saved.name}.`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not save warehouse.");
    }
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
