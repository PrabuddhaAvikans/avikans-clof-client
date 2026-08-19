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

export const coatingSubmitSchema = yup.object({
  items: yup.array().of(coatingItemSchema).min(1, "Add at least one coating line").required(),
  notes: yup.string().max(2000, "Notes must be 2000 characters or less"),
});

export type NotesFormValues = yup.InferType<typeof notesSchema>;
export type CommentFormValues = yup.InferType<typeof commentSchema>;
export type CoatingSubmitFormValues = yup.InferType<typeof coatingSubmitSchema>;
