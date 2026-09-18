import type { DynamicFieldConfig, DynamicFormSection } from '@/components/forms/types';

export type QuotationFormFieldsOptions = {
  customerField?: DynamicFieldConfig;
};

export function createQuotationDetailSections(
  options: QuotationFormFieldsOptions = {},
): DynamicFormSection[] {
  const fields: DynamicFieldConfig[] = [
    { name: 'customerId', type: 'hidden' },
  ];

  if (options.customerField) {
    fields.push(options.customerField);
  }

  fields.push(
    {
      name: 'quoteDate',
      label: 'Quote Date',
      type: 'date',
      required: true,
    },
    {
      name: 'validUntil',
      label: 'Valid Until',
      type: 'date',
      required: true,
    },
  );

  return [
    {
      id: 'quotation-details',
      title: 'Quotation Details',
      columns: 4,
      fields,
    },
    {
      id: 'summary',
      title: 'Discounts & Summary',
      columns: 2,
      fields: [
        {
          name: 'discountAmount',
          label: 'Additional Discount (LKR)',
          type: 'number',
          min: 0,
        },
      ],
    },
    {
      id: 'terms',
      title: 'Terms & Notes',
      columns: 1,
      fields: [
        {
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          rows: 2,
        },
        {
          name: 'termsAndConditions',
          label: 'Terms & Conditions',
          type: 'textarea',
          rows: 4,
        },
      ],
    },
  ];
}
