import { useMemo } from "react";
import { toast } from "@/components/feedback/toast";
import { FormikForm, FormikInput } from "@/components/forms";
import { Button, Modal } from "@/components/ui";
import {
  unitOfMeasureFormSchema,
  type UnitOfMeasureFormValues,
} from "@/features/inventory/schemas/inventorySchema";
import { useCreateUnitOfMeasure } from "@/features/inventory/hooks/useUnitsOfMeasureApi";
import { UNITS_OF_MEASURE_UPDATED_EVENT } from "@/lib/unitsOfMeasure";

export type AddUnitOfMeasureModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (code: string) => void;
  defaultCode?: string;
};

export function AddUnitOfMeasureModal({
  open,
  onClose,
  onCreated,
  defaultCode = "",
}: AddUnitOfMeasureModalProps) {
  const createUnit = useCreateUnitOfMeasure();
  const initialValues = useMemo<UnitOfMeasureFormValues>(
    () => ({
      code: defaultCode,
      name: "",
    }),
    [defaultCode],
  );

  const handleSubmit = async (values: UnitOfMeasureFormValues) => {
    try {
      const created = await createUnit.mutateAsync({
        code: values.code,
        name: values.name,
        status: "active",
      });
      window.dispatchEvent(new Event(UNITS_OF_MEASURE_UPDATED_EVENT));
      onCreated(created.code);
      onClose();
      toast.success(`Added ${created.code} - ${created.name}.`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not add unit of measure.");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Unit of Measure" size="sm" footer={null}>
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
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={formik.isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" loading={formik.isSubmitting}>
                  Add
                </Button>
              </div>
            </>
          )}
        </FormikForm>
      )}
    </Modal>
  );
}
