import type { DynamicFormSection, FieldOption } from '@/components/forms/types';

const STATUS_OPTIONS: FieldOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export type CategoryFormFieldsOptions = {
  parentOptions?: FieldOption[];
};

export function createCategoryFormSections(
  options: CategoryFormFieldsOptions = {},
): DynamicFormSection[] {
  const parentOptions = options.parentOptions ?? [{ value: '', label: 'None (top level)' }];

  return [
    {
      id: 'category-details',
      title: 'Category Details',
      columns: 2,
      fields: [
        {
          name: 'name',
          label: 'Name',
          type: 'text',
          required: true,
        },
        {
          name: 'slug',
          label: 'Code',
          type: 'text',
          required: true,
          hint: 'Auto-generated from name; editable',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'text',
          colSpan: 2,
        },
        {
          name: 'parentId',
          label: 'Parent Category',
          type: 'searchable-select',
          options: parentOptions,
          placeholder: 'Select parent category',
        },
        {
          name: 'sortOrder',
          label: 'Sort Order',
          type: 'number',
          min: 0,
        },
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          options: STATUS_OPTIONS,
        },
      ],
    },
  ];
}
