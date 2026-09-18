import type { DynamicFormSection, FieldOption } from '@/components/forms/types';

const STATUS_OPTIONS: FieldOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const PRODUCT_TYPE_OPTIONS: FieldOption[] = [
  { value: 'finished_good', label: 'Finished Good' },
  { value: 'component', label: 'Component' },
  { value: 'raw_material', label: 'Raw Material' },
  { value: 'service', label: 'Service' },
];

export type ProductFormFieldsOptions = {
  categoryOptions?: FieldOption[];
  brandOptions?: FieldOption[];
  onCreateCategory?: (query: string) => void;
  onCreateBrand?: (query: string) => void;
};

export function createProductFormSections(
  options: ProductFormFieldsOptions = {},
): DynamicFormSection[] {
  const categoryOptions = options.categoryOptions ?? [];
  const brandOptions = options.brandOptions ?? [];

  return [
    {
      id: 'basic-info',
      title: 'Basic Information',
      description: 'Core product identity and classification.',
      columns: 2,
      fields: [
        {
          name: 'name',
          label: 'Product Name',
          type: 'text',
          required: true,
        },
        {
          name: 'code',
          label: 'Product Code',
          type: 'text',
        },
        {
          name: 'sku',
          label: 'Product Code',
          type: 'text',
          required: true,
        },
        {
          name: 'productType',
          label: 'Product Type',
          type: 'select',
          options: PRODUCT_TYPE_OPTIONS,
          required: true,
        },
        {
          name: 'categoryId',
          label: 'Category',
          type: 'searchable-select',
          options: categoryOptions,
          required: true,
          onCreateNew: options.onCreateCategory,
          createNewLabel: (query) => `Create category "${query}"`,
        },
        {
          name: 'brandId',
          label: 'Brand',
          type: 'searchable-select',
          options: brandOptions,
          required: true,
          onCreateNew: options.onCreateBrand,
          createNewLabel: (query) => `Create brand "${query}"`,
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
          rows: 4,
          required: true,
          colSpan: 2,
        },
        {
          name: 'shortDescription',
          label: 'Short Description',
          type: 'textarea',
          rows: 2,
          colSpan: 2,
        },
      ],
    },
    {
      id: 'pricing',
      title: 'Pricing',
      description: 'Set base price and cost; margin is calculated automatically.',
      columns: 4,
      fields: [
        {
          name: 'basePrice',
          label: 'Base Price (LKR)',
          type: 'number',
          min: 0,
          step: 0.01,
          required: true,
        },
        {
          name: 'costPrice',
          label: 'Estimated Cost (LKR)',
          type: 'number',
          min: 0,
          step: 0.01,
          required: true,
        },
        {
          name: 'leadTimeDays',
          label: 'Lead Time (days)',
          type: 'number',
          min: 0,
        },
        {
          name: 'minOrderQuantity',
          label: 'Minimum Order Qty',
          type: 'number',
          min: 1,
        },
      ],
    },
    {
      id: 'manufacturing',
      title: 'Manufacturing Information',
      description: 'Lead times, dimensions, and production notes.',
      columns: 4,
      fields: [
        {
          name: 'weightKg',
          label: 'Weight (kg)',
          type: 'number',
          min: 0,
          step: 0.01,
        },
        {
          name: 'dimensions',
          label: 'Dimensions',
          type: 'text',
          placeholder: 'L × W × H',
        },
        {
          name: 'manufacturingNotes',
          label: 'Manufacturing Notes',
          type: 'textarea',
          rows: 3,
          colSpan: 4,
        },
      ],
    },
  ];
}
