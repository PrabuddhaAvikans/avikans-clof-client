import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { FormikForm, DynamicForm, FormActions } from "@/components/forms";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui";
import { InventoryPricingSummary } from "@/features/inventory/components/InventoryPricingSummary";
import {
  inventoryCostSections,
  inventoryGeneralSections,
  inventoryPricingSections,
  inventoryStockSections,
} from "@/features/inventory/forms/inventoryFormFields";
import {
  inventoryFormSchema,
  type InventoryFormValues,
} from "@/features/inventory/schemas/inventorySchema";
import {
  useCreateInventoryItem,
  useInventoryItem,
  useUpdateInventoryItem,
} from "@/features/inventory/hooks/useInventory";
import {
  createDefaultInventoryFormValues,
  inventoryItemToFormValues,
} from "@/features/inventory/utils/inventoryFormValues";
import type { InventoryFormData } from "@/services";

const FORM_TABS = [
  { id: "general", label: "General" },
  { id: "stock", label: "Inventory" },
  { id: "cost", label: "Cost" },
  { id: "pricing", label: "Pricing" },
] as const;

export function InventoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("general");

  const { data: item, isLoading, error } = useInventoryItem(id ?? "");
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();

  const initialValues = useMemo<InventoryFormValues>(() => {
    if (!item) return createDefaultInventoryFormValues();
    return inventoryItemToFormValues(item);
  }, [item]);

  const handleSubmit = async (values: InventoryFormValues) => {
    const payload: InventoryFormData = {
      sku: values.sku,
      name: values.name,
      description: values.description || undefined,
      category: values.category,
      itemType: values.itemType,
      unit: values.unit,
      brand: values.brand || undefined,
      supplier: values.supplier || undefined,
      taxCode: values.taxCode || undefined,
      quantityOnHand: values.quantityOnHand,
      warehouse: values.warehouse,
      location: values.location,
      minStock: values.minStock,
      maxStock: values.maxStock,
      reorderLevel: values.reorderLevel,
      reorderQuantity: values.reorderQuantity,
      buyingPrice: values.buyingPrice ?? undefined,
      costPrice: values.costPrice,
      pricingMethod: values.pricingMethod,
      markupPercent: values.markupPercent ?? 0,
      markupFixedAmount: values.markupFixedAmount ?? 0,
      sellingPrice: values.sellingPrice ?? 0,
      pricingEffectiveDate: values.pricingEffectiveDate,
      status: values.status,
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
          <Tabs value={activeTab} onChange={setActiveTab}>
            <TabList>
              {FORM_TABS.map((tab) => (
                <Tab key={tab.id} value={tab.id}>
                  {tab.label}
                </Tab>
              ))}
            </TabList>

            <TabPanel value="general" className="pt-4">
              <DynamicForm sections={inventoryGeneralSections} />
            </TabPanel>

            <TabPanel value="stock" className="pt-4">
              <DynamicForm sections={inventoryStockSections} />
            </TabPanel>

            <TabPanel value="cost" className="pt-4">
              <DynamicForm sections={inventoryCostSections} />
            </TabPanel>

            <TabPanel value="pricing" className="space-y-4 pt-4">
              <DynamicForm sections={inventoryPricingSections} />
              <InventoryPricingSummary />
            </TabPanel>
          </Tabs>

          <FormActions
            submitLabel={isEdit ? "Update Item" : "Create Item"}
            onCancel={() =>
              navigate(isEdit && id ? ROUTES.inventory.detail(id) : ROUTES.inventory.list)
            }
          />
        </FormikForm>
      </PageContent>
    </PageContainer>
  );
}
