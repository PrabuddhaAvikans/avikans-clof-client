import type { InputHTMLAttributes } from 'react';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { useFormikFieldState } from '@/components/forms/useFormikFieldState';

export type FormikCheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'name' | 'value' | 'checked' | 'onChange' | 'onBlur' | 'type'
> & {
  name: string;
  label?: string;
  hint?: string;
};

export function FormikCheckbox({ name, label, hint, ...props }: FormikCheckboxProps) {
  const { field, error, helpers } = useFormikFieldState(name);

  const checkbox = (
    <Checkbox
      {...props}
      id={props.id ?? name}
      name={field.name}
      checked={Boolean(field.value)}
      onBlur={field.onBlur}
      onChange={(event) => {
        void helpers.setValue(event.target.checked);
      }}
      label={label}
    />
  );

  if (!hint && !error) {
    return checkbox;
  }

  return (
    <FormField id={props.id ?? name} error={error} hint={hint}>
      {checkbox}
    </FormField>
  );
}
