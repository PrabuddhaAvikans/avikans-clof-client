import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FieldArray, useFormikContext } from "formik";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Box,
  ChevronDown,
  ChevronRight,
  Copy,
  GripVertical,
  Package,
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
  StatusBadge,
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
import { computeStandardCosts, loadCostingRates, type CostingRates } from "@/lib/costingRates";
import { CostingRatesForm } from "@/features/admin/components/CostingRatesForm";
import { ProductBomEditor, bomItemsToFormValues } from "@/features/products/components/ProductBomEditor";
import { bomLineInputFromFormValues } from "@/features/products/utils/bomFormValues";
import { ProductOperationsEditor } from "@/features/products/components/ProductOperationsEditor";
import { getCurrentVersion, getEditableVersion } from "@/lib/productVersion";
import { generateId } from "@/services/http";
import type { ProductFormData, ProductImage, ProductTypeValue } from "@/types/product";
import type { InventoryItem } from "@/types/inventory";

const ALL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "materials", label: "Materials & BOM" },
  { id: "manufacturing", label: "Manufacturing Operations" },
  { id: "costing", label: "Costing & Profitability" },
  { id: "images", label: "Images & Attachments" },
] as const;

const PRODUCT_TYPE_TABS: Record<string, Set<string>> = {
  custom_lighting: new Set(["overview", "materials", "manufacturing", "costing", "images"]),
  finished_good: new Set(["overview", "materials", "manufacturing", "costing", "images"]),
  component: new Set(["overview", "materials", "costing", "images"]),
  raw_material: new Set(["overview", "costing", "images"]),
  service: new Set(["overview", "costing", "images"]),
};

const defaultValues: ProductFormSchemaValues = {
  name: "",
  code: "",
  sku: "",
  description: "",
  shortDescription: "",
  categoryId: "",
  brandId: "",
  productType: "custom_lighting",
  baseModel: "",
  productFamily: "",
  status: "inactive",
  availability: "in_stock",
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
  operations: [],
  costBreakdown: {
    materialCost: 0,
    labourCost: 0,
    coatingFinishingCost: 0,
    machineCost: 0,
    overheadCost: 0,
    otherCost: 0,
    notes: "",
    overrideMaterial: false,
    overrideLabour: false,
    overrideCoating: false,
    overrideMachine: false,
    overrideOverhead: false,
  },
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
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-md border border-border bg-card p-3 ${className ?? ""}`}>
      {(title || description || action) ? (
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            {title ? <h2 className="text-sm font-semibold text-foreground">{title}</h2> : null}
            {description ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
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
  const version = getEditableVersion(product) ?? getCurrentVersion(product);
  const dims = version.specifications.dimensions?.match(/(\d+)\s*[Ã—x]\s*(\d+)\s*[Ã—x]\s*(\d+)/i);
  return {
    ...defaultValues,
    name: product.name,
    code: product.sku.split("-")[0] ?? "",
    sku: product.sku,
    description: product.description,
    shortDescription: product.description.slice(0, 120),
    categoryId: product.categoryId,
    brandId: product.brandId,
    productType: product.productType,
    productFamily: product.categoryName,
    baseModel: product.brandName,
    status: product.status,
    tags: version.tags,
    basePrice: version.basePrice,
    costPrice: version.costPrice,
    leadTimeDays: version.leadTimeDays,
    minOrderQuantity: version.minOrderQuantity,
    weightKg: version.specifications.weightKg,
    dimensions: version.specifications.dimensions ?? "",
    lengthMm: version.specifications.lengthMm ?? (dims ? Number(dims[1]) : undefined),
    widthMm: version.specifications.widthMm ?? (dims ? Number(dims[2]) : undefined),
    heightMm: version.specifications.heightMm ?? (dims ? Number(dims[3]) : undefined),
    wattage: version.specifications.wattage ?? (Number(attrValue(version.attributes, "Wattage")) || undefined),
    lumenOutput: version.specifications.lumenOutput ?? (Number(attrValue(version.attributes, "Luminous Flux")) || undefined),
    colorTemperature: version.specifications.colorTemperature ?? attrValue(version.attributes, "Color Temperature"),
    cri: version.specifications.cri ?? attrValue(version.attributes, "CRI"),
    beamAngle: version.specifications.beamAngle ?? attrValue(version.attributes, "Beam Angle"),
    ipRating: version.specifications.ipRating ?? attrValue(version.attributes, "IP Rating"),
    materialPrimary: version.specifications.materialPrimary ?? attrValue(version.attributes, "Material"),
    attributes: version.attributes.map(({ name, value, unit }) => ({ name, value, unit })),
    bom: bomItemsToFormValues(version.bom),
    operations: version.operations.map((op) => ({
      id: op.id,
      name: op.name,
      sequence: op.sequence,
      description: op.description,
      workstation: op.workstation,
      estimatedHours: op.estimatedHours,
      labourCostRate: op.labourCostRate,
      machineName: op.machineName,
      machineCost: op.machineCost,
      isRequired: op.isRequired,
      isEnabled: op.isEnabled,
      notes: op.notes,
    })),
    costBreakdown: {
      materialCost: version.costBreakdown.materialCost,
      labourCost: version.costBreakdown.labourCost,
      coatingFinishingCost: version.costBreakdown.coatingFinishingCost,
      machineCost: version.costBreakdown.machineCost,
      overheadCost: version.costBreakdown.overheadCost,
      otherCost: version.costBreakdown.otherCost,
      notes: version.costBreakdown.notes,
      overrideMaterial: false,
      overrideLabour: false,
      overrideCoating: false,
      overrideMachine: false,
      overrideOverhead: false,
    },
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
  push("Beam Angle", values.beamAngle, "Â°");
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

function toProductImages(images: UploadedImage[]): ProductImage[] {
  return images.map((image, index) => ({
    id: image.id.startsWith("img-") ? image.id : generateId("img"),
    url: image.previewUrl,
    alt: image.file?.name,
    isPrimary: Boolean(image.isPrimary) || index === 0,
    sortOrder: index,
  }));
}

function toProductPayload(
  values: ProductFormSchemaValues,
  status: ProductFormData["status"],
  images: UploadedImage[] = [],
): ProductFormData {
  const dimensions =
    values.lengthMm || values.widthMm || values.heightMm
      ? `${values.lengthMm ?? 0} Ã— ${values.widthMm ?? 0} Ã— ${values.heightMm ?? 0} mm`
      : values.dimensions;

  return {
    sku: values.sku,
    name: values.name,
    description: values.description,
    categoryId: values.categoryId,
    brandId: values.brandId,
    productType: values.productType as ProductTypeValue,
    basePrice: values.pricingRows[0]?.unitPrice ?? values.basePrice,
    costPrice: values.costPrice,
    status,
    attributes: buildAttributes(values),
    leadTimeDays: values.leadTimeDays,
    minOrderQuantity: values.pricingRows[0]?.minQty ?? values.minOrderQuantity,
    tags: values.tags,
    weightKg: values.weightKg,
    dimensions,
    bom: bomLineInputFromFormValues(values.bom),
    operations: values.operations,
    costBreakdown: {
      materialCost: Number(values.costBreakdown.materialCost) || 0,
      labourCost: Number(values.costBreakdown.labourCost) || 0,
      coatingFinishingCost: Number(values.costBreakdown.coatingFinishingCost) || 0,
      machineCost: Number(values.costBreakdown.machineCost) || 0,
      overheadCost: Number(values.costBreakdown.overheadCost) || 0,
      otherCost: Number(values.costBreakdown.otherCost) || 0,
      notes: values.costBreakdown.notes,
    },
    specifications: {
      weightKg: values.weightKg,
      dimensions,
      lengthMm: values.lengthMm,
      widthMm: values.widthMm,
      heightMm: values.heightMm,
      wattage: values.wattage,
      lumenOutput: values.lumenOutput,
      efficacy: values.efficacy,
      colorTemperature: values.colorTemperature,
      cri: values.cri,
      beamAngle: values.beamAngle,
      ipRating: values.ipRating,
      inputVoltage: values.inputVoltage,
      powerFactor: values.powerFactor,
      dimming: values.dimming,
      opTempMin: values.opTempMin,
      opTempMax: values.opTempMax,
      inputPower: values.inputPower,
      inputCurrent: values.inputCurrent,
      driverType: values.driverType,
      driverBrand: values.driverBrand,
      coatingFinish: values.coatingFinish,
      coatingProcess: values.coatingProcess,
      materialPrimary: values.materialPrimary,
      materialSecondary: values.materialSecondary,
      certifications: values.certifications,
      warranty: values.warranty,
      manufacturingNotes: values.manufacturingNotes,
    },
    images: toProductImages(images),
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

  useEffect(() => {
    if (!isEditing || !product) return;
    const version = getEditableVersion(product) ?? getCurrentVersion(product);
    setImages(
      (version?.images ?? []).map((image) => ({
        id: image.id,
        previewUrl: image.url,
        isPrimary: image.isPrimary,
      })),
    );
  }, [isEditing, product]);

  const previewImageUrl =
    images.find((image) => image.isPrimary)?.previewUrl ?? images[0]?.previewUrl;

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

  const editableVersion = product ? getEditableVersion(product) : undefined;
  const isLockedEdit = isEditing && product && !editableVersion;

  const handleSubmit = async (values: ProductFormSchemaValues) => {
    if (isLockedEdit) return;
    const status =
      saveMode === "publish" ? "active" : values.status;
    const payload = toProductPayload(values, status, images);

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
              {isLockedEdit && (
                <div className="mb-3 rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground">
                  This product has no editable draft version. Create a revision from the product
                  detail page before making specification or BOM changes.
                </div>
              )}
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

              <ProductTypeTabs
                productType={formik.values.productType}
                tab={tab}
                onTabChange={setTab}
              >
                <TabPanel value="overview" className="pt-3">
                  <OverviewTab
                    categoryOptions={categoryOptions}
                    brandOptions={brandOptions}
                    previewImageUrl={previewImageUrl}
                    onCreateCategory={(query) => {
                      setNewCategoryName(query);
                      setCategoryModalOpen(true);
                    }}
                    onCreateBrand={(query) => {
                      setNewBrandName(query);
                      setBrandModalOpen(true);
                    }}
                  />
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
                      previewImageUrl={previewImageUrl}
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
                      previewImageUrl={previewImageUrl}
                    />
                  </div>
                </TabPanel>

                <TabPanel value="materials" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <ProductBomEditor
                        onAddItem={() => setInventoryModalOpen(true)}
                        currency="LKR"
                      />
                    </div>
                    <div className="lg:sticky lg:top-[72px] lg:self-start">
                      <BomTreePanel
                        productName={formik.values.name || "Untitled Product"}
                        bom={formik.values.bom}
                        currency="LKR"
                      />
                    </div>
                  </div>
                </TabPanel>

                <TabPanel value="manufacturing" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="space-y-3 lg:col-span-2">
                      <SectionCard
                        title="Manufacturing Operations"
                        description="Define the routing steps used to create manufacturing jobs."
                      >
                        <ProductOperationsEditor />
                      </SectionCard>
                    </div>
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
                </TabPanel>

                <TabPanel value="costing" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="space-y-3 lg:col-span-2">
                      <CostBreakdownSection />
                    </div>
                    {/* <div className="lg:sticky lg:top-[72px] lg:self-start">
                      <SectionCard>
                        <CostingRatesForm
                          compact
                          onSaved={() => window.dispatchEvent(new Event("ats-costing-rates-updated"))}
                        />
                      </SectionCard>
                    </div> */}
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
                      previewImageUrl={previewImageUrl}
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
                      previewImageUrl={previewImageUrl}
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
                      previewImageUrl={previewImageUrl}
                    />
                  </div>
                </TabPanel>
              </ProductTypeTabs>

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

function BomTreePanel({
  productName,
  bom,
  currency,
}: {
  productName: string;
  bom: ProductFormSchemaValues["bom"];
  currency: string;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set(bom.map((_, i) => i)));

  const toggleItem = (index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const totalCost = bom.reduce((sum, line) => {
    const qty = Number(line.quantity) || 0;
    const waste = Number(line.wastePercent) || 0;
    const reqQty = qty * (1 + waste / 100);
    return sum + reqQty * (Number(line.unitCost) || 0);
  }, 0);

  return (
    <SectionCard title="Product Structure" description="Visual BOM tree for this product.">
      <div className="space-y-1">
        {/* Root node */}
        <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground truncate">{productName}</span>
        </div>

        {bom.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No components added yet.
          </p>
        ) : (
          <div className="ml-2 border-l-2 border-border pl-1">
            {bom.map((line, index) => {
              const qty = Number(line.quantity) || 0;
              const waste = Number(line.wastePercent) || 0;
              const reqQty = qty * (1 + waste / 100);
              const lineCost = reqQty * (Number(line.unitCost) || 0);
              const isExpanded = expanded.has(index);

              return (
                <div key={`${line.inventoryItemId}-${index}`} className="relative">
                  {/* Connector line */}
                  <div className="absolute -left-1 top-3.5 h-px w-3 bg-border" />

                  <div className="ml-3">
                    <button
                      type="button"
                      onClick={() => toggleItem(index)}
                      className="flex w-full items-start gap-1.5 rounded-md px-2 py-1.5 text-left hover:bg-muted/50 transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                      <Box className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-foreground truncate">
                          {line.inventoryItemName || "Unnamed"}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{line.sku}</div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="ml-7 mb-1 rounded-md border border-border bg-muted/20 px-2.5 py-2 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Quantity</span>
                          <span className="font-medium">{qty} {line.unit}</span>
                        </div>
                        {waste > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Waste</span>
                            <span className="font-medium">{waste}%</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Required</span>
                          <span className="font-medium">{reqQty.toFixed(2)} {line.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Line Cost</span>
                          <span className="font-medium">{formatCurrency(lineCost, currency)}</span>
                        </div>
                        {line.notes && (
                          <div className="text-muted-foreground italic truncate">
                            {line.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Total footer */}
        {bom.length > 0 && (
          <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">{bom.length} component{bom.length !== 1 ? "s" : ""}</span>
            <span className="font-semibold">{formatCurrency(totalCost, currency)}</span>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function ProductTypeTabs({
  productType,
  tab,
  onTabChange,
  children,
}: {
  productType: string;
  tab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
}) {
  const allowedTabs = PRODUCT_TYPE_TABS[productType] ?? PRODUCT_TYPE_TABS.finished_good;
  const visibleTabs = ALL_TABS.filter((t) => allowedTabs.has(t.id));

  useEffect(() => {
    if (!allowedTabs.has(tab)) {
      onTabChange("overview");
    }
  }, [productType, tab, allowedTabs, onTabChange]);

  return (
    <Tabs value={tab} onChange={onTabChange} className="mb-3">
      <TabList className="gap-0 overflow-x-auto">
        {visibleTabs.map((item) => (
          <Tab
            key={item.id}
            value={item.id}
            className="whitespace-nowrap rounded-none px-3 py-2 text-[12px]"
          >
            {item.label}
          </Tab>
        ))}
      </TabList>
      {children}
    </Tabs>
  );
}

const PRODUCT_TYPE_SECTIONS: Record<string, Set<string>> = {
  finished_good: new Set(["keySpecs", "powerElectrical", "dimensions", "compliance", "accessories", "pricingMatrix"]),
  custom_lighting: new Set(["keySpecs", "powerElectrical", "dimensions", "compliance", "accessories", "pricingMatrix"]),
  component: new Set(["dimensions", "pricingMatrix"]),
  raw_material: new Set(["dimensions", "pricingMatrix"]),
  service: new Set(["pricingMatrix"]),
};

function getVisibleSections(productType: string): Set<string> {
  return PRODUCT_TYPE_SECTIONS[productType] ?? PRODUCT_TYPE_SECTIONS.finished_good;
}

function OverviewTab({
  categoryOptions,
  brandOptions,
  previewImageUrl,
  onCreateCategory,
  onCreateBrand,
}: {
  categoryOptions: { value: string; label: string }[];
  brandOptions: { value: string; label: string }[];
  previewImageUrl?: string;
  onCreateCategory: (query: string) => void;
  onCreateBrand: (query: string) => void;
}) {
  const { values } = useFormikContext<ProductFormSchemaValues>();
  const visible = getVisibleSections(values.productType);

  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:col-span-9">
        <div className="space-y-3">
          <BasicInformationSection
            categoryOptions={categoryOptions}
            brandOptions={brandOptions}
            onCreateCategory={onCreateCategory}
            onCreateBrand={onCreateBrand}
          />
          {visible.has("keySpecs") && <KeySpecsSection />}
          <PricingMatrixSection />
        </div>
        <div className="space-y-3">
          <StatusAvailabilitySection />
          {visible.has("dimensions") && <DimensionsSection />}
          {visible.has("powerElectrical") && <PowerElectricalSection />}
          {visible.has("compliance") && <ComplianceSection />}
          {visible.has("accessories") && <AccessoriesSection />}
        </div>
      </div>
      <div className="xl:col-span-3 xl:sticky xl:top-[72px] xl:self-start">
        <ProductFormPreview
          categoryLabel={categoryOptions.find((o) => o.value === values.categoryId)?.label ?? ""}
          brandLabel={brandOptions.find((o) => o.value === values.brandId)?.label ?? ""}
          previewImageUrl={previewImageUrl}
        />
      </div>
    </div>
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
            { value: "custom_lighting", label: "Custom Lighting" },
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
            { value: "15Â°", label: "15Â°" },
            { value: "24Â°", label: "24Â°" },
            { value: "36Â°", label: "36Â°" },
            { value: "60Â°", label: "60Â°" },
            { value: "120Â°", label: "120Â°" },
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
        <FormikInput name="opTempMin" label="Op. Temp Min" type="number" hint="Â°C" />
        <FormikInput name="opTempMax" label="Op. Temp Max" type="number" hint="Â°C" />
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

function CostBreakdownSection() {
  const { values, setFieldValue } = useFormikContext<ProductFormSchemaValues>();
  const [rates, setRates] = useState<CostingRates>(loadCostingRates);

  useEffect(() => {
    const refresh = () => setRates(loadCostingRates());
    window.addEventListener("ats-costing-rates-updated", refresh);
    return () => window.removeEventListener("ats-costing-rates-updated", refresh);
  }, []);

  const computed = useMemo(
    () => computeStandardCosts(values.bom ?? [], values.operations ?? [], rates),
    [values.bom, values.operations, rates],
  );

  const labourHours = useMemo(
    () =>
      (values.operations ?? [])
        .filter((op) => op.isEnabled !== false)
        .reduce((sum, op) => sum + (Number(op.estimatedHours) || 0), 0),
    [values.operations],
  );

  const cb = values.costBreakdown;

  useEffect(() => {
    if (!cb.overrideMaterial && cb.materialCost !== computed.materialCost) {
      void setFieldValue("costBreakdown.materialCost", computed.materialCost);
    }
    if (!cb.overrideLabour && cb.labourCost !== computed.labourCost) {
      void setFieldValue("costBreakdown.labourCost", computed.labourCost);
    }
    if (!cb.overrideCoating && cb.coatingFinishingCost !== computed.coatingFinishingCost) {
      void setFieldValue("costBreakdown.coatingFinishingCost", computed.coatingFinishingCost);
    }
    if (!cb.overrideMachine && cb.machineCost !== computed.machineCost) {
      void setFieldValue("costBreakdown.machineCost", computed.machineCost);
    }
    if (!cb.overrideOverhead && cb.overheadCost !== computed.overheadCost) {
      void setFieldValue("costBreakdown.overheadCost", computed.overheadCost);
    }
  }, [
    cb.overrideMaterial,
    cb.overrideLabour,
    cb.overrideCoating,
    cb.overrideMachine,
    cb.overrideOverhead,
    cb.materialCost,
    cb.labourCost,
    cb.coatingFinishingCost,
    cb.machineCost,
    cb.overheadCost,
    computed,
    setFieldValue,
  ]);

  const rows = [
    {
      key: "material",
      label: "Materials",
      basis: values.bom.length
        ? `${values.bom.length} BOM line${values.bom.length === 1 ? "" : "s"}`
        : "No BOM lines",
      computed: computed.materialCost,
      amountName: "costBreakdown.materialCost" as const,
      overrideName: "costBreakdown.overrideMaterial" as const,
      override: Boolean(cb.overrideMaterial),
      amount: Number(cb.materialCost) || 0,
    },
    {
      key: "labour",
      label: "Labour",
      basis: `${labourHours.toFixed(2)} h Ã— ${formatCurrency(rates.labourRatePerHour, "LKR")}/h`,
      computed: computed.labourCost,
      amountName: "costBreakdown.labourCost" as const,
      overrideName: "costBreakdown.overrideLabour" as const,
      override: Boolean(cb.overrideLabour),
      amount: Number(cb.labourCost) || 0,
    },
    {
      key: "coating",
      label: "Coating / finishing",
      basis: `Fixed ${formatCurrency(rates.coatingCostPerUnit, "LKR")} / unit`,
      computed: computed.coatingFinishingCost,
      amountName: "costBreakdown.coatingFinishingCost" as const,
      overrideName: "costBreakdown.overrideCoating" as const,
      override: Boolean(cb.overrideCoating),
      amount: Number(cb.coatingFinishingCost) || 0,
    },
    {
      key: "machine",
      label: "Machine",
      basis: `Ops cost or ${formatCurrency(rates.machineRatePerHour, "LKR")}/h`,
      computed: computed.machineCost,
      amountName: "costBreakdown.machineCost" as const,
      overrideName: "costBreakdown.overrideMachine" as const,
      override: Boolean(cb.overrideMachine),
      amount: Number(cb.machineCost) || 0,
    },
    {
      key: "overhead",
      label: "Overhead",
      basis: `${rates.overheadPercent}% of material, labour, machine and coating`,
      computed: computed.overheadCost,
      amountName: "costBreakdown.overheadCost" as const,
      overrideName: "costBreakdown.overrideOverhead" as const,
      override: Boolean(cb.overrideOverhead),
      amount: Number(cb.overheadCost) || 0,
    },
    {
      key: "other",
      label: "Other",
      basis: "Manual entry",
      computed: Number(cb.otherCost) || 0,
      amountName: "costBreakdown.otherCost" as const,
      overrideName: null,
      override: true,
      amount: Number(cb.otherCost) || 0,
    },
  ];

  const totalCost = rows.reduce((sum, row) => sum + row.amount, 0);
  const sellingPrice = Number(values.pricingRows[0]?.unitPrice) || Number(values.basePrice) || 0;
  const margin = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;
  const markup = totalCost > 0 ? ((sellingPrice - totalCost) / totalCost) * 100 : 0;
  const profit = sellingPrice - totalCost;

  const toggleCustom = (overrideName: string, next: boolean, computedAmount: number, amountName: string) => {
    void setFieldValue(overrideName, next);
    if (!next) void setFieldValue(amountName, computedAmount);
  };

  return (
    <>
      <SectionCard
        title="Cost sheet"
        description="Standard amounts are calculated from BOM, operations and company rates. Use Custom only when this product needs a different figure."
      >
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40">
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">Cost element</th>
                <th className="px-3 py-2 text-left font-medium">Basis</th>
                <th className="px-3 py-2 text-left font-medium">Source</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-right font-medium">Share</th>
                <th className="px-3 py-2 text-right font-medium"> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-border align-middle">
                  <td className="px-3 py-2.5 font-medium">{row.label}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{row.basis}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge
                      variant={row.overrideName && row.override ? "warning" : "info"}
                      size="sm"
                    >
                      {row.overrideName ? (row.override ? "Custom" : "Standard") : "Manual"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {row.override ? (
                      <div className="ml-auto max-w-[140px]">
                        <FormikInput name={row.amountName} type="number" min={0} step={0.01} />
                      </div>
                    ) : (
                      <span className="tabular-nums font-medium">
                        {formatCurrency(row.computed, "LKR")}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                    {totalCost > 0 ? ((row.amount / totalCost) * 100).toFixed(1) : "0.0"}%
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {row.overrideName ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px]"
                        onClick={() =>
                          toggleCustom(row.overrideName!, !row.override, row.computed, row.amountName)
                        }
                      >
                        {row.override ? "Use standard" : "Custom"}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-muted/30">
              <tr>
                <td className="px-3 py-2.5 font-semibold" colSpan={3}>
                  Total estimated cost
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                  {formatCurrency(totalCost, "LKR")}
                </td>
                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">100%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="mt-3">
          <FormikTextarea name="costBreakdown.notes" label="Costing notes" rows={2} />
        </div>
      </SectionCard>

      <SectionCard title="Profitability">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total cost</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(totalCost, "LKR")}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Selling price</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(sellingPrice, "LKR")}</p>
          </div>
          <div className={`rounded-md border p-3 ${profit >= 0 ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Gross profit</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${profit >= 0 ? "text-success" : "text-destructive"}`}>
              {formatCurrency(profit, "LKR")}
            </p>
          </div>
          <div className={`rounded-md border p-3 ${margin >= 0 ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Margin / markup</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${margin >= 0 ? "text-success" : "text-destructive"}`}>
              {margin.toFixed(1)}% / {markup.toFixed(1)}%
            </p>
          </div>
        </div>
      </SectionCard>
    </>
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
        unitCost: item.costPrice,
        wastePercent: 0,
        isRequired: true,
        notes: "",
        alternatives: [],
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
