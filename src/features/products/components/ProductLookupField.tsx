import { useMemo } from "react";
import { Plus } from "lucide-react";
import { useFormikFieldState } from "@/components/forms/useFormikFieldState";
import { Button, FormField, SearchableSelect } from "@/components/ui";

export type ProductLookupFieldProps = {
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
  hint?: string;
  addLabel?: string;
  onAdd: () => void;
  onCreateNew?: (query: string) => void;
  createNewLabel?: (query: string) => string;
};

export function ProductLookupField({
  name,
  label,
  required,
  disabled,
  options,
  placeholder = "Select...",
  hint,
  addLabel = "Add",
  onAdd,
  onCreateNew,
  createNewLabel,
}: ProductLookupFieldProps) {
  const { field, error, helpers } = useFormikFieldState(name);
  const current = typeof field.value === "string" ? field.value : "";

  const mergedOptions = useMemo(() => {
    if (current && !options.some((option) => option.value === current)) {
      return [...options, { value: current, label: current }];
    }
    return options;
  }, [current, options]);

  return (
    <FormField id={name} label={label} error={error} required={required} hint={hint}>
      <div className="flex items-start gap-2">
        <SearchableSelect
          id={name}
          className="min-w-0 flex-1"
          options={mergedOptions}
          value={current}
          disabled={disabled}
          placeholder={placeholder}
          searchPlaceholder={`Search ${label.toLowerCase()}...`}
          onCreateNew={onCreateNew}
          createNewLabel={createNewLabel ?? ((query) => `Add "${query}"`)}
          onChange={(value) => {
            void helpers.setValue(value);
            void helpers.setTouched(true);
          }}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          leftIcon={<Plus className="h-4 w-4" />}
          className="shrink-0"
          onClick={onAdd}
        >
          {addLabel}
        </Button>
      </div>
    </FormField>
  );
}
