import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { AddUnitOfMeasureModal } from "@/features/inventory/components/AddUnitOfMeasureModal";
import { useFormikFieldState } from "@/components/forms/useFormikFieldState";
import { useUnitsOfMeasure } from "@/hooks/useUnitsOfMeasure";
import { formatUnitLabel, toUnitFieldOptions } from "@/lib/unitsOfMeasure";

export type UnitOfMeasureFieldProps = {
  name: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
};

export function UnitOfMeasureField({
  name,
  label = "Unit of Measure",
  required,
  disabled,
}: UnitOfMeasureFieldProps) {
  const { field, error, helpers } = useFormikFieldState(name);
  const units = useUnitsOfMeasure();
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultCode, setDefaultCode] = useState("");

  const current = typeof field.value === "string" ? field.value : "";

  const options = useMemo(() => {
    const list = toUnitFieldOptions(units);
    if (current && !list.some((option) => option.value === current)) {
      const known = units.find((unit) => unit.code === current);
      list.push({
        value: current,
        label: known ? formatUnitLabel(known) : current,
      });
    }
    return list;
  }, [current, units]);

  const selectUnit = (code: string) => {
    void helpers.setValue(code);
    void helpers.setTouched(true);
  };

  return (
    <>
      <FormField id={name} label={label} error={error} required={required}>
        <div className="flex items-start gap-2">
          <SearchableSelect
            id={name}
            className="min-w-0 flex-1"
            options={options}
            value={current}
            disabled={disabled}
            placeholder="Select unit..."
            searchPlaceholder="Search units..."
            onCreateNew={(query) => {
              setDefaultCode(query);
              setModalOpen(true);
            }}
            createNewLabel={(query) => `Add "${query}"`}
            onChange={selectUnit}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            leftIcon={<Plus className="h-4 w-4" />}
            className="shrink-0"
            onClick={() => {
              setDefaultCode("");
              setModalOpen(true);
            }}
          >
            Add
          </Button>
        </div>
      </FormField>

      <AddUnitOfMeasureModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultCode={defaultCode}
        onCreated={selectUnit}
      />
    </>
  );
}
