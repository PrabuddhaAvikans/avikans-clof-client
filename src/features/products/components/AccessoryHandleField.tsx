import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useFormikFieldState } from "@/components/forms/useFormikFieldState";
import { AddAccessoryHandleModal } from "@/features/products/components/AddAccessoryHandleModal";
import { useAccessoryHandles } from "@/hooks/useAccessoryHandles";
import { formatAccessoryHandleLabel, toAccessoryHandleOptions } from "@/lib/accessoryHandles";

export type AccessoryHandleSelectProps = {
  id?: string;
  value: string;
  onChange: (handleId: string) => void;
  disabled?: boolean;
  compact?: boolean;
  error?: string;
};

export function AccessoryHandleSelect({
  id,
  value,
  onChange,
  disabled,
  compact = false,
  error,
}: AccessoryHandleSelectProps) {
  const handles = useAccessoryHandles();
  const [modalOpen, setModalOpen] = useState(false);
  const [defaultName, setDefaultName] = useState("");

  const options = useMemo(() => {
    const list = toAccessoryHandleOptions(handles);
    if (value && !list.some((option) => option.value === value)) {
      list.push({
        value,
        label: formatAccessoryHandleLabel(value),
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
          placeholder="Select accessory..."
          searchPlaceholder="Search accessories..."
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

      <AddAccessoryHandleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultName={defaultName}
        onCreated={onChange}
      />
    </>
  );
}

export type AccessoryHandleFieldProps = {
  name: string;
  disabled?: boolean;
  compact?: boolean;
  onSelected?: (handleId: string) => void;
};

export function AccessoryHandleField({
  name,
  disabled,
  compact = false,
  onSelected,
}: AccessoryHandleFieldProps) {
  const { field, error, helpers } = useFormikFieldState(name);
  const current = typeof field.value === "string" ? field.value : "";

  return (
    <AccessoryHandleSelect
      id={name}
      value={current}
      disabled={disabled}
      compact={compact}
      error={error}
      onChange={(handleId) => {
        void helpers.setValue(handleId);
        void helpers.setTouched(true);
        onSelected?.(handleId);
      }}
    />
  );
}
