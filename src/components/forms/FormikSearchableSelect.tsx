import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/SearchableSelect';
import { useFormikFieldState } from '@/components/forms/useFormikFieldState';

export type FormikSearchableSelectProps = {
  name: string;
  label?: string;
  hint?: string;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  onCreateNew?: (query: string) => void;
  createNewLabel?: (query: string) => string;
  className?: string;
};

export function FormikSearchableSelect({
  name,
  label,
  hint,
  options,
  placeholder,
  searchPlaceholder,
  required,
  disabled,
  clearable,
  onCreateNew,
  createNewLabel,
  className,
}: FormikSearchableSelectProps) {
  const { field, error, helpers } = useFormikFieldState(name);

  return (
    <SearchableSelect
      id={name}
      className={className}
      label={label}
      hint={hint}
      error={error}
      required={required}
      disabled={disabled}
      clearable={clearable}
      options={options}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      onCreateNew={onCreateNew}
      createNewLabel={createNewLabel}
      value={typeof field.value === 'string' ? field.value : ''}
      onChange={(value) => {
        void helpers.setValue(value);
        void helpers.setTouched(true);
      }}
    />
  );
}
