import * as yup from 'yup';

function coerceNumber() {
  return yup.number().transform((value, originalValue) => {
    if (originalValue === '' || originalValue === null || originalValue === undefined) {
      return undefined;
    }
    return Number.isNaN(value) ? undefined : value;
  });
}

export const quotationLineItemSchema = yup.object({
  productId: yup.string().min(1).required(),
  productSku: yup.string().min(1).required(),
  productName: yup.string().min(1).required(),
  description: yup.string().optional(),
  quantity: coerceNumber().required().positive('Quantity must be greater than 0'),
  unitPrice: coerceNumber().required().min(0, 'Unit price must be 0 or more'),
  discountPercent: coerceNumber().required().min(0).max(100),
  taxPercent: coerceNumber().required().min(0).max(100),
});

export const quotationFormSchema = yup
  .object({
    customerId: yup.string().required('Customer is required'),
    customerName: yup.string().optional(),
    validUntil: yup.string().required('Valid until date is required'),
    quoteDate: yup.string().required('Quote date is required'),
    priority: yup.string().oneOf(['low', 'medium', 'high', 'urgent'] as const).required(),
    lineItems: yup
      .array(quotationLineItemSchema)
      .min(1, 'At least one product is required')
      .required(),
    discountAmount: coerceNumber().min(0).optional(),
    notes: yup.string().optional(),
    termsAndConditions: yup.string().optional(),
  })
  .test('valid-until-after-quote-date', 'Valid until must be after quote date', (values) => {
    if (!values?.validUntil || !values.quoteDate) {
      return true;
    }
    return new Date(values.validUntil) > new Date(values.quoteDate);
  });

export type QuotationFormValues = yup.InferType<typeof quotationFormSchema>;
export type QuotationLineItemFormValues = yup.InferType<typeof quotationLineItemSchema>;

export function computeLineTotal(item: {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}): number {
  const subtotal = item.quantity * item.unitPrice;
  const afterDiscount = subtotal * (1 - item.discountPercent / 100);
  return afterDiscount * (1 + item.taxPercent / 100);
}

export function computeQuotationTotals(
  lineItems: QuotationLineItemFormValues[],
  discountAmount = 0,
) {
  const subtotal = lineItems.reduce((sum, item) => {
    const base = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
    return sum + base;
  }, 0);
  const taxAmount = lineItems.reduce((sum, item) => {
    const base = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
    return sum + base * (item.taxPercent / 100);
  }, 0);
  const totalAmount = subtotal - discountAmount + taxAmount;
  return { subtotal, taxAmount, totalAmount, discountAmount };
}
