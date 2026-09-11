import * as yup from "yup";

export const loginFormSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email("Enter a valid email address")
    .required("Email is required"),
  password: yup.string().required("Password is required"),
  rememberMe: yup.boolean().required(),
});

export type LoginFormValues = yup.InferType<typeof loginFormSchema>;

export const loginInitialValues: LoginFormValues = {
  email: "",
  password: "",
  rememberMe: true,
};
