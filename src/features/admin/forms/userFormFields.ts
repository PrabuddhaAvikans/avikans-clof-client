import type { DynamicFormSection, FieldOption } from '@/components/forms/types';

const STATUS_OPTIONS: FieldOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export type UserFormFieldsOptions = {
  roleOptions?: FieldOption[];
};

export function createUserFormSections(
  options: UserFormFieldsOptions = {},
): DynamicFormSection[] {
  const roleOptions = options.roleOptions ?? [];

  return [
    {
      id: 'user-details',
      title: 'User Details',
      columns: 2,
      fields: [
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
        },
        {
          name: 'phone',
          label: 'Phone',
          type: 'tel',
        },
        {
          name: 'firstName',
          label: 'First Name',
          type: 'text',
          required: true,
        },
        {
          name: 'lastName',
          label: 'Last Name',
          type: 'text',
          required: true,
        },
        {
          name: 'department',
          label: 'Department',
          type: 'text',
        },
        {
          name: 'jobTitle',
          label: 'Job Title',
          type: 'text',
        },
        {
          name: 'roleId',
          label: 'Primary Role',
          type: 'select',
          required: true,
          options: roleOptions,
          placeholder: 'Select role',
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
