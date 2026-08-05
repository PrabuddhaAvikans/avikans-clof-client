import * as yup from 'yup';

function coerceNumber() {
  return yup.number().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) {
      return undefined;
    }
    return Number.isNaN(value) ? undefined : value;
  });
}

export const addressSchema = yup.object({
  line1: yup.string().required('Address line 1 is required'),
  line2: yup.string().optional(),
  city: yup.string().required('City is required'),
  state: yup.string().required('State/Province is required'),
  postalCode: yup.string().required('Postal code is required'),
  country: yup.string().required('Country is required'),
});

export const contactPersonSchema = yup.object({
  name: yup.string().required('Contact name is required'),
  title: yup.string().optional(),
  email: yup.string().email('Valid email is required').required('Valid email is required'),
  phone: yup.string().required('Phone is required'),
  isPrimary: yup.boolean().required(),
});

export const customerFormSchema = yup.object({
  code: yup.string().required('Customer number is required'),
  name: yup.string().required('Customer name is required'),
  type: yup
    .string()
    .oneOf(['individual', 'retail', 'corporate'] as const)
    .required(),
  email: yup.string().email('Valid email is required').required('Valid email is required'),
  phone: yup.string().required('Phone is required'),
  contactSameAsName: yup.boolean().required(),
  contactPerson: contactPersonSchema.required(),
  billingAddresses: yup
    .array()
    .of(addressSchema)
    .min(1, 'At least one billing address is required')
    .required(),
  activeBillingAddressIndex: yup.number().integer().min(0).required(),
  deliverySameAsBilling: yup.boolean().required(),
  shippingAddresses: yup
    .array()
    .of(addressSchema)
    .when('deliverySameAsBilling', {
      is: true,
      then: (schema) => schema.optional(),
      otherwise: (schema) =>
        schema.min(1, 'At least one delivery address is required').required(),
    }),
  activeShippingAddressIndex: yup
    .number()
    .integer()
    .when('deliverySameAsBilling', {
      is: true,
      then: (schema) => schema.notRequired(),
      otherwise: (schema) => schema.min(0).required(),
    }),
  taxId: yup.string().optional(),
  creditLimit: coerceNumber().min(0).optional(),
  paymentTermsDays: coerceNumber()
    .required()
    .min(0, 'Payment terms must be 0 or more'),
  notes: yup.string().optional(),
  status: yup.string().oneOf(['active', 'inactive'] as const).required(),
});

export type CustomerFormValues = yup.InferType<typeof customerFormSchema>;
