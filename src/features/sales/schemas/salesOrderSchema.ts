import * as yup from 'yup';
import { quotationLineItemSchema } from '@/features/sales/schemas/quotationSchema';
import { addressSchema } from '@/features/customers/schemas/customerSchema';

function coerceNumber() {
  return yup.number().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) {
      return undefined;
    }
    return Number.isNaN(value) ? undefined : value;
  });
}

export const salesOrderLineItemSchema = quotationLineItemSchema;

export const salesOrderFormSchema = yup.object({
  customerId: yup.string().trim().required('Select a customer to continue'),
  customerName: yup.string().optional(),
  quotationId: yup.string().optional(),
  priority: yup.string().oneOf(['low', 'medium', 'high', 'urgent'] as const).required(),
  requestedDeliveryDate: yup.string().optional(),
  lineItems: yup
    .array(salesOrderLineItemSchema)
    .min(1, 'Add at least one product to continue')
    .required(),
  discountAmount: coerceNumber().min(0).optional(),
  notes: yup.string().optional(),
  requiresManufacturing: yup.boolean().required(),
  deliveryAddress: addressSchema.required(),
});

export type SalesOrderFormValues = yup.InferType<typeof salesOrderFormSchema>;
