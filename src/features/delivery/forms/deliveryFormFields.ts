import type { DynamicFormSection, FieldOption } from '@/components/forms/types';

export type DeliveryFormFieldsOptions = {
  salesOrderOptions?: FieldOption[];
  driverOptions?: FieldOption[];
  priorityOptions?: FieldOption[];
};

export function createDeliveryFormSections(
  options: DeliveryFormFieldsOptions = {},
): DynamicFormSection[] {
  return [
    {
      id: 'delivery-details',
      title: 'Delivery Details',
      columns: 1,
      fields: [
        {
          name: 'salesOrderId',
          label: 'Sales Order',
          type: 'select',
          required: true,
          options: options.salesOrderOptions ?? [],
          placeholder: 'Select sales order',
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          options: options.priorityOptions ?? [],
        },
        {
          name: 'carrier',
          label: 'Carrier',
          type: 'text',
        },
        {
          name: 'driverId',
          label: 'Driver',
          type: 'select',
          options: options.driverOptions ?? [],
          placeholder: 'Select driver',
        },
        {
          name: 'vehicleNumber',
          label: 'Vehicle Number',
          type: 'text',
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          rows: 3,
        },
      ],
    },
  ];
}
