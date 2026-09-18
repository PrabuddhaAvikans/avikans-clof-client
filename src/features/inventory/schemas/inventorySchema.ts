import * as yup from "yup";
import { InventoryItemType, PricingMethod } from "@/types/inventory";

function coerceNumber() {
  return yup.number().transform((value, originalValue) => {
    if (originalValue === "" || originalValue === null || originalValue === undefined) {
      return undefined;
    }
    return Number.isNaN(value) ? undefined : value;
  });
}

function coerceOptionalNumber() {
  return coerceNumber().nullable().optional().transform((value, originalValue) => {
    if (originalValue === "" || originalValue === null || originalValue === undefined) {
      return undefined;
    }
    return Number.isNaN(value) ? undefined : value;
  });
}

const itemTypeValues = Object.values(InventoryItemType);
const pricingMethodValues = Object.values(PricingMethod);

export const inventoryFormSchema = yup.object({
  sku: yup.string().required("SKU is required"),
  name: yup.string().required("Name is required"),
  description: yup.string().optional(),
  category: yup.string().required("Category is required"),
  itemType: yup.string().oneOf(itemTypeValues).required("Item type is required"),
  unit: yup.string().required("Unit is required"),
  brand: yup.string().optional(),
  supplier: yup.string().optional(),
  taxCode: yup.string().optional(),
  trackStock: yup.boolean().default(true),
  quantityOnHand: coerceNumber().min(0, "Quantity must be 0 or more").default(0),
  warehouse: yup.string().required("Warehouse is required"),
  minStock: coerceNumber().min(0, "Minimum stock must be 0 or more").default(0),
  maxStock: coerceNumber()
    .min(0, "Maximum stock must be 0 or more")
    .when("trackStock", {
      is: true,
      then: (schema) => schema.min(yup.ref("minStock"), "Maximum stock must be at least minimum stock"),
      otherwise: (schema) => schema.default(0),
    }),
  reorderLevel: coerceNumber().min(0, "Reorder level must be 0 or more").default(0),
  reorderQuantity: coerceNumber().min(0, "Reorder quantity must be 0 or more").default(0),
  buyingPrice: coerceOptionalNumber().min(0, "Buying price must be 0 or more"),
  costPrice: coerceNumber().required().min(0, "Cost price must be 0 or more"),
  pricingMethod: yup.string().oneOf(pricingMethodValues).required("Pricing method is required"),
  markupPercent: coerceNumber().when("pricingMethod", {
    is: "percentage_markup",
    then: (schema) => schema.required().min(0, "Markup must be 0 or more"),
    otherwise: (schema) => schema.min(0).default(0),
  }),
  markupFixedAmount: coerceNumber().when("pricingMethod", {
    is: "fixed_markup",
    then: (schema) => schema.required().min(0, "Fixed markup must be 0 or more"),
    otherwise: (schema) => schema.min(0).default(0),
  }),
  sellingPrice: coerceNumber().when("pricingMethod", {
    is: "manual",
    then: (schema) => schema.required().min(0, "Selling price must be 0 or more"),
    otherwise: (schema) => schema.min(0).default(0),
  }),
  pricingEffectiveDate: yup.string().required("Effective date is required"),
  status: yup.string().oneOf(["active", "inactive"] as const).required(),
});

export type InventoryFormValues = yup.InferType<typeof inventoryFormSchema>;

export const stockMovementFormSchema = yup.object({
  inventoryItemId: yup.string().required("Select an inventory item"),
  type: yup
    .string()
    .oneOf(["receipt", "issue", "adjustment", "reservation", "release"] as const)
    .required("Choose what happened"),
  adjustmentDirection: yup
    .string()
    .oneOf(["increase", "decrease"] as const)
    .when("type", {
      is: "adjustment",
      then: (schema) => schema.required("Choose increase or decrease"),
      otherwise: (schema) => schema.optional(),
    }),
  quantity: coerceNumber().required().positive("Quantity must be greater than 0"),
  notes: yup.string().optional(),
});

export type StockMovementFormValues = yup.InferType<typeof stockMovementFormSchema>;

export const unitOfMeasureFormSchema = yup.object({
  code: yup
    .string()
    .trim()
    .required("Unit code is required")
    .max(16, "Use 16 characters or fewer"),
  name: yup
    .string()
    .trim()
    .required("Unit name is required")
    .max(80, "Use 80 characters or fewer"),
});

export type UnitOfMeasureFormValues = yup.InferType<typeof unitOfMeasureFormSchema>;

export const warehouseFormSchema = yup.object({
  code: yup
    .string()
    .trim()
    .required("Warehouse code is required")
    .max(16, "Use 16 characters or fewer"),
  name: yup
    .string()
    .trim()
    .required("Warehouse name is required")
    .max(80, "Use 80 characters or fewer"),
  address: yup.string().trim().max(200, "Use 200 characters or fewer").optional(),
  status: yup.string().oneOf(["active", "inactive"] as const).required(),
});

export type WarehouseFormValues = yup.InferType<typeof warehouseFormSchema>;
