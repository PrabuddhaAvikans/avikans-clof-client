import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { FormikForm, DynamicForm, FormActions } from "@/components/forms";
import { inventoryFormSections } from "@/features/inventory/forms/inventoryFormFields";
import {
  inventoryFormSchema,
  type InventoryFormValues,
} from "@/features/inventory/schemas/inventorySchema";
import {
  useCreateInventoryItem,
  useInventoryItem,
  useUpdateInventoryItem,
} from "@/features/inventory/hooks/useInventory";
import type { InventoryFormData } from "@/services";

const defaultValues: InventoryFormValues = {
  sku: "",
  name: "",
  description: "",
  category: "",
  unit: "pcs",
  quantityOnHand: 0,
  reorderLevel: 10,
  reorderQuantity: 50,
  unitCost: 0,
  location: "Main Warehouse",
  supplier: "",
  status: "active",
};

export function InventoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: item, isLoading, error } = useInventoryItem(id ?? "");
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const initialValues = useMemo<InventoryFormValues>(() => {
    if (!item) return defaultValues;
    return {
      sku: item.sku,
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      unit: item.unit,
      quantityOnHand: item.quantityOnHand,
      reorderLevel: item.reorderLevel,
      reorderQuantity: item.reorderQuantity,
      unitCost: item.unitCost,
      location: item.location,
      supplier: item.supplier ?? "",
      status: item.status,
    };
  }, [item]);

  const handleSubmit = async (values: InventoryFormValues) => {
    const payload: InventoryFormData = {
      ...values,
      description: values.description || undefined,
      supplier: values.supplier || undefined,
    };

    if (isEdit && id) {
      await updateItem.mutateAsync({ id, data: payload });
      navigate(ROUTES.inventory.detail(id));
    } else {
      const created = await createItem.mutateAsync(payload);
      navigate(ROUTES.inventory.detail(created.id));
    }
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title={isEdit ? "Edit Inventory Item" : "New Inventory Item"}
        breadcrumbs={[
          { label: "Inventory", href: ROUTES.inventory.list },
          { label: isEdit ? "Edit" : "New" },
        ]}
      />

      <PageContent
        isLoading={isEdit && isLoading}
        error={error ? "Item not found." : null}
      >
        <FormikForm<InventoryFormValues>
          initialValues={initialValues}
          validationSchema={inventoryFormSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          <DynamicForm sections={inventoryFormSections} />
          <FormActions
            submitLabel={isEdit ? "Update Item" : "Create Item"}
            onCancel={() => navigate(ROUTES.inventory.list)}
          />
        </FormikForm>
      </PageContent>
    </PageContainer>
  );
}
