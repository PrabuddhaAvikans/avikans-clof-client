import type { DynamicFormSection } from '@/components/forms/types';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const brandFormSections: DynamicFormSection[] = [
  {
    id: 'brand-details',
    title: 'Brand Details',
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
        name: 'website',
        label: 'Website',
        type: 'url',
        placeholder: 'https://',
      },
      {
        name: 'countryOfOrigin',
        label: 'Country of Origin',
        type: 'text',
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
