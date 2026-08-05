import { MultiSelect, type MultiSelectOption } from '@/components/ui/MultiSelect';
import { useFormikFieldState } from '@/components/forms/useFormikFieldState';

export type FormikMultiSelectProps = {
  name: string;
  label?: string;
  hint?: string;
  options: MultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export function FormikMultiSelect({
  name,
  label,
  hint,
  options,
  placeholder,
  searchPlaceholder,
  required,
  disabled,
  className,
}: FormikMultiSelectProps) {
  const { field, error, helpers } = useFormikFieldState(name);

  const value = Array.isArray(field.value) ? (field.value as string[]) : [];

  return (
    <MultiSelect
      id={name}
      className={className}
      label={label}
      hint={hint}
      error={error}
      required={required}
      disabled={disabled}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      value={value}
      onChange={(next) => {
        void helpers.setValue(next);
        void helpers.setTouched(true);
      }}
    />
  );
}
