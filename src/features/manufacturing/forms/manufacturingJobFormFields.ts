import type { DynamicFormSection, FieldOption } from '@/components/forms/types';

export type ManufacturingJobFormFieldsOptions = {
  salesOrderOptions?: FieldOption[];
  productOptions?: FieldOption[];
  assigneeOptions?: FieldOption[];
  priorityOptions?: FieldOption[];
  disabled?: boolean;
};

export function createManufacturingJobFormSections(
  options: ManufacturingJobFormFieldsOptions = {},
): DynamicFormSection[] {
  const disabled = options.disabled ?? false;

  return [
    {
      id: 'job-details',
      title: 'Job Details',
      columns: 1,
      fields: [
        {
          name: 'salesOrderId',
          label: 'Sales Order',
          type: 'select',
          required: true,
          disabled,
          options: options.salesOrderOptions ?? [],
          placeholder: 'Select sales order',
        },
        {
          name: 'productId',
          label: 'Product',
          type: 'select',
          required: true,
          disabled,
          options: options.productOptions ?? [],
          placeholder: 'Select product',
        },
        {
          name: 'quantity',
          label: 'Quantity',
          type: 'number',
          required: true,
          min: 1,
          disabled,
        },
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          disabled,
          options: options.priorityOptions ?? [],
        },
        {
          name: 'plannedStartDate',
          label: 'Start Date',
          type: 'date',
          required: true,
          disabled,
        },
        {
          name: 'plannedEndDate',
          label: 'Required Completion Date',
          type: 'date',
          required: true,
          disabled,
        },
        {
          name: 'assignedTo',
          label: 'Assigned To (optional)',
          type: 'select',
          disabled,
          options: options.assigneeOptions ?? [],
          placeholder: 'Select assignee',
        },
        {
          name: 'notes',
          label: 'Notes',
          type: 'textarea',
          rows: 3,
          disabled,
        },
      ],
    },
  ];
}
