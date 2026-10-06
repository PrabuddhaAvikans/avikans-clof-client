import { useMemo } from "react";
import { toast } from "@/components/feedback/toast";
import { FormikForm, FormikInput, FormikSelect } from "@/components/forms";
import { Button, Modal } from "@/components/ui";
import {
  unitOfMeasureFormSchema,
  type UnitOfMeasureFormValues,
} from "@/features/inventory/schemas/inventorySchema";
import {
  useCreateUnitOfMeasure,
  useUpdateUnitOfMeasure,
} from "@/features/inventory/hooks/useUnitsOfMeasureApi";
import { UNITS_OF_MEASURE_UPDATED_EVENT, type UnitOfMeasure } from "@/lib/unitsOfMeasure";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export type UnitOfMeasureFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (code: string) => void;
  defaultCode?: string;
  unit?: UnitOfMeasure | null;
};

export function UnitOfMeasureFormModal({
  open,
  onClose,
  onSaved,
  defaultCode = "",
  unit = null,
}: UnitOfMeasureFormModalProps) {
  const isEditing = Boolean(unit);
  const createUnit = useCreateUnitOfMeasure();
  const updateUnit = useUpdateUnitOfMeasure();

  const initialValues = useMemo<UnitOfMeasureFormValues>(
    () => ({
      code: unit?.code ?? defaultCode,
      name: unit?.name ?? "",
      status: unit?.status ?? "active",
    }),
    [defaultCode, unit],
  );

  const handleSubmit = async (values: UnitOfMeasureFormValues) => {
    const payload = {
      code: values.code,
      name: values.name,
      status: values.status,
    };

    try {
      const saved =
        isEditing && unit?.id
          ? await updateUnit.mutateAsync({ id: unit.id, data: payload })
          : await createUnit.mutateAsync(payload);

      window.dispatchEvent(new Event(UNITS_OF_MEASURE_UPDATED_EVENT));
      onSaved(saved.code);
      onClose();
      toast.success(
        isEditing
          ? `Updated ${saved.code} - ${saved.name}.`
          : `Added ${saved.code} - ${saved.name}.`,
      );
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not save unit of measure.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Unit of Measure" : "Add Unit of Measure"}
      size="sm"
      footer={null}
    >
      {open && (
        <FormikForm<UnitOfMeasureFormValues>
          initialValues={initialValues}
          validationSchema={unitOfMeasureFormSchema}
          onSubmit={handleSubmit}
          enableReinitialize
          className="space-y-4"
        >
          {(formik) => (
            <>
              <FormikInput
                name="code"
                label="Unit code"
                required
                placeholder="e.g. ft"
                hint="Short code stored on the item, such as pcs or kg."
              />
              <FormikInput
                name="name"
                label="Name"
                required
                placeholder="e.g. Feet"
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
