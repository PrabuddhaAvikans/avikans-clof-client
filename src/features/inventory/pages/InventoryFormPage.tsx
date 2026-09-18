import { useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useFormikContext } from "formik";
import { toast } from "sonner";
import { ArrowLeft, Copy, Save } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import {
  FormikDatePicker,
  FormikForm,
  FormikInput,
  FormikSelect,
  FormikSwitch,
  FormikTextarea,
} from "@/components/forms";
import { Button, Tabs, TabList, Tab, TabPanel } from "@/components/ui";
import { CreatableLookupField } from "@/features/inventory/components/CreatableLookupField";
import { InventoryFormPreview } from "@/features/inventory/components/InventoryFormPreview";
import { InventorySkuField } from "@/features/inventory/components/InventorySkuField";
import { UnitOfMeasureField } from "@/features/inventory/components/UnitOfMeasureField";
import { WarehouseField } from "@/features/inventory/components/WarehouseField";
import { InventoryPricingSummary } from "@/features/inventory/components/InventoryPricingSummary";
import { DEFAULT_UNIT_BY_ITEM_TYPE } from "@/features/inventory/forms/inventoryFormFields";
import {
  inventoryFormSchema,
  type InventoryFormValues,
} from "@/features/inventory/schemas/inventorySchema";
import {
  useCreateInventoryItem,
  useInventoryItem,
  useInventoryItems,
  useUpdateInventoryItem,
} from "@/features/inventory/hooks/useInventory";
import {
  createDefaultInventoryFormValues,
  inventoryItemToFormValues,
} from "@/features/inventory/utils/inventoryFormValues";
import { useInventoryLookups } from "@/hooks/useInventoryLookups";
import { toLookupOptions } from "@/lib/inventoryLookups";
import { isServiceItemType, isTrackedByDefault, suggestInventorySku } from "@/lib/inventorySku";
import type { InventoryFormData } from "@/services";
import {
  InventoryItemTypeLabels,
  PricingMethod,
  PricingMethodLabels,
} from "@/types/inventory";

const TABS = [
  { id: "general", label: "General" },
  { id: "stock", label: "Stock" },
  { id: "cost", label: "Cost" },
  { id: "pricing", label: "Pricing" },
] as const;

const TAB_FIELDS: Record<(typeof TABS)[number]["id"], (keyof InventoryFormValues)[]> = {
  general: ["sku", "name", "itemType", "unit", "category", "status"],
  stock: ["warehouse", "quantityOnHand", "minStock", "maxStock", "reorderLevel", "reorderQuantity"],
  cost: ["buyingPrice", "costPrice"],
  pricing: [
    "pricingMethod",
    "markupPercent",
    "markupFixedAmount",
    "sellingPrice",
    "pricingEffectiveDate",
  ],
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ITEM_TYPE_OPTIONS = Object.entries(InventoryItemTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

const PRICING_METHOD_OPTIONS = Object.entries(PricingMethodLabels).map(([value, label]) => ({
  value,
  label,
}));

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card p-3">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function tabHasError(
  tabId: (typeof TABS)[number]["id"],
  errors: Record<string, unknown>,
  submitCount: number,
): boolean {
  if (submitCount === 0) return false;
  return TAB_FIELDS[tabId].some((field) => Boolean(errors[field as string]));
}

function ItemBehaviourSync({
  existingSkus,
  autoSkuRef,
}: {
  existingSkus: string[];
  autoSkuRef: MutableRefObject<boolean>;
}) {
  const { values, setFieldValue } = useFormikContext<InventoryFormValues>();
  const previousType = useRef(values.itemType);

  useEffect(() => {
    if (previousType.current === values.itemType) return;
    const previousDefault = DEFAULT_UNIT_BY_ITEM_TYPE[previousType.current] ?? "pcs";
    const nextDefault = DEFAULT_UNIT_BY_ITEM_TYPE[values.itemType] ?? "pcs";
    if (!values.unit || values.unit === previousDefault) {
      void setFieldValue("unit", nextDefault);
    }
    void setFieldValue("trackStock", isTrackedByDefault(values.itemType));
    previousType.current = values.itemType;
  }, [setFieldValue, values.itemType, values.unit]);

  useEffect(() => {
    if (!autoSkuRef.current) return;
    if (!values.name.trim()) return;
    const next = suggestInventorySku(values.itemType, values.name, existingSkus);
    if (values.sku === next) return;
    void setFieldValue("sku", next, false);
  }, [autoSkuRef, existingSkus, setFieldValue, values.itemType, values.name, values.sku]);

  return null;
}

function JumpToErrorTab({ onChange }: { onChange: (tab: string) => void }) {
  const { errors, submitCount } = useFormikContext<InventoryFormValues>();
  const previousCount = useRef(0);

  useEffect(() => {
    if (submitCount === 0 || submitCount === previousCount.current) return;
    previousCount.current = submitCount;
    const first = TABS.find((tab) =>
      tabHasError(tab.id, errors as Record<string, unknown>, submitCount),
    );
    if (first) onChange(first.id);
  }, [errors, onChange, submitCount]);

  return null;
}

function GeneralTab({
  categoryOptions,
  brandOptions,
  supplierOptions,
  taxOptions,
  onCreateCategory,
  onCreateBrand,
  onCreateSupplier,
  onCreateTax,
  onGenerateSku,
  onManualSkuEdit,
}: {
  categoryOptions: { value: string; label: string }[];
  brandOptions: { value: string; label: string }[];
  supplierOptions: { value: string; label: string }[];
  taxOptions: { value: string; label: string }[];
  onCreateCategory: (name: string) => string;
  onCreateBrand: (name: string) => string;
  onCreateSupplier: (name: string) => string;
  onCreateTax: (name: string) => string;
  onGenerateSku: () => void;
  onManualSkuEdit: () => void;
}) {
  return (
    <div className="space-y-3">
      <SectionCard
        title="Identity"
        description="Unique code and name used across costing, manufacturing, and sales."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <InventorySkuField onGenerate={onGenerateSku} onManualEdit={onManualSkuEdit} />
          <FormikInput name="name" label="Item Name" required placeholder="e.g. LED Driver 40W" />
          <FormikSelect name="status" label="Status" options={STATUS_OPTIONS} />
        </div>
      </SectionCard>

      <SectionCard
        title="Classification"
        description="Type, unit, and category control defaults, BOM usage, and stock behaviour."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <FormikSelect
            name="itemType"
            label="Item Type"
            required
            options={ITEM_TYPE_OPTIONS}
          />
          <UnitOfMeasureField name="unit" label="Unit of Measure" required />
          <CreatableLookupField
            name="category"
            label="Category"
            required
            options={categoryOptions}
            placeholder="Select category..."
            onCreate={onCreateCategory}
          />
          <CreatableLookupField
            name="brand"
            label="Brand"
            options={brandOptions}
            placeholder="Select brand..."
            onCreate={onCreateBrand}
          />
        </div>
      </SectionCard>

      <SectionCard title="Procurement & tax" description="Optional supplier and tax classification.">
        <div className="grid gap-3 sm:grid-cols-2">
          <CreatableLookupField
            name="supplier"
            label="Supplier"
            options={supplierOptions}
            placeholder="Select supplier..."
            onCreate={onCreateSupplier}
          />
          <CreatableLookupField
            name="taxCode"
            label="Tax Code"
            options={taxOptions}
            placeholder="Select tax code..."
            onCreate={onCreateTax}
          />
        </div>
      </SectionCard>

      <SectionCard title="Notes" description="Internal description for warehouse and costing teams.">
        <FormikTextarea
          name="description"
          label="Description"
          rows={3}
          placeholder="Specification, finish, or handling notes"
        />
      </SectionCard>
    </div>
  );
}

function StockTab() {
  const { values } = useFormikContext<InventoryFormValues>();
  const tracking = values.trackStock !== false;
  const service = isServiceItemType(values.itemType);

  return (
    <div className="space-y-3">
      <SectionCard
        title="Warehouse"
        description="Stock is held against a configured warehouse. Add a new warehouse if it is not in the list."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <WarehouseField name="warehouse" label="Warehouse" required />
          <div className="flex items-end">
            <FormikSwitch
              name="trackStock"
              label="Track stock quantities"
              description={
                service
                  ? "Services are not tracked by default. Turn on only if this service consumes stock."
                  : "Turn off for non-physical items that should not appear in reorder and on-hand reports."
              }
            />
          </div>
        </div>
      </SectionCard>

      {tracking ? (
        <SectionCard
          title="Stock levels"
          description="On-hand, safety stock, and reorder policy used by low-stock alerts."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormikInput name="quantityOnHand" label="Quantity On Hand" type="number" min={0} step={0.01} />
            <FormikInput name="minStock" label="Minimum Stock" type="number" min={0} step={0.01} />
            <FormikInput name="maxStock" label="Maximum Stock" type="number" min={0} step={0.01} />
            <FormikInput name="reorderLevel" label="Reorder Level" type="number" min={0} step={0.01} />
            <FormikInput name="reorderQuantity" label="Reorder Quantity" type="number" min={0} step={0.01} />
          </div>
        </SectionCard>
      ) : (
        <div className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Quantity tracking is off. This item can still be selected on BOMs and quotations, but it
          will not affect warehouse on-hand or low-stock alerts.
        </div>
      )}
    </div>
  );
}

function CostTab() {
  const { values, setFieldValue } = useFormikContext<InventoryFormValues>();
  const buying = Number(values.buyingPrice) || 0;

  return (
    <SectionCard
      title="Cost prices"
      description="Cost price is used for BOM and manufacturing costing — not the selling price."
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={buying <= 0}
          leftIcon={<Copy className="h-3.5 w-3.5" />}
          onClick={() => void setFieldValue("costPrice", buying)}
        >
          Use buying price
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <FormikInput
          name="buyingPrice"
          label="Buying Price"
          type="number"
          min={0}
          step={0.01}
          placeholder="Supplier purchase price"
        />
        <FormikInput
          name="costPrice"
          label="Cost Price"
          type="number"
          min={0}
          step={0.01}
          required
        />
      </div>
    </SectionCard>
  );
}

function PricingTab() {
  const { values } = useFormikContext<InventoryFormValues>();

  return (
    <div className="space-y-3">
      <SectionCard
        title="Selling rules"
        description="Selling price applies to direct inventory sales only. BOM and jobs always use cost price."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FormikSelect
            name="pricingMethod"
            label="Pricing Method"
            required
            options={PRICING_METHOD_OPTIONS}
          />
          {values.pricingMethod === PricingMethod.percentage_markup ? (
            <FormikInput
              name="markupPercent"
              label="Markup %"
              type="number"
              min={0}
              step={0.01}
              placeholder="e.g. 20"
            />
          ) : null}
          {values.pricingMethod === PricingMethod.fixed_markup ? (
            <FormikInput
              name="markupFixedAmount"
              label="Fixed Markup Amount"
              type="number"
              min={0}
              step={0.01}
              placeholder="e.g. 1500"
            />
          ) : null}
          {values.pricingMethod === PricingMethod.manual ? (
            <FormikInput
              name="sellingPrice"
              label="Final Selling Price"
              type="number"
              min={0}
              step={0.01}
              required
            />
          ) : null}
          <FormikDatePicker name="pricingEffectiveDate" label="Effective Date" required />
        </div>
      </SectionCard>
      <InventoryPricingSummary />
    </div>
  );
}

function toPayload(
  values: InventoryFormValues,
  location: string,
): InventoryFormData {
  const trackStock = values.trackStock !== false;
  return {
    sku: values.sku,
    name: values.name,
    description: values.description || undefined,
    category: values.category,
    itemType: values.itemType,
    unit: values.unit,
    brand: values.brand || undefined,
    supplier: values.supplier || undefined,
    taxCode: values.taxCode || undefined,
    quantityOnHand: trackStock ? values.quantityOnHand ?? 0 : 0,
    warehouse: values.warehouse,
    location,
    minStock: trackStock ? values.minStock ?? 0 : 0,
    maxStock: trackStock ? values.maxStock ?? 0 : 0,
    reorderLevel: trackStock ? values.reorderLevel ?? 0 : 0,
    reorderQuantity: trackStock ? values.reorderQuantity ?? 0 : 0,
    buyingPrice: values.buyingPrice ?? undefined,
    costPrice: values.costPrice,
    pricingMethod: values.pricingMethod,
    markupPercent: values.markupPercent ?? 0,
    markupFixedAmount: values.markupFixedAmount ?? 0,
    sellingPrice: values.sellingPrice ?? 0,
    pricingEffectiveDate: values.pricingEffectiveDate,
    status: values.status,
  };
}

export function InventoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>("general");
  const [saveMode, setSaveMode] = useState<"close" | "new">("close");
  const autoSkuRef = useRef(!isEdit);

  const { data: item, isLoading, error } = useInventoryItem(id ?? "");
  const { data: inventoryList } = useInventoryItems({ page: 1, pageSize: 200 });
  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const { lookups, addLookup } = useInventoryLookups();

  const initialValues = useMemo<InventoryFormValues>(() => {
    if (!item) return createDefaultInventoryFormValues();
    return inventoryItemToFormValues(item);
  }, [item]);

  const existingSkus = useMemo(
    () =>
      (inventoryList?.items ?? [])
        .filter((entry) => entry.id !== id)
        .map((entry) => entry.sku),
    [id, inventoryList?.items],
  );

  const categoryOptions = useMemo(() => {
    const fromItems = (inventoryList?.items ?? []).map((entry) => entry.category);
    return toLookupOptions([...lookups.categories, ...fromItems]);
  }, [inventoryList?.items, lookups.categories]);

  const brandOptions = useMemo(() => {
    const fromItems = (inventoryList?.items ?? []).map((entry) => entry.brand ?? "");
    return toLookupOptions([...lookups.brands, ...fromItems]);
  }, [inventoryList?.items, lookups.brands]);

  const supplierOptions = useMemo(() => {
    const fromItems = (inventoryList?.items ?? []).map((entry) => entry.supplier ?? "");
    return toLookupOptions([...lookups.suppliers, ...fromItems]);
  }, [inventoryList?.items, lookups.suppliers]);

  const taxOptions = useMemo(() => {
    const fromItems = (inventoryList?.items ?? []).map((entry) => entry.taxCode ?? "");
    return toLookupOptions([...lookups.taxCodes, ...fromItems]);
  }, [inventoryList?.items, lookups.taxCodes]);

  const busy = createItem.isPending || updateItem.isPending;

  return (
    <PageContainer>
      <PageContent isLoading={isEdit && isLoading} error={error ? "Item not found." : null}>
        <FormikForm<InventoryFormValues>
          initialValues={initialValues}
          validationSchema={inventoryFormSchema}
          enableReinitialize
          onSubmit={async (values, helpers) => {
            const payload = toPayload(values, isEdit && item ? item.location : "");
            if (isEdit && id) {
              await updateItem.mutateAsync({ id, data: payload });
              toast.success("Inventory item updated.");
              navigate(ROUTES.inventory.detail(id));
              return;
            }
            const created = await createItem.mutateAsync(payload);
            toast.success("Inventory item created.");
            if (saveMode === "new") {
              autoSkuRef.current = true;
              helpers.resetForm({ values: createDefaultInventoryFormValues() });
              setActiveTab("general");
              return;
            }
            navigate(ROUTES.inventory.detail(created.id));
          }}
        >
          {(formik) => {
            const generateSku = () => {
              autoSkuRef.current = true;
              const next = suggestInventorySku(
                formik.values.itemType,
                formik.values.name || "ITEM",
                existingSkus,
              );
              void formik.setFieldValue("sku", next);
            };

            return (
              <>
                <ItemBehaviourSync existingSkus={existingSkus} autoSkuRef={autoSkuRef} />
                <JumpToErrorTab onChange={setActiveTab} />
                <PageHeader
                  title={isEdit ? "Edit / Configure Inventory Item" : "Add / Configure Inventory Item"}
                  description="Set identity, warehouse, costing, and selling rules. Lookups can be added on the fly."
                  className="mb-2"
                  breadcrumbs={[
                    { label: "Inventory", href: ROUTES.inventory.list },
                    { label: "Inventory Items", href: ROUTES.inventory.list },
                    { label: isEdit ? "Edit Item" : "New Item" },
                  ]}
                  actions={
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link to={isEdit && id ? ROUTES.inventory.detail(id) : ROUTES.inventory.list}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                        >
                          Back
                        </Button>
                      </Link>
                      {!isEdit ? (
                        <Button
                          type="submit"
                          variant="outline"
                          size="sm"
                          leftIcon={<Save className="h-3.5 w-3.5" />}
                          loading={busy && saveMode === "new"}
                          onClick={() => setSaveMode("new")}
                        >
                          Save & New
                        </Button>
                      ) : null}
                      <Button
                        type="submit"
                        size="sm"
                        leftIcon={<Save className="h-3.5 w-3.5" />}
                        loading={busy && saveMode === "close"}
                        onClick={() => setSaveMode("close")}
                      >
                        {isEdit ? "Save Changes" : "Save & Close"}
                      </Button>
                    </div>
                  }
                />

                <Tabs
                  value={activeTab}
                  onChange={setActiveTab}
                >
                  <TabList className="gap-0 overflow-x-auto">
                    {TABS.map((tab) => {
                      const invalid = tabHasError(
                        tab.id,
                        formik.errors as Record<string, unknown>,
                        formik.submitCount,
                      );
                      return (
                        <Tab
                          key={tab.id}
                          value={tab.id}
                          className="whitespace-nowrap rounded-none px-3 py-2 text-[12px]"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            {tab.label}
                            {invalid ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-label="Has errors" />
                            ) : null}
                          </span>
                        </Tab>
                      );
                    })}
                  </TabList>

                  <div className="grid grid-cols-1 gap-3 pt-3 xl:grid-cols-12">
                    <div className="xl:col-span-9">
                      <TabPanel value="general" className="pt-0">
                        <GeneralTab
                          categoryOptions={categoryOptions}
                          brandOptions={brandOptions}
                          supplierOptions={supplierOptions}
                          taxOptions={taxOptions}
                          onCreateCategory={(name) => addLookup("categories", name)}
                          onCreateBrand={(name) => addLookup("brands", name)}
                          onCreateSupplier={(name) => addLookup("suppliers", name)}
                          onCreateTax={(name) => addLookup("taxCodes", name)}
                          onGenerateSku={generateSku}
                          onManualSkuEdit={() => {
                            autoSkuRef.current = false;
                          }}
                        />
                      </TabPanel>
                      <TabPanel value="stock" className="pt-0">
                        <StockTab />
                      </TabPanel>
                      <TabPanel value="cost" className="pt-0">
                        <CostTab />
                      </TabPanel>
                      <TabPanel value="pricing" className="pt-0">
                        <PricingTab />
                      </TabPanel>
                    </div>
                    <div className="xl:col-span-3 xl:sticky xl:top-[72px] xl:self-start">
                      <InventoryFormPreview />
                    </div>
                  </div>
                </Tabs>
              </>
            );
          }}
        </FormikForm>
      </PageContent>
    </PageContainer>
  );
}
