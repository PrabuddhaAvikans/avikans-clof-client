import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { WarehouseFormModal } from "@/features/inventory/components/WarehouseFormModal";
import { useFormikFieldState } from "@/components/forms/useFormikFieldState";
import { useWarehouses } from "@/hooks/useWarehouses";
import { formatWarehouseLabel, toWarehouseFieldOptions } from "@/lib/warehouses";

export type WarehouseFieldProps = {
  name: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
};

export function WarehouseField({
  name,
  label = "Warehouse",
  required,
  disabled,
}: WarehouseFieldProps) {
  const { field, error, helpers } = useFormikFieldState(name);
  const warehouses = useWarehouses();
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultName, setDefaultName] = useState("");

  const current = typeof field.value === "string" ? field.value : "";

  const options = useMemo(() => {
    const selectable = warehouses.filter(
      (warehouse) => warehouse.status === "active" || warehouse.name === current,
    );
    const list = toWarehouseFieldOptions(selectable);
    if (current && !list.some((option) => option.value === current)) {
      const known = warehouses.find((warehouse) => warehouse.name === current);
      list.push({
        value: current,
        label: known ? formatWarehouseLabel(known) : current,
      });
    }
    return list;
  }, [current, warehouses]);

  const selectWarehouse = (value: string) => {
    void helpers.setValue(value);
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
            placeholder="Select warehouse..."
            searchPlaceholder="Search warehouses..."
            onCreateNew={(query) => {
              setDefaultName(query);
              setModalOpen(true);
            }}
            createNewLabel={(query) => `Add "${query}"`}
            onChange={selectWarehouse}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            leftIcon={<Plus className="h-4 w-4" />}
            className="shrink-0"
            onClick={() => {
              setDefaultName("");
              setModalOpen(true);
            }}
          >
            Add
          </Button>
        </div>
      </FormField>

      <WarehouseFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultName={defaultName}
        onSaved={selectWarehouse}
      />
    </>
  );
}
