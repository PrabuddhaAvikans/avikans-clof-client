import { useEffect, useMemo } from "react";
import { useFormikContext } from "formik";
import { FormikForm, DynamicForm } from "@/components/forms";
import { Button, Modal } from "@/components/ui";
import { brandFormSections } from "@/features/products/forms/brandFormFields";
import {
  brandFormSchema,
  type BrandFormSchemaValues,
} from "@/features/products/schemas/productSchema";
import { useCreateBrand, useUpdateBrand } from "@/features/products/hooks/useBrands";
import type { Brand } from "@/types/brand";

export type CreateBrandModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (brandId: string) => void;
  defaultName?: string;
  editBrand?: Brand | null;
};

const defaultValues: BrandFormSchemaValues = {
  name: "",
  slug: "",
  description: "",
  website: "",
  countryOfOrigin: "",
  status: "active",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function SlugSyncEffect({ isEditing }: { isEditing: boolean }) {
  const { values, setFieldValue, dirty } = useFormikContext<BrandFormSchemaValues>();

  useEffect(() => {
    if (isEditing) return;
    if (!dirty && !values.name) return;
    void setFieldValue("slug", slugify(values.name), false);
  }, [values.name, dirty, isEditing, setFieldValue]);

  return null;
}

export function CreateBrandModal({
  open,
  onClose,
  onCreated,
  defaultName = "",
  editBrand = null,
}: CreateBrandModalProps) {
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const isEditing = Boolean(editBrand);

  const initialValues = useMemo<BrandFormSchemaValues>(() => {
    if (editBrand) {
      return {
        name: editBrand.name,
        slug: editBrand.slug,
        description: editBrand.description ?? "",
        website: editBrand.website ?? "",
        countryOfOrigin: editBrand.countryOfOrigin ?? "",
        status: editBrand.status,
      };
    }
    return {
      ...defaultValues,
      name: defaultName,
      slug: defaultName ? slugify(defaultName) : "",
    };
  }, [editBrand, defaultName]);

  const handleSubmit = async (values: BrandFormSchemaValues) => {
    if (editBrand) {
      await updateBrand.mutateAsync({ id: editBrand.id, data: values });
      onCreated?.(editBrand.id);
    } else {
      const created = await createBrand.mutateAsync(values);
      onCreated?.(created.id);
    }
    onClose();
  };

  const isPending = createBrand.isPending || updateBrand.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Brand" : "Create Brand"}
      size="md"
      footer={null}
    >
      {open && (
        <FormikForm<BrandFormSchemaValues>
          initialValues={initialValues}
          validationSchema={brandFormSchema}
          onSubmit={handleSubmit}
          enableReinitialize
          className="space-y-4"
        >
          {(formik) => (
            <>
              <SlugSyncEffect isEditing={isEditing} />
              <DynamicForm sections={brandFormSections} />
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={formik.isSubmitting || isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" loading={formik.isSubmitting || isPending}>
                  {isEditing ? "Save Changes" : "Create Brand"}
                </Button>
              </div>
            </>
          )}
        </FormikForm>
      )}
    </Modal>
  );
}
