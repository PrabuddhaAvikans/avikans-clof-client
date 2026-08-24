import { Input, type InputProps } from '@/components/ui/Input';
import { useFormikFieldState } from '@/components/forms/useFormikFieldState';

export type FormikInputProps = Omit<
  InputProps,
  'name' | 'value' | 'onChange' | 'onBlur' | 'error'
> & {
  name: string;
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
