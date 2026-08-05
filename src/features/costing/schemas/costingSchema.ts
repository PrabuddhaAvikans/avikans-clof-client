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

export type NotesFormValues = yup.InferType<typeof notesSchema>;
export type CommentFormValues = yup.InferType<typeof commentSchema>;
