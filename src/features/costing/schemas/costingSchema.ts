import * as yup from "yup";

export const notesSchema = yup.object({
  notes: yup.string().max(2000, "Notes must be 2000 characters or less"),
});

export const commentSchema = yup.object({
  comment: yup
    .string()
    .trim()
    .min(3, "Comment must be at least 3 characters")
    .max(1000, "Comment must be 1000 characters or less")
    .required("Comment is required"),
});

export const coatingItemSchema = yup.object({
  id: yup.string().required(),
  productId: yup.string().required(),
  productName: yup.string().required(),
  finish: yup.string().trim().required("Finish is required"),
  process: yup.string().trim().required("Process is required"),
  quantity: yup.number().min(1, "Quantity must be at least 1").required(),
  unitCost: yup.number().min(0, "Unit cost cannot be negative").required("Unit cost is required"),
});

export const estimationMaterialSchema = yup.object({
  id: yup.string().required(),
  inventoryItemId: yup.string().required("Inventory item is required"),
  inventoryItemName: yup.string().required(),
  sku: yup.string().required(),
  quantity: yup.number().min(0.01, "Quantity must be greater than zero").required(),
  unit: yup.string().required(),
  wastePercent: yup.number().min(0).max(100).default(0),
  unitCost: yup.number().min(0, "Unit cost cannot be negative").required("Unit cost is required"),
  isRequired: yup.boolean().default(true),
  alternativeItemId: yup.string().optional(),
  alternativeItemName: yup.string().optional(),
  notes: yup.string().optional(),
  salesOrderLineItemId: yup.string().optional(),
  sourceType: yup.mixed<"standard" | "customized">().oneOf(["standard", "customized"]).optional(),
  sourceProductName: yup.string().optional(),
  productVersionLabel: yup.string().optional(),
});

export const coatingSubmitSchema = yup.object({
  items: yup.array().of(coatingItemSchema).min(1, "Add at least one coating line").required(),
  materials: yup.array().of(estimationMaterialSchema).default([]),
  notes: yup.string().max(2000, "Notes must be 2000 characters or less"),
});

export type NotesFormValues = yup.InferType<typeof notesSchema>;
export type CommentFormValues = yup.InferType<typeof commentSchema>;
export type CoatingSubmitFormValues = yup.InferType<typeof coatingSubmitSchema>;
