import type { DynamicFormSection } from '@/components/forms/types';
import { COUNTRY_OPTIONS } from '@/lib/countries';
import { CustomerType } from '@/types/customer';

const CUSTOMER_TYPE_OPTIONS = [
  { value: CustomerType.individual, label: 'Individual' },
  { value: CustomerType.retail, label: 'Retail' },
  { value: CustomerType.corporate, label: 'Corporate' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const customerFormSections: DynamicFormSection[] = [
  {
    id: 'customer-info',
    title: 'Customer Info',
    columns: 3,
    fields: [
      {
        name: 'code',
        label: 'Customer Number',
        type: 'text',
        required: true,
      },
      {
        name: 'name',
        label: 'Customer Name',
        type: 'text',
        required: true,
      },
      {
        name: 'type',
        label: 'Customer Type',
        type: 'select',
        options: CUSTOMER_TYPE_OPTIONS,
      },
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
        required: true,
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: STATUS_OPTIONS,
      },
    ],
  },
  {
    id: 'contact-person',
    title: 'Contact Person',
    columns: 4,
    fields: [
      {
        name: 'contactSameAsName',
        label: 'Same as customer name',
        type: 'checkbox',
        colSpan: 4,
      },
      {
        name: 'contactPerson.name',
        label: 'Contact Name',
        type: 'text',
        disabled: (values) => Boolean(values.contactSameAsName),
        required: true,
      },
      {
        name: 'contactPerson.title',
        label: 'Title',
        type: 'text',
      },
      {
        name: 'contactPerson.email',
        label: 'Contact Email',
        type: 'email',
        disabled: (values) => Boolean(values.contactSameAsName),
        required: true,
      },
      {
        name: 'contactPerson.phone',
        label: 'Contact Phone',
        type: 'tel',
        disabled: (values) => Boolean(values.contactSameAsName),
        required: true,
      },
    ],
  },
  {
    id: 'billing-address',
    title: 'Billing Address',
    columns: 3,
    fields: [
      {
        name: 'billingAddress.line1',
        label: 'Line 1',
        type: 'text',
        required: true,
      },
      {
        name: 'billingAddress.line2',
        label: 'Line 2',
        type: 'text',
      },
      {
        name: 'billingAddress.city',
        label: 'City',
        type: 'text',
        required: true,
      },
      {
        name: 'billingAddress.state',
        label: 'State',
        type: 'text',
        required: true,
      },
      {
        name: 'billingAddress.postalCode',
        label: 'Postal Code',
        type: 'text',
        required: true,
      },
      {
        name: 'billingAddress.country',
        label: 'Country',
        type: 'select',
        options: [...COUNTRY_OPTIONS],
        required: true,
      },
    ],
  },
  {
    id: 'delivery-address',
    title: 'Delivery Address',
    columns: 3,
    fields: [
      {
        name: 'deliverySameAsBilling',
        label: 'Same as billing address',
        type: 'checkbox',
        colSpan: 3,
      },
      {
        name: 'shippingAddress.line1',
        label: 'Line 1',
        type: 'text',
        hidden: (values) => Boolean(values.deliverySameAsBilling),
      },
      {
        name: 'shippingAddress.line2',
        label: 'Line 2',
        type: 'text',
        hidden: (values) => Boolean(values.deliverySameAsBilling),
      },
      {
        name: 'shippingAddress.city',
        label: 'City',
        type: 'text',
        hidden: (values) => Boolean(values.deliverySameAsBilling),
      },
      {
        name: 'shippingAddress.state',
        label: 'State',
        type: 'text',
        hidden: (values) => Boolean(values.deliverySameAsBilling),
      },
      {
        name: 'shippingAddress.postalCode',
        label: 'Postal Code',
        type: 'text',
        hidden: (values) => Boolean(values.deliverySameAsBilling),
      },
      {
        name: 'shippingAddress.country',
        label: 'Country',
        type: 'select',
        options: [...COUNTRY_OPTIONS],
        hidden: (values) => Boolean(values.deliverySameAsBilling),
      },
    ],
  },
  {
    id: 'tax-business',
    title: 'Tax / Business',
    columns: 3,
    fields: [
      {
        name: 'taxId',
        label: 'Tax ID / VAT Number',
        type: 'text',
      },
      {
        name: 'creditLimit',
        label: 'Credit Limit',
        type: 'number',
        min: 0,
      },
      {
        name: 'paymentTermsDays',
        label: 'Payment Terms (days)',
        type: 'number',
        min: 0,
        required: true,
      },
      {
        name: 'notes',
        label: 'Notes',
        type: 'textarea',
        rows: 3,
        colSpan: 3,
      },
    ],
  },
];
