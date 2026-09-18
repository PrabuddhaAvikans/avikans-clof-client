import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useFormikFieldState } from "@/components/forms/useFormikFieldState";
import { AddCostSheetHandleModal } from "@/features/products/components/AddCostSheetHandleModal";
import { useCostSheetHandles } from "@/hooks/useCostSheetHandles";
import { formatCostSheetHandleLabel, toCostSheetHandleOptions } from "@/lib/costSheetHandles";

export type CostSheetHandleSelectProps = {
  id?: string;
  value: string;
  onChange: (handleId: string) => void;
  disabled?: boolean;
  compact?: boolean;
  error?: string;
  handleModalZIndexClassName?: string;
};

export function CostSheetHandleSelect({
  id,
  value,
  onChange,
  disabled,
  compact = false,
  error,
  handleModalZIndexClassName,
}: CostSheetHandleSelectProps) {
  const handles = useCostSheetHandles();
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultName, setDefaultName] = useState("");

  const options = useMemo(() => {
    const list = toCostSheetHandleOptions(handles);
    if (value && !list.some((option) => option.value === value)) {
      list.push({
        value,
        label: formatCostSheetHandleLabel(value),
      });
    }
    return list;
  }, [handles, value]);

  return (
    <>
      <div className="flex min-w-0 items-start gap-1.5">
        <SearchableSelect
          id={id}
          className="min-w-0 flex-1"
          options={options}
          value={value}
          disabled={disabled}
          placeholder="Select handle..."
          searchPlaceholder="Search handles..."
          error={compact ? undefined : error}
          onCreateNew={(query) => {
            setDefaultName(query);
            setModalOpen(true);
          }}
          createNewLabel={(query) => `Add "${query}"`}
          onChange={onChange}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          className="h-9 shrink-0 px-2"
          onClick={() => {
            setDefaultName("");
            setModalOpen(true);
          }}
        >
          Add
        </Button>
      </div>
      {!compact && error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}

      <AddCostSheetHandleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultName={defaultName}
        onCreated={onChange}
        zIndexClassName={handleModalZIndexClassName}
      />
    </>
  );
}

export type CostSheetHandleFieldProps = {
  name: string;
  disabled?: boolean;
  compact?: boolean;
};

export function CostSheetHandleField({
  name,
  disabled,
  compact = false,
}: CostSheetHandleFieldProps) {
  const { field, error, helpers } = useFormikFieldState(name);
  const current = typeof field.value === "string" ? field.value : "";

  return (
    <CostSheetHandleSelect
      id={name}
      value={current}
      disabled={disabled}
      compact={compact}
      error={error}
      onChange={(handleId) => {
        void helpers.setValue(handleId);
        void helpers.setTouched(true);
      }}
    />
  );
}
