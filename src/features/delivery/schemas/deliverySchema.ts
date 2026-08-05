import * as yup from 'yup';

function coerceNumber() {
  return yup.number().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) {
      return undefined;
    }
    return Number.isNaN(value) ? undefined : value;
  });
}

export const deliveryItemFormSchema = yup.object({
  id: yup.string().required(),
  productId: yup.string().required(),
  productSku: yup.string().required(),
  productName: yup.string().required(),
  quantityOrdered: coerceNumber().required().min(0),
  quantityDelivered: coerceNumber().required().min(0),
  unit: yup.string().required(),
  quantityToDeliver: coerceNumber().required().min(0),
});

export const deliveryFormSchema = yup.object({
  salesOrderId: yup.string().required('Sales order is required'),
  scheduledDate: yup.string().required('Scheduled date is required'),
  priority: yup.string().oneOf(['low', 'medium', 'high', 'urgent'] as const).required(),
  carrier: yup.string().optional(),
  driverId: yup.string().optional(),
  vehicleNumber: yup.string().optional(),
  notes: yup.string().optional(),
  items: yup.array(deliveryItemFormSchema).min(1, 'At least one delivery item is required').required(),
});

export type DeliveryFormValues = yup.InferType<typeof deliveryFormSchema>;
export type DeliveryItemFormValues = yup.InferType<typeof deliveryItemFormSchema>;
