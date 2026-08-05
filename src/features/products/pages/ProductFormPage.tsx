import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FieldArray, useFormikContext } from "formik";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  Copy,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import {
  FormikForm,
  FormikCheckbox,
  FormikInput,
  FormikSelect,
  FormikTextarea,
  FormikSearchableSelect,
} from "@/components/forms";
import {
  Button,
  ImageUploader,
  Input,
  Modal,
  SearchableSelect,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  type UploadedImage,
} from "@/components/ui";
import { ROUTES } from "@/app/config/routes";
import { CreateBrandModal } from "@/features/products/components/CreateBrandModal";
import { CreateCategoryModal } from "@/features/products/components/CreateCategoryModal";
import { ProductFormPreview } from "@/features/products/components/ProductFormPreview";
import { useBrands } from "@/features/products/hooks/useBrands";
import { useCategories } from "@/features/products/hooks/useCategories";
import {
  useCreateProduct,
  useProduct,
  useUpdateProduct,
} from "@/features/products/hooks/useProducts";
import { useInventoryItems } from "@/features/inventory/hooks/useInventory";
import {
  productFormSchema,
  type ProductFormSchemaValues,
} from "@/features/products/schemas/productSchema";
import { formatCurrency } from "@/lib/format";
import type { ProductFormData } from "@/types/product";
import type { InventoryItem } from "@/types/inventory";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "technical", label: "Technical Specs" },
  { id: "dimensions", label: "Dimensions" },
  { id: "materials", label: "Materials" },
  { id: "coating", label: "Coating Options" },
  { id: "pricing", label: "Pricing Rules" },
  { id: "images", label: "Images & Attachments" },
] as const;

const defaultValues: ProductFormSchemaValues = {
  name: "",
  code: "",
  sku: "",
  description: "",
  shortDescription: "",
  categoryId: "",
  brandId: "",
  productType: "finished_good",
  baseModel: "",
  productFamily: "",
  status: "inactive",
  availability: "in_stock",
  isActive: false,
  tags: [],
  basePrice: 0,
  costPrice: 0,
  leadTimeDays: 14,
  minOrderQuantity: 1,
  weightKg: undefined,
  dimensions: "",
  lengthMm: undefined,
  widthMm: undefined,
  heightMm: undefined,
  wattage: undefined,
  lumenOutput: undefined,
  efficacy: undefined,
  colorTemperature: "",
  cri: "",
  beamAngle: "",
  ipRating: "",
  inputVoltage: "",
  powerFactor: undefined,
  dimming: "",
  opTempMin: undefined,
  opTempMax: undefined,
  inputPower: undefined,
  inputCurrent: undefined,
  driverType: "",
  driverBrand: "",
  certifications: "",
  warranty: "",
  coatingFinish: "",
  coatingProcess: "",
  materialPrimary: "",
  materialSecondary: "",
  attributes: [],
  bom: [],
  pricingRows: [
    { minQty: 1, maxQty: 10, unitPrice: 0, currency: "LKR", discountPercent: 0 },
  ],
  optionGroups: [
    {
      name: "Finish",
      type: "Single Select",
      required: true,
      optionsText: "Black, White, Brass",
    },
  ],
  accessories: [],
  manufacturingNotes: "",
};

function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-border bg-card p-3 ${className ?? ""}`}>
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

function attrValue(
  attributes: { name: string; value: string; unit?: string }[],
  name: string,
): string {
  return attributes.find((item) => item.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function toFormValues(
  product: NonNullable<ReturnType<typeof useProduct>["data"]>,
): ProductFormSchemaValues {
  const dims = product.dimensions?.match(/(\d+)\s*[×x]\s*(\d+)\s*[×x]\s*(\d+)/i);
  return {
    ...defaultValues,
    name: product.name,
    code: product.sku.split("-")[0] ?? "",
    sku: product.sku,
    description: product.description,
    shortDescription: product.description.slice(0, 120),
    categoryId: product.categoryId,
    brandId: product.brandId,
    productFamily: product.categoryName,
    baseModel: product.brandName,
    status: product.status,
    isActive: product.status === "active",
    tags: product.tags,
    basePrice: product.basePrice,
    costPrice: product.costPrice,
    leadTimeDays: product.leadTimeDays,
    minOrderQuantity: product.minOrderQuantity,
    weightKg: product.weightKg,
    dimensions: product.dimensions ?? "",
    lengthMm: dims ? Number(dims[1]) : undefined,
    widthMm: dims ? Number(dims[2]) : undefined,
    heightMm: dims ? Number(dims[3]) : undefined,
    wattage: Number(attrValue(product.attributes, "Wattage")) || undefined,
    lumenOutput: Number(attrValue(product.attributes, "Luminous Flux")) || undefined,
    colorTemperature: attrValue(product.attributes, "Color Temperature"),
    cri: attrValue(product.attributes, "CRI"),
    beamAngle: attrValue(product.attributes, "Beam Angle"),
    ipRating: attrValue(product.attributes, "IP Rating"),
    materialPrimary: attrValue(product.attributes, "Material"),
    attributes: product.attributes.map(({ name, value, unit }) => ({ name, value, unit })),
    bom: product.bom.map((item) => ({
      inventoryItemId: item.inventoryItemId,
      inventoryItemName: item.inventoryItemName,
      sku: item.sku,
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
    })),
    pricingRows: [
      {
        minQty: product.minOrderQuantity,
        maxQty: Math.max(product.minOrderQuantity * 10, 10),
        unitPrice: product.basePrice,
        currency: product.currency || "LKR",
        discountPercent: 0,
      },
    ],
  };
}

function buildAttributes(values: ProductFormSchemaValues) {
  const fromFields: { name: string; value: string; unit?: string }[] = [];
  const push = (name: string, value: string | number | undefined, unit?: string) => {
    if (value === undefined || value === null || value === "") return;
    fromFields.push({ name, value: String(value), unit });
  };
  push("Wattage", values.wattage, "W");
  push("Luminous Flux", values.lumenOutput, "lm");
  push("Efficacy", values.efficacy, "lm/W");
  push("Color Temperature", values.colorTemperature, "K");
  push("CRI", values.cri);
  push("Beam Angle", values.beamAngle, "°");
  push("IP Rating", values.ipRating);
  push("Input Voltage", values.inputVoltage);
  push("Power Factor", values.powerFactor);
  push("Dimming", values.dimming);
  push("Material", values.materialPrimary);
  push("Coating Finish", values.coatingFinish);
  push("Coating Process", values.coatingProcess);

  const existingKeys = new Set(fromFields.map((item) => item.name.toLowerCase()));
  const extras = values.attributes.filter(
    (item) => item.name && !existingKeys.has(item.name.toLowerCase()),
  );
  return [...fromFields, ...extras];
}

function toProductPayload(
  values: ProductFormSchemaValues,
  status: ProductFormData["status"],
): ProductFormData {
  const dimensions =
    values.lengthMm || values.widthMm || values.heightMm
      ? `${values.lengthMm ?? 0} × ${values.widthMm ?? 0} × ${values.heightMm ?? 0} mm`
      : values.dimensions;

  return {
    sku: values.sku,
    name: values.name,
    description: values.description,
    categoryId: values.categoryId,
    brandId: values.brandId,
    basePrice: values.pricingRows[0]?.unitPrice ?? values.basePrice,
    costPrice: values.costPrice,
    status,
    attributes: buildAttributes(values),
    leadTimeDays: values.leadTimeDays,
    minOrderQuantity: values.pricingRows[0]?.minQty ?? values.minOrderQuantity,
    tags: values.tags,
    weightKg: values.weightKg,
    dimensions,
  };
}

function TagsSyncEffect({
  onTagsInputChange,
}: {
  onTagsInputChange: (value: string) => void;
}) {
  const { values } = useFormikContext<ProductFormSchemaValues>();
  useEffect(() => {
    onTagsInputChange(values.tags.join(", "));
  }, [values.tags, onTagsInputChange]);
  return null;
}

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const { data: product, isLoading, isError, refetch } = useProduct(id ?? "");
  const { data: categoriesData } = useCategories({ page: 1, pageSize: 200 });
  const { data: brandsData } = useBrands({ page: 1, pageSize: 200 });
  const { data: inventoryData } = useInventoryItems({ page: 1, pageSize: 200 });
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const [tab, setTab] = useState<string>("overview");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [tagsInput, setTagsInput] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [saveMode, setSaveMode] = useState<"draft" | "close" | "publish">("draft");

  const initialValues = useMemo<ProductFormSchemaValues>(() => {
    if (product && isEditing) return toFormValues(product);
    return defaultValues;
  }, [product, isEditing]);

  const categoryOptions = useMemo(
    () =>
      (categoriesData?.items ?? []).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categoriesData?.items],
  );

  const brandOptions = useMemo(
    () =>
      (brandsData?.items ?? []).map((brand) => ({
        value: brand.id,
        label: brand.name,
      })),
    [brandsData?.items],
  );

  const inventoryOptions = useMemo(
    () =>
      (inventoryData?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.name} (${item.sku})`,
      })),
    [inventoryData?.items],
  );

  const handleSubmit = async (values: ProductFormSchemaValues) => {
    const status =
      saveMode === "publish" || values.isActive ? "active" : values.status;
    const payload = toProductPayload(values, status);

    if (isEditing && id) {
      await updateProduct.mutateAsync({ id, data: payload });
      if (saveMode === "close" || saveMode === "publish") {
        navigate(ROUTES.products.detail(id));
      }
      return;
    }

    const created = await createProduct.mutateAsync(payload);
    navigate(ROUTES.products.detail(created.id));
  };

  const busy = createProduct.isPending || updateProduct.isPending;

  return (
    <PageContainer maxWidth="full" className="!px-2 !py-2 sm:!px-3 lg:!px-4">
      <PageContent
        isLoading={isEditing && isLoading}
        error={isEditing && isError ? "Failed to load product." : null}
        onRetry={() => void refetch()}
        loadingVariant="card"
      >
        <FormikForm<ProductFormSchemaValues>
          initialValues={initialValues}
          validationSchema={productFormSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {(formik) => (
            <>
              <TagsSyncEffect onTagsInputChange={setTagsInput} />

              <PageHeader
                title="Add / Configure Product"
                description="Create a new product or configure all specifications and rules."
                className="mb-2"
                breadcrumbs={[
                  { label: "Sales", href: ROUTES.estimates.list },
                  { label: "Products", href: ROUTES.products.list },
                  { label: "Product Catalog", href: ROUTES.products.list },
                  { label: isEditing ? "Edit Product" : "Add / Configure Product" },
                ]}
                actions={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link to={ROUTES.products.list}>
                      <Button type="button" variant="outline" size="sm">
                        Back to Product Catalog
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      loading={busy && saveMode === "draft"}
                      onClick={() => setSaveMode("draft")}
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      loading={busy && saveMode === "close"}
                      onClick={() => setSaveMode("close")}
                      rightIcon={<ChevronDown className="h-3.5 w-3.5" />}
                    >
                      Save & Close
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      loading={busy && saveMode === "publish"}
                      onClick={() => setSaveMode("publish")}
                    >
                      Publish Product
                    </Button>
                  </div>
                }
              />

              <Tabs value={tab} onChange={setTab} className="mb-3">
                <TabList className="gap-0 overflow-x-auto">
                  {TABS.map((item) => (
                    <Tab
                      key={item.id}
                      value={item.id}
                      className="whitespace-nowrap rounded-none px-3 py-2 text-[12px]"
                    >
                      {item.label}
                    </Tab>
                  ))}
                </TabList>

                <TabPanel value="overview" className="pt-3">
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:col-span-9">
                      <div className="space-y-3">
                        <BasicInformationSection
                          categoryOptions={categoryOptions}
                          brandOptions={brandOptions}
                          onCreateCategory={(query) => {
                            setNewCategoryName(query);
                            setCategoryModalOpen(true);
                          }}
                          onCreateBrand={(query) => {
                            setNewBrandName(query);
                            setBrandModalOpen(true);
                          }}
                        />
                        <KeySpecsSection />
                        <OptionGroupsSection />
                        <PricingMatrixSection />
                      </div>
                      <div className="space-y-3">
                        <StatusAvailabilitySection />
                        <DimensionsSection />
                        <PowerElectricalSection />
                        <ComplianceSection />
                        <AccessoriesSection />
                      </div>
                    </div>
                    <div className="xl:col-span-3 xl:sticky xl:top-[72px] xl:self-start">
                      <ProductFormPreview
                        categoryLabel={
                          categoryOptions.find((o) => o.value === formik.values.categoryId)
                            ?.label ?? ""
                        }
                        brandLabel={
                          brandOptions.find((o) => o.value === formik.values.brandId)?.label ??
                          ""
                        }
                      />
                    </div>
                  </div>
                </TabPanel>

                <TabPanel value="technical" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <KeySpecsSection />
                      <div className="mt-3">
                        <PowerElectricalSection />
                      </div>
                    </div>
                    <ProductFormPreview
                      categoryLabel={
                        categoryOptions.find((o) => o.value === formik.values.categoryId)
                          ?.label ?? ""
                      }
                      brandLabel={
                        brandOptions.find((o) => o.value === formik.values.brandId)?.label ?? ""
                      }
                    />
                  </div>
                </TabPanel>

                <TabPanel value="dimensions" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-3">
                      <DimensionsSection />
                      <SectionCard title="Additional Size Notes">
                        <FormikInput name="dimensions" label="Dimensions (free text)" />
                        <div className="mt-2">
                          <FormikTextarea name="manufacturingNotes" label="Notes" rows={3} />
                        </div>
                      </SectionCard>
                    </div>
                    <ProductFormPreview
                      categoryLabel={
                        categoryOptions.find((o) => o.value === formik.values.categoryId)
                          ?.label ?? ""
                      }
                      brandLabel={
                        brandOptions.find((o) => o.value === formik.values.brandId)?.label ?? ""
                      }
                    />
                  </div>
                </TabPanel>

                <TabPanel value="materials" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="space-y-3 lg:col-span-2">
                      <SectionCard title="Materials">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <FormikInput name="materialPrimary" label="Primary Material" />
                          <FormikInput name="materialSecondary" label="Secondary Material" />
                        </div>
                      </SectionCard>
                      <BomSection onAddItem={() => setInventoryModalOpen(true)} />
                    </div>
                    <ProductFormPreview
                      categoryLabel={
                        categoryOptions.find((o) => o.value === formik.values.categoryId)
                          ?.label ?? ""
                      }
                      brandLabel={
                        brandOptions.find((o) => o.value === formik.values.brandId)?.label ?? ""
                      }
                    />
                  </div>
                </TabPanel>

                <TabPanel value="coating" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <SectionCard title="Coating Options" className="lg:col-span-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <FormikSelect
                          name="coatingFinish"
                          label="Finish"
                          options={[
                            { value: "", label: "Select finish" },
                            { value: "matte_black", label: "Matte Black" },
                            { value: "white", label: "White" },
                            { value: "brass", label: "Brass" },
                            { value: "chrome", label: "Chrome" },
                          ]}
                        />
                        <FormikSelect
                          name="coatingProcess"
                          label="Process"
                          options={[
                            { value: "", label: "Select process" },
                            { value: "powder_coat", label: "Powder Coat" },
                            { value: "anodize", label: "Anodize" },
                            { value: "paint", label: "Wet Paint" },
                          ]}
                        />
                      </div>
                    </SectionCard>
                    <ProductFormPreview
                      categoryLabel={
                        categoryOptions.find((o) => o.value === formik.values.categoryId)
                          ?.label ?? ""
                      }
                      brandLabel={
                        brandOptions.find((o) => o.value === formik.values.brandId)?.label ?? ""
                      }
                    />
                  </div>
                </TabPanel>

                <TabPanel value="pricing" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="space-y-3 lg:col-span-2">
                      <PricingMatrixSection />
                      <SectionCard title="Cost & Lead Time">
                        <div className="grid gap-2 sm:grid-cols-3">
                          <FormikInput name="costPrice" label="Cost Price" type="number" min={0} step={0.01} />
                          <FormikInput name="basePrice" label="List Price" type="number" min={0} step={0.01} />
                          <FormikInput name="leadTimeDays" label="Lead Time (days)" type="number" min={0} />
                        </div>
                      </SectionCard>
                    </div>
                    <ProductFormPreview
                      categoryLabel={
                        categoryOptions.find((o) => o.value === formik.values.categoryId)
                          ?.label ?? ""
                      }
                      brandLabel={
                        brandOptions.find((o) => o.value === formik.values.brandId)?.label ?? ""
                      }
                    />
                  </div>
                </TabPanel>

                <TabPanel value="images" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <SectionCard
                      title="Images & Attachments"
                      description="Upload product photos. First image is primary."
                      className="lg:col-span-2"
                    >
                      <ImageUploader
                        value={images}
                        onChange={setImages}
                        hint="PNG, JPG up to 5MB each"
                        maxSize={5 * 1024 * 1024}
                      />
                      <div className="mt-3">
                        <Input
                          label="Tags"
                          hint="Comma-separated"
                          value={tagsInput}
                          onChange={(event) => {
                            const raw = event.target.value;
                            setTagsInput(raw);
                            void formik.setFieldValue(
                              "tags",
                              raw
                                .split(",")
                                .map((tag) => tag.trim())
                                .filter(Boolean),
                            );
                          }}
                        />
                      </div>
                    </SectionCard>
                    <ProductFormPreview
                      categoryLabel={
                        categoryOptions.find((o) => o.value === formik.values.categoryId)
                          ?.label ?? ""
                      }
                      brandLabel={
                        brandOptions.find((o) => o.value === formik.values.brandId)?.label ?? ""
                      }
                    />
                  </div>
                </TabPanel>
              </Tabs>

              <CreateCategoryModal
                open={categoryModalOpen}
                onClose={() => setCategoryModalOpen(false)}
                defaultName={newCategoryName}
                onCreated={(categoryId) => void formik.setFieldValue("categoryId", categoryId)}
              />
              <CreateBrandModal
                open={brandModalOpen}
                onClose={() => setBrandModalOpen(false)}
                defaultName={newBrandName}
                onCreated={(brandId) => void formik.setFieldValue("brandId", brandId)}
              />
              <InventoryItemModal
                open={inventoryModalOpen}
                onClose={() => setInventoryModalOpen(false)}
                options={inventoryOptions}
                inventoryItems={inventoryData?.items ?? []}
              />
            </>
          )}
        </FormikForm>
      </PageContent>
    </PageContainer>
  );
}

function BasicInformationSection({
  categoryOptions,
  brandOptions,
  onCreateCategory,
  onCreateBrand,
}: {
  categoryOptions: { value: string; label: string }[];
  brandOptions: { value: string; label: string }[];
  onCreateCategory: (query: string) => void;
  onCreateBrand: (query: string) => void;
}) {
  const { values } = useFormikContext<ProductFormSchemaValues>();
  return (
    <SectionCard title="Basic Information">
      <div className="grid gap-2 sm:grid-cols-2">
        <FormikInput name="sku" label="SKU" required />
        <FormikInput name="baseModel" label="Base Model" placeholder="e.g. Linear Lite" />
        <FormikSearchableSelect
          name="categoryId"
          label="Product Family"
          options={categoryOptions}
          required
          onCreateNew={onCreateCategory}
          createNewLabel={(q) => `Create family "${q}"`}
        />
        <FormikSearchableSelect
          name="brandId"
          label="Brand"
          options={brandOptions}
          required
          onCreateNew={onCreateBrand}
          createNewLabel={(q) => `Create brand "${q}"`}
        />
        <FormikInput name="name" label="Product Name" required className="sm:col-span-2" />
        <div className="sm:col-span-2">
          <FormikTextarea name="description" label="Description" rows={4} required />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">
            {(values.description?.length ?? 0)} / 500
          </p>
        </div>
        <FormikSelect
          name="productType"
          label="Product Type"
          options={[
            { value: "finished_good", label: "Finished Good" },
            { value: "component", label: "Component" },
            { value: "raw_material", label: "Raw Material" },
            { value: "service", label: "Service" },
          ]}
          required
        />
        <FormikInput name="productFamily" label="Family Label" />
      </div>
    </SectionCard>
  );
}

function KeySpecsSection() {
  return (
    <SectionCard title="Key Specifications">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <FormikInput name="wattage" label="Wattage" type="number" min={0} hint="W" />
        <FormikInput name="lumenOutput" label="Lumen Output" type="number" min={0} hint="lm" />
        <FormikInput name="efficacy" label="Efficacy" type="number" min={0} hint="lm/W" />
        <FormikSelect
          name="colorTemperature"
          label="Color Temperature"
          options={[
            { value: "", label: "Select" },
            { value: "2700K", label: "2700K" },
            { value: "3000K", label: "3000K" },
            { value: "4000K", label: "4000K" },
            { value: "5000K", label: "5000K" },
          ]}
        />
        <FormikSelect
          name="cri"
          label="CRI"
          options={[
            { value: "", label: "Select" },
            { value: "80", label: "80" },
            { value: "90", label: "90" },
            { value: "95", label: "95" },
          ]}
        />
        <FormikSelect
          name="beamAngle"
          label="Beam Angle"
          options={[
            { value: "", label: "Select" },
            { value: "15°", label: "15°" },
            { value: "24°", label: "24°" },
            { value: "36°", label: "36°" },
            { value: "60°", label: "60°" },
            { value: "120°", label: "120°" },
          ]}
        />
        <FormikSelect
          name="ipRating"
          label="IP Rating"
          options={[
            { value: "", label: "Select" },
            { value: "IP20", label: "IP20" },
            { value: "IP44", label: "IP44" },
            { value: "IP65", label: "IP65" },
            { value: "IP67", label: "IP67" },
          ]}
        />
        <FormikSelect
          name="inputVoltage"
          label="Input Voltage"
          options={[
            { value: "", label: "Select" },
            { value: "100-240V AC", label: "100-240V AC" },
            { value: "220-240V AC", label: "220-240V AC" },
            { value: "24V DC", label: "24V DC" },
          ]}
        />
        <FormikInput name="powerFactor" label="Power Factor" type="number" min={0} max={1} step={0.01} />
        <FormikSelect
          name="dimming"
          label="Dimming"
          options={[
            { value: "", label: "Select" },
            { value: "None", label: "None" },
            { value: "TRIAC", label: "TRIAC" },
            { value: "0-10V", label: "0-10V" },
            { value: "DALI", label: "DALI" },
          ]}
        />
        <FormikInput name="opTempMin" label="Op. Temp Min" type="number" hint="°C" />
        <FormikInput name="opTempMax" label="Op. Temp Max" type="number" hint="°C" />
      </div>
    </SectionCard>
  );
}

function StatusAvailabilitySection() {
  return (
    <SectionCard title="Status & Availability">
      <div className="grid gap-2 sm:grid-cols-2">
        <FormikSelect
          name="status"
          label="Status"
          options={[
            { value: "inactive", label: "Draft" },
            { value: "active", label: "Active" },
          ]}
        />
        <FormikSelect
          name="availability"
          label="Availability"
          options={[
            { value: "in_stock", label: "In Stock" },
            { value: "made_to_order", label: "Made to Order" },
            { value: "out_of_stock", label: "Out of Stock" },
          ]}
        />
        <FormikInput name="leadTimeDays" label="Default Lead Time" type="number" min={0} hint="days" />
        <div className="flex items-end pb-1">
          <FormikCheckbox name="isActive" label="Active" />
        </div>
      </div>
    </SectionCard>
  );
}

function DimensionsSection() {
  return (
    <SectionCard title="Dimensions (Default)">
      <div className="grid gap-2 sm:grid-cols-2">
        <FormikInput name="lengthMm" label="Length" type="number" min={0} hint="mm" />
        <FormikInput name="widthMm" label="Width" type="number" min={0} hint="mm" />
        <FormikInput name="heightMm" label="Height" type="number" min={0} hint="mm" />
        <FormikInput name="weightKg" label="Weight" type="number" min={0} step={0.01} hint="kg" />
      </div>
    </SectionCard>
  );
}

function PowerElectricalSection() {
  return (
    <SectionCard title="Power & Electrical">
      <div className="grid gap-2 sm:grid-cols-2">
        <FormikInput name="inputPower" label="Input Power" type="number" min={0} hint="W" />
        <FormikInput name="inputCurrent" label="Input Current" type="number" min={0} step={0.01} hint="A" />
        <FormikSelect
          name="driverType"
          label="Driver Type"
          options={[
            { value: "", label: "Select" },
            { value: "constant_current", label: "Constant Current" },
            { value: "constant_voltage", label: "Constant Voltage" },
          ]}
        />
        <FormikInput name="driverBrand" label="Driver Brand" />
      </div>
    </SectionCard>
  );
}

function ComplianceSection() {
  return (
    <SectionCard title="Compliance & Warranty">
      <div className="grid gap-2 sm:grid-cols-2">
        <FormikSelect
          name="certifications"
          label="Certifications"
          options={[
            { value: "", label: "Select" },
            { value: "CE", label: "CE" },
            { value: "RoHS", label: "RoHS" },
            { value: "CE, RoHS", label: "CE, RoHS" },
            { value: "UL", label: "UL" },
          ]}
        />
        <FormikSelect
          name="warranty"
          label="Warranty"
          options={[
            { value: "", label: "Select" },
            { value: "1 Year", label: "1 Year" },
            { value: "2 Years", label: "2 Years" },
            { value: "3 Years", label: "3 Years" },
            { value: "5 Years", label: "5 Years" },
          ]}
        />
      </div>
    </SectionCard>
  );
}

function OptionGroupsSection() {
  const { values } = useFormikContext<ProductFormSchemaValues>();
  return (
    <SectionCard
      title="Configurable Option Groups"
      action={
        <FieldArray name="optionGroups">
          {({ push }) => (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-blue-600"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() =>
                push({ name: "", type: "Single Select", required: false, optionsText: "" })
              }
            >
              Add Option Group
            </Button>
          )}
        </FieldArray>
      }
    >
      <FieldArray name="optionGroups">
        {({ remove }) => (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2" />
                  <th className="py-1.5 pr-2">Group Name</th>
                  <th className="py-1.5 pr-2">Type</th>
                  <th className="py-1.5 pr-2">Required</th>
                  <th className="py-1.5 pr-2">Options</th>
                  <th className="py-1.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {values.optionGroups.map((_, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-1 text-muted-foreground">
                      <GripVertical className="h-3.5 w-3.5" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <FormikInput name={`optionGroups.${index}.name`} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <FormikSelect
                        name={`optionGroups.${index}.type`}
                        options={[
                          { value: "Single Select", label: "Single Select" },
                          { value: "Multi Select", label: "Multi Select" },
                          { value: "Text", label: "Text" },
                        ]}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <FormikCheckbox name={`optionGroups.${index}.required`} label="" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <FormikInput name={`optionGroups.${index}.optionsText`} placeholder="A, B, C" />
                    </td>
                    <td className="py-1.5">
                      <div className="flex gap-0.5">
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" aria-label="Copy">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          aria-label="Delete"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FieldArray>
    </SectionCard>
  );
}

function PricingMatrixSection() {
  const { values } = useFormikContext<ProductFormSchemaValues>();
  return (
    <SectionCard
      title="Pricing Matrix (Base Model Pricing)"
      action={
        <FieldArray name="pricingRows">
          {({ push }) => (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-blue-600"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() =>
                push({
                  minQty: 1,
                  maxQty: 10,
                  unitPrice: values.basePrice || 0,
                  currency: "LKR",
                  discountPercent: 0,
                })
              }
            >
              Add Pricing Row
            </Button>
          )}
        </FieldArray>
      }
    >
      <FieldArray name="pricingRows">
        {({ remove }) => (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2">Min Qty</th>
                  <th className="py-1.5 pr-2">Max Qty</th>
                  <th className="py-1.5 pr-2">Unit Price</th>
                  <th className="py-1.5 pr-2">Currency</th>
                  <th className="py-1.5 pr-2">Discount %</th>
                  <th className="py-1.5">Actions</th>
                </tr>
              </thead>
              <tbody>
                {values.pricingRows.map((_, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="py-1.5 pr-2">
                      <FormikInput name={`pricingRows.${index}.minQty`} type="number" min={1} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <FormikInput name={`pricingRows.${index}.maxQty`} type="number" min={1} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <FormikInput name={`pricingRows.${index}.unitPrice`} type="number" min={0} step={0.01} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <FormikSelect
                        name={`pricingRows.${index}.currency`}
                        options={[
                          { value: "LKR", label: "LKR" },
                        ]}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <FormikInput
                        name={`pricingRows.${index}.discountPercent`}
                        type="number"
                        min={0}
                        max={100}
                      />
                    </td>
                    <td className="py-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        aria-label="Delete row"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FieldArray>
    </SectionCard>
  );
}

function AccessoriesSection() {
  const { values } = useFormikContext<ProductFormSchemaValues>();
  return (
    <SectionCard
      title="Accessories (Optional)"
      action={
        <FieldArray name="accessories">
          {({ push }) => (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] text-blue-600"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => push({ name: "", sku: "", type: "Optional" })}
            >
              Add Accessory
            </Button>
          )}
        </FieldArray>
      }
    >
      <FieldArray name="accessories">
        {({ remove }) =>
          values.accessories.length === 0 ? (
            <p className="py-3 text-center text-[12px] text-muted-foreground">No accessories yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-[12px]">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-1.5 pr-2">Name</th>
                    <th className="py-1.5 pr-2">SKU</th>
                    <th className="py-1.5 pr-2">Type</th>
                    <th className="py-1.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {values.accessories.map((_, index) => (
                    <tr key={index} className="border-b border-border last:border-0">
                      <td className="py-1.5 pr-2">
                        <FormikInput name={`accessories.${index}.name`} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <FormikInput name={`accessories.${index}.sku`} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <FormikInput name={`accessories.${index}.type`} />
                      </td>
                      <td className="py-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => remove(index)}
                          aria-label="Remove accessory"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </FieldArray>
    </SectionCard>
  );
}

function BomSection({ onAddItem }: { onAddItem: () => void }) {
  const { values } = useFormikContext<ProductFormSchemaValues>();
  return (
    <SectionCard
      title="Bill of Materials"
      description="Components required to manufacture this product."
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-blue-600"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={onAddItem}
        >
          Add Inventory Item
        </Button>
      }
    >
      <FieldArray name="bom">
        {({ remove }) =>
          values.bom.length === 0 ? (
            <p className="py-4 text-center text-[12px] text-muted-foreground">No BOM items yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[12px]">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-1.5 pr-2">Item</th>
                    <th className="py-1.5 pr-2">SKU</th>
                    <th className="py-1.5 pr-2">Qty</th>
                    <th className="py-1.5 pr-2">Unit</th>
                    <th className="py-1.5 pr-2">Cost</th>
                    <th className="py-1.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {values.bom.map((bomItem, index) => (
                    <tr key={`${bomItem.inventoryItemId}-${index}`} className="border-b border-border last:border-0">
                      <td className="py-1.5 pr-2">{bomItem.inventoryItemName}</td>
                      <td className="py-1.5 pr-2 text-muted-foreground">{bomItem.sku}</td>
                      <td className="py-1.5 pr-2">
                        <FormikInput name={`bom.${index}.quantity`} type="number" min={0.01} step={0.01} />
                      </td>
                      <td className="py-1.5 pr-2">{bomItem.unit}</td>
                      <td className="py-1.5 pr-2">{formatCurrency(bomItem.unitCost ?? 0, "LKR")}</td>
                      <td className="py-1.5">
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => remove(index)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </FieldArray>
    </SectionCard>
  );
}

function InventoryItemModal({
  open,
  onClose,
  options,
  inventoryItems,
}: {
  open: boolean;
  onClose: () => void;
  options: { value: string; label: string }[];
  inventoryItems: InventoryItem[];
}) {
  const { values, setFieldValue } = useFormikContext<ProductFormSchemaValues>();

  const addInventoryToBom = (inventoryItemId: string) => {
    const item = inventoryItems.find((entry) => entry.id === inventoryItemId);
    if (!item) return;
    void setFieldValue("bom", [
      ...values.bom,
      {
        inventoryItemId: item.id,
        inventoryItemName: item.name,
        sku: item.sku,
        quantity: 1,
        unit: item.unit,
        unitCost: item.unitCost,
      },
    ]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Inventory Item"
      size="md"
      footer={
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <SearchableSelect
        label="Inventory Item"
        options={options}
        onChange={addInventoryToBom}
        placeholder="Search inventory items..."
      />
    </Modal>
  );
}
