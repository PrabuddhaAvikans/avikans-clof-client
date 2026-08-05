import { useEffect, useMemo } from "react";
import { useFormikContext } from "formik";
import { FormikForm, DynamicForm } from "@/components/forms";
import { Button, Modal } from "@/components/ui";
import { createCategoryFormSections } from "@/features/products/forms/categoryFormFields";
import {
  categoryFormSchema,
  type CategoryFormSchemaValues,
} from "@/features/products/schemas/productSchema";
import { useCategories, useCreateCategory } from "@/features/products/hooks/useCategories";

export type CreateCategoryModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated?: (categoryId: string) => void;
  defaultName?: string;
};

const defaultValues: CategoryFormSchemaValues = {
  name: "",
  slug: "",
  description: "",
  parentId: null,
  sortOrder: 0,
  status: "active",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function SlugSyncEffect() {
  const { values, setFieldValue, dirty } = useFormikContext<CategoryFormSchemaValues>();

  useEffect(() => {
    if (!dirty && !values.name) return;
    void setFieldValue("slug", slugify(values.name), false);
  }, [values.name, dirty, setFieldValue]);

  return null;
}

export function CreateCategoryModal({
  open,
  onClose,
  onCreated,
  defaultName = "",
}: CreateCategoryModalProps) {
  const { data: categoriesData } = useCategories({ page: 1, pageSize: 200 });
  const createCategory = useCreateCategory();

  const initialValues = useMemo<CategoryFormSchemaValues>(
    () => ({
      ...defaultValues,
      name: defaultName,
      slug: defaultName ? slugify(defaultName) : "",
    }),
    [defaultName],
  );

  const sections = useMemo(
    () =>
      createCategoryFormSections({
        parentOptions: [
          { value: "", label: "None (top level)" },
          ...(categoriesData?.items ?? []).map((category) => ({
            value: category.id,
            label: category.name,
          })),
        ],
      }),
    [categoriesData?.items],
  );

  const handleSubmit = async (values: CategoryFormSchemaValues) => {
    const created = await createCategory.mutateAsync({
      ...values,
      parentId: values.parentId || null,
    });
    onCreated?.(created.id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Category"
      size="md"
      footer={null}
    >
      {open && (
        <FormikForm<CategoryFormSchemaValues>
          initialValues={initialValues}
          validationSchema={categoryFormSchema}
          onSubmit={handleSubmit}
          enableReinitialize
          className="space-y-4"
        >
          {(formik) => (
            <>
              <SlugSyncEffect />
              <DynamicForm sections={sections} />
              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={formik.isSubmitting || createCategory.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={formik.isSubmitting || createCategory.isPending}
                >
                  Create Category
                </Button>
              </div>
            </>
          )}
        </FormikForm>
      )}
    </Modal>
  );
}
