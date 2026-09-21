import type { DynamicFieldConfig, DynamicFormSection } from '@/components/forms/types';
import { COUNTRY_OPTIONS } from '@/lib/countries';

export type SalesOrderFormFieldsOptions = {
  customerField?: DynamicFieldConfig;
};

export function createSalesOrderDetailSections(
  options: SalesOrderFormFieldsOptions = {},
): DynamicFormSection[] {
  const fields: DynamicFieldConfig[] = [
    { name: 'customerId', type: 'hidden' },
  ];

  if (options.customerField) {
    fields.push(options.customerField);
  }

  fields.push(
    {
      name: 'requestedDeliveryDate',
      label: 'Requested Delivery',
      type: 'date',
    },
    {
      name: 'requiresManufacturing',
      label: 'Requires manufacturing',
      type: 'checkbox',
      colSpan: 2,
    },
  );

  return [
    {
      id: 'order-details',
      title: 'Order Details',
      columns: 4,
      fields,
    },
    {
      id: 'delivery-address',
      title: 'Delivery Address',
      columns: 3,
      fields: [
        {
          name: 'deliveryAddress.line1',
          label: 'Line 1',
          type: 'text',
          required: true,
        },
        {
          name: 'deliveryAddress.city',
          label: 'City',
          type: 'text',
          required: true,
        },
        {
          name: 'deliveryAddress.state',
          label: 'State',
          type: 'text',
          required: true,
        },
        {
          name: 'deliveryAddress.postalCode',
          label: 'Postal Code',
          type: 'text',
        },
        {
          name: 'deliveryAddress.country',
          label: 'Country',
          type: 'select',
          options: [...COUNTRY_OPTIONS],
        },
      ],
    },
    {
      id: 'notes',
      title: 'Notes',
      columns: 1,
      fields: [
        {
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          rows: 2,
        },
      ],
    },
  ];
}
