import * as yup from 'yup';

export const userFormSchema = yup.object({
  email: yup.string().email('Valid email is required').required('Email is required'),
  firstName: yup.string().min(1, 'First name is required').required(),
  lastName: yup.string().min(1, 'Last name is required').required(),
  phone: yup.string().optional(),
  roleId: yup.string().required('Primary role is required'),
  roleGroupIds: yup.array(yup.string().required()).required(),
  department: yup.string().optional(),
  jobTitle: yup.string().optional(),
  status: yup.string().oneOf(['active', 'inactive'] as const).required(),
});

export type UserFormValues = yup.InferType<typeof userFormSchema>;
