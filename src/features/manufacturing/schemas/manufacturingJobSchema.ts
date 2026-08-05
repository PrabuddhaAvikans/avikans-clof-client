import * as yup from 'yup';

function coerceNumber() {
  return yup.number().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) {
      return undefined;
    }
    return Number.isNaN(value) ? undefined : value;
  });
}

export const manufacturingJobFormSchema = yup.object({
  salesOrderId: yup.string().required('Sales order is required'),
  productId: yup.string().required('Product is required'),
  quantity: coerceNumber().required().positive('Quantity must be greater than 0'),
  priority: yup.string().oneOf(['low', 'medium', 'high', 'urgent'] as const).required(),
  plannedStartDate: yup.string().required('Planned start date is required'),
  plannedEndDate: yup.string().required('Planned end date is required'),
  assignedTo: yup.string().optional(),
  notes: yup.string().optional(),
});

export type ManufacturingJobFormValues = yup.InferType<typeof manufacturingJobFormSchema>;
