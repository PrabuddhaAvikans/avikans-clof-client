import type { DynamicFormSection } from '@/components/forms/types';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const inventoryFormSections: DynamicFormSection[] = [
  {
    id: 'item-details',
    title: 'Item Details',
    columns: 3,
    fields: [
      {
        name: 'sku',
        label: 'SKU',
        type: 'text',
        required: true,
      },
      {
        name: 'name',
        label: 'Name',
        type: 'text',
        required: true,
      },
      {
        name: 'category',
        label: 'Category',
        type: 'text',
        required: true,
      },
      {
        name: 'unit',
        label: 'Unit',
        type: 'text',
        required: true,
      },
      {
        name: 'location',
        label: 'Location',
        type: 'text',
        required: true,
      },
      {
        name: 'supplier',
        label: 'Supplier',
        type: 'text',
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: STATUS_OPTIONS,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        rows: 2,
        colSpan: 3,
      },
    ],
  },
  {
    id: 'stock-pricing',
    title: 'Stock & Pricing',
    columns: 4,
    fields: [
      {
        name: 'quantityOnHand',
        label: 'Quantity On Hand',
        type: 'number',
        min: 0,
      },
      {
        name: 'reorderLevel',
        label: 'Reorder Level',
        type: 'number',
        min: 0,
      },
      {
        name: 'reorderQuantity',
        label: 'Reorder Quantity',
        type: 'number',
        min: 0,
      },
      {
        name: 'unitCost',
        label: 'Unit Cost',
        type: 'number',
        min: 0,
        step: 0.01,
      },
    ],
  },
];

import type { DynamicFieldConfig, FieldOption } from '@/components/forms/types';

const MOVEMENT_TYPE_OPTIONS: FieldOption[] = [
  { value: 'receipt', label: 'Stock In' },
  { value: 'issue', label: 'Stock Out' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'reservation', label: 'Reservation' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'release', label: 'Release Reservation' },
];

export function createStockMovementFormFields(
  itemOptions: FieldOption[] = [],
): DynamicFieldConfig[] {
  return [
    {
      name: 'inventoryItemId',
      label: 'Inventory Item',
      type: 'searchable-select',
      required: true,
      placeholder: 'Select item...',
      options: itemOptions,
    },
    {
      name: 'type',
      label: 'Movement Type',
      type: 'select',
      required: true,
      options: MOVEMENT_TYPE_OPTIONS,
    },
    {
      name: 'quantity',
      label: 'Quantity',
      type: 'number',
      required: true,
      min: 0,
      step: 0.01,
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      rows: 2,
      colSpan: 2,
    },
  ];
}

/** @deprecated Use createStockMovementFormFields instead */
export const stockMovementFormFields = createStockMovementFormFields();
