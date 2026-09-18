import { useMemo } from "react";
import { toast } from "sonner";
import * as yup from "yup";
import { FormikForm, FormikInput } from "@/components/forms";
import { Button, Modal } from "@/components/ui";
import { addAccessoryHandle, findAccessoryHandle } from "@/lib/accessoryHandles";

const handleSchema = yup.object({
  name: yup.string().trim().required("Handle name is required").max(80, "Use 80 characters or fewer"),
});

type HandleFormValues = yup.InferType<typeof handleSchema>;

export type AddAccessoryHandleModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (handleId: string) => void;
  defaultName?: string;
  zIndexClassName?: string;
};

export function AddAccessoryHandleModal({
  open,
  onClose,
  onCreated,
  defaultName = "",
  zIndexClassName,
}: AddAccessoryHandleModalProps) {
  const initialValues = useMemo<HandleFormValues>(
    () => ({ name: defaultName }),
    [defaultName],
  );

  const handleSubmit = (values: HandleFormValues) => {
    const existing = findAccessoryHandle(values.name);
    if (existing) {
      onCreated(existing.id);
      onClose();
      toast.info(`"${existing.name}" already exists.`);
      return;
    }

    const created = addAccessoryHandle(values.name);
    onCreated(created.id);
    onClose();
    toast.success(`Added accessory handle "${created.name}".`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add accessory handle"
      size="sm"
      footer={null}
      zIndexClassName={zIndexClassName}
    >
      {open && (
        <FormikForm<HandleFormValues>
          initialValues={initialValues}
          validationSchema={handleSchema}
          onSubmit={handleSubmit}
          enableReinitialize
          className="space-y-4"
        >
          {(formik) => (
            <>
              <FormikInput
                name="name"
                label="Handle"
                required
                placeholder="e.g. Driver, Mounting kit"
                hint="Reusable accessory type for this and later products."
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
