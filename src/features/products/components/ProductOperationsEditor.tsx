import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { Button } from "@/components/ui/Button";
import { FormikInput, FormikTextarea } from "@/components/forms";
import { FormikCheckbox } from "@/components/forms/FormikCheckbox";
import type { ProductFormSchemaValues } from "@/features/products/schemas/productSchema";

interface Props {
  readOnly?: boolean;
}

export function ProductOperationsEditor({ readOnly = false }: Props) {
  const { values, setFieldValue } = useFormikContext<ProductFormSchemaValues>();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const operations = useMemo(() => values.operations ?? [], [values.operations]);

  const setOps = useCallback(
    (next: typeof operations) => setFieldValue("operations", next),
    [setFieldValue],
  );

  const handleAdd = () => {
    const maxSeq = operations.reduce((max, op) => Math.max(max, op.sequence ?? 0), 0);
    const nextSeq = Math.ceil(maxSeq / 10) * 10 + 10;
    const previousId = operations[operations.length - 1]?.id;
    setOps([
      ...operations,
      {
        id: `op-${crypto.randomUUID().slice(0, 8)}`,
        name: "",
        sequence: nextSeq,
        description: "",
        workstation: "",
        estimatedHours: 0,
        labourCostRate: undefined,
        machineName: "",
        machineCost: undefined,
        isRequired: true,
        isEnabled: true,
        notes: "",
        prerequisiteOperationIds: previousId ? [previousId] : [],
        isQualityCheck: false,
      },
    ]);
    setExpandedIndex(operations.length);
  };

  const handleRemove = (index: number) => {
    const next = operations.filter((_, i) => i !== index);
    setOps(next);
    if (expandedIndex === index) setExpandedIndex(null);
    else if (expandedIndex !== null && expandedIndex > index)
      setExpandedIndex(expandedIndex - 1);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= operations.length) return;
    const next = [...operations];
    const seqA = next[index].sequence;
    const seqB = next[target].sequence;
    [next[index], next[target]] = [next[target], next[index]];
    next[index] = { ...next[index], sequence: seqA };
    next[target] = { ...next[target], sequence: seqB };
    setOps(next);
    if (expandedIndex === index) setExpandedIndex(target);
    else if (expandedIndex === target) setExpandedIndex(index);
  };

  if (readOnly) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-4">Seq</th>
              <th className="pb-2 pr-4">Operation</th>
              <th className="pb-2 pr-4">Workstation</th>
              <th className="pb-2 pr-4 text-right">Est. Time</th>
              <th className="pb-2 pr-4 text-right">Labour</th>
              <th className="pb-2 pr-4">Machine</th>
              <th className="pb-2 pr-4 text-right">Machine Cost</th>
              <th className="pb-2 pr-4 text-center">Req</th>
              <th className="pb-2 pr-4 text-center">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {operations.map((op, index) => (
              <tr
                key={op.id ?? `${index}`}
                className={`border-b border-border last:border-0 ${op.isEnabled === false ? "opacity-40" : ""}`}
              >
                <td className="py-2.5 pr-4 font-mono text-xs">{op.sequence ?? (index + 1) * 10}</td>
                <td className="py-2.5 pr-4">
                  <div>{op.name || "-"}</div>
                  {op.description && (
                    <div className="text-xs text-muted-foreground">{op.description}</div>
                  )}
                </td>
                <td className="py-2.5 pr-4">{op.workstation || "-"}</td>
                <td className="py-2.5 pr-4 text-right">{formatTime(op.estimatedHours)}</td>
                <td className="py-2.5 pr-4 text-right">
                  {op.labourCostRate != null ? op.labourCostRate.toLocaleString() : "-"}
                </td>
                <td className="py-2.5 pr-4">{op.machineName || "-"}</td>
                <td className="py-2.5 pr-4 text-right">
                  {op.machineCost != null ? op.machineCost.toLocaleString() : "-"}
                </td>
                <td className="py-2.5 pr-4 text-center">{op.isRequired !== false ? "✓" : "-"}</td>
                <td className="py-2.5 pr-4 text-center">{op.isEnabled !== false ? "✓" : "-"}</td>
              </tr>
            ))}
            {operations.length === 0 && (
              <tr>
                <td colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                  No operations defined.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Define the manufacturing operations for this product version.
        These become manufacturing tasks when a production job is created. Tasks are not department-based.
      </p>

      <div className="space-y-1">
        {operations.map((op, index) => {
          const isExpanded = expandedIndex === index;
          return (
            <div
              key={op.id ?? `${index}`}
              className={`rounded-lg border ${op.isEnabled === false ? "border-border/50 bg-muted/30 opacity-60" : "border-border bg-card"}`}
            >
              {/* Compact row */}
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                <span className="w-12 shrink-0 font-mono text-xs text-muted-foreground">
                  {op.sequence ?? (index + 1) * 10}
                </span>

                <div className="min-w-0 flex-1">
                  <FormikInput name={`operations.${index}.name`} label={undefined} placeholder="Operation name" />
                </div>

                <div className="hidden w-32 shrink-0 sm:block">
                  <FormikInput name={`operations.${index}.workstation`} label={undefined} placeholder="Resource" />
                </div>

                <div className="hidden w-20 shrink-0 sm:block">
                  <FormikInput
                    name={`operations.${index}.estimatedHours`}
                    type="number"
                    min={0}
                    step={0.25}
                    label={undefined}
                    placeholder="Hrs"
                  />
                </div>

                <div className="flex shrink-0 gap-0.5">
                  <Button
                    type="button" variant="ghost" size="sm"
                    disabled={index === 0}
                    onClick={() => handleMove(index, "up")}
                    className="h-7 w-7 p-0"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="sm"
                    disabled={index === operations.length - 1}
                    onClick={() => handleMove(index, "down")}
                    className="h-7 w-7 p-0"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="sm"
                    onClick={() => handleRemove(index)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-border px-3 pb-3 pt-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <FormikInput
                      name={`operations.${index}.sequence`}
                      type="number"
                      min={1}
                      step={10}
                      label="Sequence / Step #"
                    />
                    <FormikInput
                      name={`operations.${index}.description`}
                      label="Description / Instructions"
                    />
                    <FormikInput
                      name={`operations.${index}.workstation`}
                      label="Resource / location (optional)"
                    />
                    <FormikInput
                      name={`operations.${index}.estimatedHours`}
                      type="number"
                      min={0}
                      step={0.25}
                      label="Estimated Time (hours)"
                    />
                    <FormikInput
                      name={`operations.${index}.labourCostRate`}
                      type="number"
                      min={0}
                      label="Labour Cost / Rate"
                    />
                    <FormikInput
                      name={`operations.${index}.machineName`}
                      label="Machine / Equipment"
                    />
                    <FormikInput
                      name={`operations.${index}.machineCost`}
                      type="number"
                      min={0}
                      label="Machine Cost"
                    />
                    <div className="flex items-end gap-6 pb-1">
                      <FormikCheckbox
                        name={`operations.${index}.isRequired`}
                        label="Required"
                      />
                      <FormikCheckbox
                        name={`operations.${index}.isEnabled`}
                        label="Enabled"
                      />
                      <FormikCheckbox
                        name={`operations.${index}.isQualityCheck`}
                        label="QC task"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs font-medium text-foreground">Depends on</p>
                    <p className="mb-2 text-[11px] text-muted-foreground">
                      Leave empty to start independently. Select one or more prior operations for sequence or parallel joins.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {operations.map((other, otherIndex) => {
                        if (otherIndex === index || !other.id) return null;
                        const selected = (op.prerequisiteOperationIds ?? []).includes(other.id);
                        return (
                          <label
                            key={other.id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs"
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(event) => {
                                const current = op.prerequisiteOperationIds ?? [];
                                const next = event.target.checked
                                  ? [...current, other.id!]
                                  : current.filter((id) => id !== other.id);
                                void setFieldValue(`operations.${index}.prerequisiteOperationIds`, next);
                              }}
                            />
                            {other.name || `Step ${other.sequence ?? otherIndex + 1}`}
                          </label>
                        );
                      })}
                      {operations.length <= 1 && (
                        <span className="text-xs text-muted-foreground">Add more operations to set dependencies.</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <FormikTextarea
                      name={`operations.${index}.notes`}
                      label="Notes"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {operations.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No operations defined yet. Click "Add Operation" to start building the routing.
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={handleAdd}>
          Add Operation
        </Button>
      </div>
    </div>
  );
}

function formatTime(hours: number | undefined): string {
  if (hours == null || hours === 0) return "-";
  if (hours < 1) return `${Math.round(hours * 60)} mins`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
