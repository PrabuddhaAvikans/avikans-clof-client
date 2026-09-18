import { RefreshCw } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useFormikFieldState } from "@/components/forms/useFormikFieldState";

export type InventorySkuFieldProps = {
  disabled?: boolean;
  onGenerate: () => void;
  onManualEdit?: () => void;
};

export function InventorySkuField({ disabled, onGenerate, onManualEdit }: InventorySkuFieldProps) {
  const { field, error, helpers } = useFormikFieldState("sku");

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <FormField id="sku" label="Item Code (SKU)" required error={error} hint="Unique code. Generate from type and name, or enter your own.">
          <Input
            id="sku"
            name="sku"
            value={typeof field.value === "string" ? field.value : ""}
            disabled={disabled}
            placeholder="e.g. CMP-LED-001"
            onBlur={field.onBlur}
            onChange={(event) => {
              onManualEdit?.();
              void helpers.setValue(event.target.value);
            }}
          />
        </FormField>
      </div>
      <Button
        type="button"
        variant="outline"
        className="mt-[1.375rem] shrink-0"
        disabled={disabled}
        leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
        onClick={onGenerate}
      >
        Generate
      </Button>
    </div>
  );
}
