import * as yup from "yup";
import type { Product, ProductFormData, ProductTypeValue } from "@/types/product";
import type { EntityStatus } from "@/types/common";

export type DuplicateProductFormValues = {
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  brandId: string;
  productType: ProductTypeValue;
  status: EntityStatus;
  basePrice: number;
  costPrice: number;
  leadTimeDays: number;
  minOrderQuantity: number;
  tagsText: string;
  weightKg?: number;
  dimensions: string;
};

export const duplicateProductFormSchema = yup.object({
  name: yup.string().min(2, "Product name must be at least 2 characters").required(),
  sku: yup.string().min(2, "SKU is required").required(),
  description: yup.string().min(1, "Description is required").required(),
  categoryId: yup.string().min(1, "Category is required").required(),
  brandId: yup.string().min(1, "Brand is required").required(),
  productType: yup.string().min(1, "Product type is required").required(),
  status: yup.string().oneOf(["active", "inactive"] as const).required(),
  basePrice: yup.number().min(0).required(),
  costPrice: yup.number().min(0).required(),
  leadTimeDays: yup.number().min(0).required(),
  minOrderQuantity: yup.number().min(1).required(),
  tagsText: yup.string().optional(),
  weightKg: yup
    .number()
    .transform((value, original) =>
      original === "" || original === null || original === undefined ? undefined : value,
    )
    .min(0)
    .optional(),
  dimensions: yup.string().optional(),
});

export function buildDuplicateProductFormValues(
  product: Product,
): DuplicateProductFormValues {
  return {
    name: `${product.name} (Copy)`,
    sku: `${product.sku}-COPY`,
    description: product.description,
    categoryId: product.categoryId,
    brandId: product.brandId,
    productType: product.productType,
    status: "inactive",
    basePrice: product.basePrice,
    costPrice: product.costPrice,
    leadTimeDays: product.leadTimeDays,
    minOrderQuantity: product.minOrderQuantity,
    tagsText: product.tags.join(", "),
    weightKg: product.weightKg,
    dimensions: product.dimensions ?? "",
  };
}

export function buildDuplicateProductCreatePayload(
  product: Product,
  values: DuplicateProductFormValues,
): ProductFormData {
  const tags = values.tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    sku: values.sku.trim(),
    name: values.name.trim(),
    description: values.description.trim(),
    categoryId: values.categoryId,
    brandId: values.brandId,
    productType: values.productType,
    customerId: product.customerId,
    projectId: product.projectId,
    projectName: product.projectName,
    basePrice: values.basePrice,
    costPrice: values.costPrice,
    status: values.status,
    attributes: product.attributes.map(({ name, value, unit }) => ({
      name,
      value,
      unit,
    })),
    leadTimeDays: values.leadTimeDays,
    minOrderQuantity: values.minOrderQuantity,
    tags,
    weightKg: values.weightKg,
    dimensions: values.dimensions || undefined,
    bom: product.bom.map((item) => ({
      inventoryItemId: item.inventoryItemId,
      inventoryItemName: item.inventoryItemName,
      sku: item.sku,
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      wastePercent: item.wastePercent,
      isRequired: item.isRequired,
      notes: item.notes,
      alternatives: item.alternatives.map(({ id: _id, ...alt }) => alt),
    })),
  };
}

export function summarizeDuplicateProduct(values: DuplicateProductFormValues) {
  return {
    name: values.name,
    sku: values.sku,
    status: values.status,
    basePrice: values.basePrice,
    productType: values.productType,
  };
}
