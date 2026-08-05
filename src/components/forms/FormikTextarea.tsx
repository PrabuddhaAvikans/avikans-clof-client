import type { TextareaHTMLAttributes } from 'react';
import { Textarea } from '@/components/ui/Textarea';
import { useFormikFieldState } from '@/components/forms/useFormikFieldState';

export type FormikTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'name' | 'value' | 'onChange' | 'onBlur'
> & {
  name: string;
  label?: string;
  hint?: string;
};

export function FormikTextarea({ name, label, hint, rows = 3, ...props }: FormikTextareaProps) {
  const { field, error } = useFormikFieldState(name);

  return (
    <Textarea
      {...field}
      {...props}
      rows={rows}
      label={label}
      hint={hint}
      error={error}
      value={field.value ?? ''}
    />
  );
}
