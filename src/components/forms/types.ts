import type { ReactNode } from 'react';

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'tel'
  | 'url'
  | 'textarea'
  | 'select'
  | 'searchable-select'
  | 'multi-select'
  | 'checkbox'
  | 'switch'
  | 'date'
  | 'date-range'
  | 'hidden'
  | 'custom';

export type FieldOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type DynamicFieldConfig = {
  name: string;
  label?: string;
  type: FieldType;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean | ((values: Record<string, unknown>) => boolean);
  hidden?: boolean | ((values: Record<string, unknown>) => boolean);
  options?: FieldOption[] | ((values: Record<string, unknown>) => FieldOption[]);
  colSpan?: 1 | 2 | 3 | 4;
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  onCreateNew?: (query: string) => void;
  createNewLabel?: string | ((query: string) => string);
  render?: (ctx: {
    name: string;
    value: unknown;
    error?: string;
    touched?: boolean;
    setValue: (v: unknown) => void;
    values: Record<string, unknown>;
  }) => ReactNode;
};

export type DynamicFormSection = {
  id: string;
  title: string;
  description?: string;
  fields: DynamicFieldConfig[];
  columns?: 1 | 2 | 3 | 4;
};
