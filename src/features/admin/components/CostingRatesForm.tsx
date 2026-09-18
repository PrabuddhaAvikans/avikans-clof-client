import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  DEFAULT_COSTING_RATES,
  loadCostingRates,
  saveCostingRates,
  type CostingRates,
} from "@/lib/costingRates";

type CostingRatesFormProps = {
  compact?: boolean;
  readOnly?: boolean;
  onSaved?: (rates: CostingRates) => void;
};

export function CostingRatesForm({ compact = false, readOnly = false, onSaved }: CostingRatesFormProps) {
  const [rates, setRates] = useState<CostingRates>(loadCostingRates);

  const update = (key: keyof CostingRates, value: string) => {
    setRates((current) => ({
      ...current,
      [key]: value === "" ? 0 : Number(value),
    }));
  };

  const handleSave = () => {
    const saved = saveCostingRates(rates);
    setRates(saved);
    onSaved?.(saved);
    toast.success("Costing rates saved");
  };

  const handleReset = () => {
    setRates({ ...DEFAULT_COSTING_RATES });
  };

  return (
    <div className={compact ? "space-y-3" : "grid gap-3 sm:grid-cols-2"}>
      <Input
        label={compact ? "Labour / hour" : "Labour rate (per hour)"}
        type="number"
        min={0}
        step={0.01}
        hint={compact ? undefined : "Used when an operation has no labour rate"}
        value={rates.labourRatePerHour}
        disabled={readOnly}
        onChange={(event) => update("labourRatePerHour", event.target.value)}
      />
      <Input
        label={compact ? "Normal OT ×" : "Normal OT multiplier"}
        type="number"
        min={1}
        step={0.1}
        hint={compact ? undefined : "Weekday overtime (e.g. 1.5 = time-and-a-half). Hours above a task estimate default to this type."}
        value={rates.normalOvertimeMultiplier}
        disabled={readOnly}
        onChange={(event) => update("normalOvertimeMultiplier", event.target.value)}
      />
      <Input
        label={compact ? "Double OT ×" : "Double OT multiplier"}
        type="number"
        min={1}
        step={0.1}
        hint={compact ? undefined : "Holiday or Sunday overtime (e.g. 2 = double time). Entered separately when completing a task."}
        value={rates.doubleOvertimeMultiplier}
        disabled={readOnly}
        onChange={(event) => update("doubleOvertimeMultiplier", event.target.value)}
      />
      <Input
        label={compact ? "Machine / hour" : "Machine rate (per hour)"}
        type="number"
        min={0}
        step={0.01}
        hint={compact ? undefined : "Used when an operation has no machine cost"}
        value={rates.machineRatePerHour}
        disabled={readOnly}
        onChange={(event) => update("machineRatePerHour", event.target.value)}
      />
      <Input
        label={compact ? "Coating / unit" : "Coating / finishing (per unit)"}
        type="number"
        min={0}
        step={0.01}
        hint={compact ? undefined : "Fixed coating cost applied to each product"}
        value={rates.coatingCostPerUnit}
        disabled={readOnly}
        onChange={(event) => update("coatingCostPerUnit", event.target.value)}
      />
      <Input
        label="Overhead (%)"
        type="number"
        min={0}
        max={100}
        step={0.1}
        hint={compact ? undefined : "Applied on material + labour + machine + coating"}
        value={rates.overheadPercent}
        disabled={readOnly}
        onChange={(event) => update("overheadPercent", event.target.value)}
      />
      {!readOnly && (
        <div className={compact ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2 sm:col-span-2"}>
          <Button type="button" variant="primary" size="sm" leftIcon={<Save className="h-4 w-4" />} onClick={handleSave}>
            Save rates
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            Reset defaults
          </Button>
        </div>
      )}
    </div>
  );
}
