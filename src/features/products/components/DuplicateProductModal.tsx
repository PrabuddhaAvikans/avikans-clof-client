import { useMemo, useState } from "react";
import { Copy, Save } from "lucide-react";
import { FormikForm, FormikInput, FormikSelect, FormikTextarea } from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Modal } from "@/components/ui/Modal";
import { useBrands } from "@/features/products/hooks/useBrands";
import { useCategories } from "@/features/products/hooks/useCategories";
import { useCreateProduct } from "@/features/products/hooks/useProducts";
import {
  buildDuplicateProductCreatePayload,
  buildDuplicateProductFormValues,
  duplicateProductFormSchema,
  summarizeDuplicateProduct,
  type DuplicateProductFormValues,
} from "@/features/products/lib/duplicateProduct";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types/product";
import { ProductTypeLabels } from "@/types/product";
import { toast } from "@/components/feedback/toast";

export type DuplicateProductModalProps = {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onCreated: (created: Product) => void;
};

const STATUS_OPTIONS = [
  { value: "inactive", label: "Inactive" },
  { value: "active", label: "Active" },
];

const PRODUCT_TYPE_OPTIONS = Object.entries(ProductTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

export function DuplicateProductModal({
  open,
  product,
  onClose,
  onCreated,
}: DuplicateProductModalProps) {
  const createProduct = useCreateProduct();
  const { data: categoriesData } = useCategories({ page: 1, pageSize: 200 });
  const { data: brandsData } = useBrands({ page: 1, pageSize: 200 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<DuplicateProductFormValues | null>(
    null,
  );

  const initialValues = useMemo(
    () => (product ? buildDuplicateProductFormValues(product) : null),
    [product],
  );

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

  const summary = pendingValues ? summarizeDuplicateProduct(pendingValues) : null;

  const handleModalClose = () => {
    if (confirmOpen) {
      setConfirmOpen(false);
      return;
    }
    setPendingValues(null);
    onClose();
  };

  const handleRequestCreate = async (values: DuplicateProductFormValues) => {
    setPendingValues(values);
    setConfirmOpen(true);
  };

  const handleConfirmCreate = async () => {
    if (!product || !pendingValues) return;
    try {
      const payload = buildDuplicateProductCreatePayload(product, pendingValues);
      const created = await createProduct.mutateAsync(payload);
      setConfirmOpen(false);
      setPendingValues(null);
      toast.success(`Product ${created.sku} created successfully.`);
      onCreated(created);
      onClose();
    } catch {
      toast.error("Failed to create duplicated product");
    }
  };

  if (!product || !initialValues) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={handleModalClose}
        title={`Duplicate Product - ${product.sku}`}
        size="full"
        className="h-[min(90vh,48rem)] max-h-[90vh]"
        closeOnOverlayClick={!confirmOpen}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Review and edit the copy. A new product is created only after you confirm.
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="duplicate-product-form"
                variant="primary"
                leftIcon={<Save className="h-4 w-4" />}
                disabled={createProduct.isPending}
              >
                Save Duplicate
              </Button>
            </div>
          </div>
        }
      >
        <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/30 px-4 py-3">
          <Copy className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Copied from{" "}
            <span className="font-medium text-foreground">
              {product.name} ({product.sku})
            </span>
            . BOM and attributes are copied. Images and version history are not. Defaults to{" "}
            <span className="font-medium text-foreground">Inactive</span>.
          </p>
        </div>

        <FormikForm<DuplicateProductFormValues>
          id="duplicate-product-form"
          key={product.id}
          initialValues={initialValues}
          validationSchema={duplicateProductFormSchema}
          onSubmit={handleRequestCreate}
          enableReinitialize
          className="space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormikInput name="name" label="Product Name" required />
            </div>
            <FormikInput name="sku" label="SKU" required />
            <FormikSelect
              name="status"
              label="Status"
              options={STATUS_OPTIONS}
              required
            />
            <FormikSelect
              name="categoryId"
              label="Category"
              options={categoryOptions}
              required
            />
            <FormikSelect name="brandId" label="Brand" options={brandOptions} required />
            <FormikSelect
              name="productType"
              label="Product Type"
              options={PRODUCT_TYPE_OPTIONS}
              required
            />
            <FormikInput name="basePrice" label="Base Price (LKR)" type="number" min={0} step={0.01} required />
            <FormikInput name="costPrice" label="Cost Price (LKR)" type="number" min={0} step={0.01} required />
            <FormikInput name="leadTimeDays" label="Lead Time (days)" type="number" min={0} required />
            <FormikInput name="minOrderQuantity" label="Min Order Qty" type="number" min={1} required />
            <FormikInput name="weightKg" label="Weight (kg)" type="number" min={0} step={0.01} />
            <FormikInput name="dimensions" label="Dimensions" />
            <div className="sm:col-span-2">
              <FormikInput
                name="tagsText"
                label="Tags"
                hint="Comma-separated"
              />
            </div>
            <div className="sm:col-span-2">
              <FormikTextarea
                name="description"
                label="Description"
                rows={4}
                required
              />
            </div>
          </div>
        </FormikForm>
      </Modal>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirmCreate()}
        title="Create this product as a new product?"
        confirmLabel="Confirm & Create"
        cancelLabel="Cancel"
        loading={createProduct.isPending}
      >
        {summary && (
          <dl className="mt-3 space-y-2 rounded-md border border-border bg-muted/20 px-3 py-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="max-w-[60%] truncate text-right font-medium text-foreground" title={summary.name}>
                {summary.name}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">SKU</dt>
              <dd className="font-medium text-foreground">{summary.sku}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium text-foreground">
                {ProductTypeLabels [summary.productType] ?? summary.productType}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize text-foreground">{summary.status}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Base Price</dt>
              <dd className="font-medium tabular-nums text-foreground">
                {formatCurrency(summary.basePrice, "LKR")}
              </dd>
            </div>
          </dl>
        )}
      </ConfirmationDialog>
    </>
  );
}
