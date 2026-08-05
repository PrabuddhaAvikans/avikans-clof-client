import type { SelectHTMLAttributes } from 'react';
import { Select, type SelectOption } from '@/components/ui/Select';
import { useFormikFieldState } from '@/components/forms/useFormikFieldState';

export type FormikSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'name' | 'value' | 'onChange' | 'onBlur'
> & {
  name: string;
  label?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
};

export function FormikSelect({
  name,
  label,
  hint,
  options,
  placeholder,
  ...props
}: FormikSelectProps) {
  const { field, error } = useFormikFieldState(name);

  return (
    <Select
      {...field}
      {...props}
      label={label}
      hint={hint}
      error={error}
      options={options}
      placeholder={placeholder}
      value={field.value ?? ''}
    />
  );
}
