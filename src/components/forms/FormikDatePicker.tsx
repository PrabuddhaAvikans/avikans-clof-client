import type { InputHTMLAttributes } from 'react';
import { DatePicker } from '@/components/ui/DatePicker';
import { useFormikFieldState } from '@/components/forms/useFormikFieldState';

export type FormikDatePickerProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'name' | 'value' | 'onChange' | 'onBlur' | 'type'
> & {
  name: string;
  label?: string;
  hint?: string;
};

export function FormikDatePicker({ name, label, hint, ...props }: FormikDatePickerProps) {
  const { field, error } = useFormikFieldState(name);

  return (
    <DatePicker
      {...field}
      {...props}
      label={label}
      hint={hint}
      error={error}
      value={field.value ?? ''}
    />
  );
}
