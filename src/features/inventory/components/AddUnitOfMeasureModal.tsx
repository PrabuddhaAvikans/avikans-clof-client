import { useMemo } from "react";
import { toast } from "@/components/feedback/toast";
import { FormikForm, FormikInput } from "@/components/forms";
import { Button, Modal } from "@/components/ui";
import {
  unitOfMeasureFormSchema,
  type UnitOfMeasureFormValues,
} from "@/features/inventory/schemas/inventorySchema";
import { addUnitOfMeasure, findUnitOfMeasure } from "@/lib/unitsOfMeasure";

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
  const initialValues = useMemo<UnitOfMeasureFormValues>(
    () => ({
      code: defaultCode,
      name: "",
    }),
    [defaultCode],
  );

  const handleSubmit = (values: UnitOfMeasureFormValues) => {
    const existing = findUnitOfMeasure(values.code);
    if (existing) {
      onCreated(existing.code);
      onClose();
      toast.info(`"${existing.code}" already exists.`);
      return;
    }

    const created = addUnitOfMeasure({ code: values.code, name: values.name });
    onCreated(created.code);
    onClose();
    toast.success(`Added ${created.code} - ${created.name}.`);
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
