import * as yup from 'yup';
import type { UploadedFile } from '@/components/ui/FileUploader';

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
  description: yup.string().nullable().optional(),
  productVersionId: yup.string().nullable().optional(),
  productVersionLabel: yup.string().nullable().optional(),
  quantity: coerceNumber().required().positive('Quantity must be greater than 0'),
  unitPrice: coerceNumber().required().min(0, 'Unit price must be 0 or more'),
  discountPercent: coerceNumber().required().min(0).max(100),
  taxPercent: coerceNumber().required().min(0).max(100),
  isCustomized: yup.boolean().nullable().optional(),
  // API / Formik often store absent customization as null; optional() alone rejects null.
  customization: yup.mixed().nullable().optional(),
  requiresManufacturing: yup.boolean().nullable().optional(),
});

export const quotationFormSchema = yup
  .object({
    customerId: yup.string().trim().required('Select a customer to continue'),
    customerName: yup.string().nullable().optional(),
    validUntil: yup.string().required('Valid until date is required'),
    quoteDate: yup.string().required('Quote date is required'),
    priority: yup.string().oneOf(['low', 'medium', 'high', 'urgent'] as const).required(),
    lineItems: yup
      .array(quotationLineItemSchema)
      .min(1, 'Add at least one product to continue')
      .required(),
    discountAmount: coerceNumber().min(0).optional(),
    notes: yup.string().nullable().optional(),
    termsAndConditions: yup.string().nullable().optional(),
    attachments: yup.array(yup.mixed<UploadedFile>().required()).default([]),
  })
  .test('valid-until-after-quote-date', 'Valid until must be after quote date', (values) => {
    if (!values?.validUntil || !values.quoteDate) {
      return true;
    }
    return new Date(values.validUntil) > new Date(values.quoteDate);
  });

export type QuotationFormValues = yup.InferType<typeof quotationFormSchema>;
export type QuotationLineItemFormValues = yup.InferType<typeof quotationLineItemSchema>;

export interface LineAmounts {
  gross: number;
  lineDiscount: number;
  net: number;
  tax: number;
  total: number;
}

export interface QuotationTotalsBreakdown {
  grossSubtotal: number;
  lineDiscountTotal: number;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export function computeLineAmounts(item: {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}): LineAmounts {
  const gross = item.quantity * item.unitPrice;
  const lineDiscount = gross * (item.discountPercent / 100);
  const net = gross - lineDiscount;
  const tax = net * (item.taxPercent / 100);
  return { gross, lineDiscount, net, tax, total: net + tax };
}

export function computeLineNet(item: {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}): number {
  return computeLineAmounts(item).net;
}

export function computeLineTotal(item: {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
}): number {
  return computeLineAmounts(item).total;
}

export function computeQuotationTotals(
  lineItems: QuotationLineItemFormValues[],
  additionalDiscount = 0,
): QuotationTotalsBreakdown {
  const amounts = lineItems.map(computeLineAmounts);
  const grossSubtotal = amounts.reduce((sum, line) => sum + line.gross, 0);
  const lineDiscountTotal = amounts.reduce((sum, line) => sum + line.lineDiscount, 0);
  const subtotal = amounts.reduce((sum, line) => sum + line.net, 0);
  const discountAmount = Math.min(Math.max(additionalDiscount, 0), subtotal);

  let taxAmount = 0;
  if (subtotal > 0) {
    lineItems.forEach((item, index) => {
      const share = amounts[index].net / subtotal;
      const lineTaxable = amounts[index].net - discountAmount * share;
      taxAmount += lineTaxable * (item.taxPercent / 100);
    });
  }

  const taxableAmount = subtotal - discountAmount;
  const totalAmount = taxableAmount + taxAmount;

  return {
    grossSubtotal,
    lineDiscountTotal,
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    totalAmount,
  };
}

export function storedQuotationTotals(
  lineItems: Parameters<typeof computeQuotationTotals>[0],
  document: {
    discountAmount: number;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
  },
): QuotationTotalsBreakdown {
  const computed = computeQuotationTotals(lineItems, document.discountAmount);
  return {
    ...computed,
    subtotal: document.subtotal,
    discountAmount: document.discountAmount,
    taxableAmount: Math.max(0, document.subtotal - document.discountAmount),
    taxAmount: document.taxAmount,
    totalAmount: document.totalAmount,
  };
}
