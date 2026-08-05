import type { InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/Input';
import { useFormikFieldState } from '@/components/forms/useFormikFieldState';

export type FormikInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'name' | 'value' | 'onChange' | 'onBlur'
> & {
  name: string;
  label?: string;
  hint?: string;
};

export function FormikInput({ name, label, hint, type = 'text', ...props }: FormikInputProps) {
  const { field, error } = useFormikFieldState(name);

  return (
    <Input
      {...field}
      {...props}
      type={type}
      label={label}
      hint={hint}
      error={error}
      value={field.value ?? ''}
    />
  );
}
