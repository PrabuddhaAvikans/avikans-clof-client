import type { InputHTMLAttributes } from 'react';
import { Switch } from '@/components/ui/Switch';
import { FormField } from '@/components/ui/FormField';
import { useFormikFieldState } from '@/components/forms/useFormikFieldState';

export type FormikSwitchProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'name' | 'value' | 'checked' | 'onChange' | 'onBlur' | 'type'
> & {
  name: string;
  label?: string;
  hint?: string;
  description?: string;
};

export function FormikSwitch({ name, label, hint, description, ...props }: FormikSwitchProps) {
  const { field, error, helpers } = useFormikFieldState(name);

  const switchControl = (
    <Switch
      {...props}
      id={props.id ?? name}
      name={field.name}
      label={label}
      description={description ?? hint}
      checked={Boolean(field.value)}
      onBlur={field.onBlur}
      onChange={(event) => {
        void helpers.setValue(event.target.checked);
      }}
    />
  );

  if (!error) {
    return switchControl;
  }

  return (
    <FormField id={props.id ?? name} error={error}>
      {switchControl}
    </FormField>
  );
}
