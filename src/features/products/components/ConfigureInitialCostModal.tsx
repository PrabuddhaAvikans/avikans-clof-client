import { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, FormField, Input, Modal, SearchableSelect } from "@/components/ui";
import { AddCostConfigurationModal } from "@/features/products/components/AddCostConfigurationModal";
import type { ProductFormSchemaValues } from "@/features/products/schemas/productSchema";
import { useCostConfigurations } from "@/hooks/useCostConfigurations";
import {
  cloneCostConfigurationLines,
  DEFAULT_COST_CONFIGURATION_ID,
  resolveCostConfiguration,
  resolveInitialCosts,
  toCostConfigurationOptions,
  updateCostConfiguration,
} from "@/lib/costConfigurations";
import { formatCostSheetHandleLabel } from "@/lib/costSheetHandles";
import { formatCurrency } from "@/lib/format";

type RateDraft = {
  labourRatePerHour: string;
  machineRatePerHour: string;
  coatingCostPerUnit: string;
  overheadPercent: string;
  materialCost: string;
  labourCost: string;
  coatingFinishingCost: string;
  machineCost: string;
  overheadCost: string;
  otherCost: string;
};

function toAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function draftFromConfig(config: ReturnType<typeof resolveCostConfiguration>): RateDraft {
  return {
    labourRatePerHour: String(config.labourRatePerHour),
    machineRatePerHour: String(config.machineRatePerHour),
    coatingCostPerUnit: String(config.coatingCostPerUnit),
    overheadPercent: String(config.overheadPercent),
    materialCost: String(config.materialCost),
    labourCost: String(config.labourCost),
    coatingFinishingCost: String(config.coatingFinishingCost),
    machineCost: String(config.machineCost),
    overheadCost: String(config.overheadCost),
    otherCost: String(config.otherCost),
  };
}

export type ConfigureInitialCostModalProps = {
  open: boolean;
  onClose: () => void;
};

export function ConfigureInitialCostModal({
  open,
  onClose,
}: ConfigureInitialCostModalProps) {
  const { values, setFieldValue } = useFormikContext<ProductFormSchemaValues>();
  const configs = useCostConfigurations();
  const currentId = values.costBreakdown.configurationId || DEFAULT_COST_CONFIGURATION_ID;
  const [selectedId, setSelectedId] = useState(currentId);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [defaultName, setDefaultName] = useState("");
  const [seedExtraLine, setSeedExtraLine] = useState(false);
  const [rateDraft, setRateDraft] = useState<RateDraft>(() =>
    draftFromConfig(resolveCostConfiguration(currentId)),
  );

  const selected =
    configs.find((config) => config.id === selectedId) ?? resolveCostConfiguration(selectedId);

  useEffect(() => {
    if (!open) return;
    const nextId = values.costBreakdown.configurationId || DEFAULT_COST_CONFIGURATION_ID;
    setSelectedId(nextId);
    setRateDraft(draftFromConfig(resolveCostConfiguration(nextId)));
  }, [open, values.costBreakdown.configurationId]);

  useEffect(() => {
    if (!open || addOpen) return;
    setRateDraft(draftFromConfig(selected));
  }, [
    open,
    addOpen,
    selected.id,
    selected.labourRatePerHour,
    selected.machineRatePerHour,
    selected.coatingCostPerUnit,
    selected.overheadPercent,
    selected.materialCost,
    selected.labourCost,
    selected.coatingFinishingCost,
    selected.machineCost,
    selected.overheadCost,
    selected.otherCost,
  ]);

  const options = useMemo(() => {
    const list = toCostConfigurationOptions(configs);
    if (selected.id && !list.some((option) => option.value === selected.id)) {
      list.push({
        value: selected.id,
        label:
          selected.id === DEFAULT_COST_CONFIGURATION_ID
            ? `${selected.name} (default)`
            : selected.name,
      });
    }
    return list;
  }, [configs, selected.id, selected.name]);

  const extraLines = selected.extraLines ?? [];

  const persistDraft = () => {
    return updateCostConfiguration(selected.id, {
      labourRatePerHour: toAmount(rateDraft.labourRatePerHour),
      overtimeMultiplier: selected.normalOvertimeMultiplier,
      normalOvertimeMultiplier: selected.normalOvertimeMultiplier,
      doubleOvertimeMultiplier: selected.doubleOvertimeMultiplier,
      machineRatePerHour: toAmount(rateDraft.machineRatePerHour),
      coatingCostPerUnit: toAmount(rateDraft.coatingCostPerUnit),
      overheadPercent: toAmount(rateDraft.overheadPercent),
      materialCost: toAmount(rateDraft.materialCost),
      labourCost: toAmount(rateDraft.labourCost),
      coatingFinishingCost: toAmount(rateDraft.coatingFinishingCost),
      machineCost: toAmount(rateDraft.machineCost),
      overheadCost: toAmount(rateDraft.overheadCost),
      otherCost: toAmount(rateDraft.otherCost),
    });
  };

  const applyConfiguration = (configId: string, closeAfter = false) => {
    const saved = configId === selected.id ? persistDraft() : resolveCostConfiguration(configId);
    const config = saved ?? resolveCostConfiguration(configId);
    const next = resolveInitialCosts(config, values.bom ?? [], values.operations ?? []);
    void setFieldValue("costBreakdown.configurationId", config.id);
    void setFieldValue("costBreakdown.overrideMaterial", false);
    void setFieldValue("costBreakdown.overrideLabour", false);
    void setFieldValue("costBreakdown.overrideCoating", false);
    void setFieldValue("costBreakdown.overrideMachine", false);
    void setFieldValue("costBreakdown.overrideOverhead", false);
    void setFieldValue("costBreakdown.materialCost", next.materialCost);
    void setFieldValue("costBreakdown.labourCost", next.labourCost);
    void setFieldValue("costBreakdown.coatingFinishingCost", next.coatingFinishingCost);
    void setFieldValue("costBreakdown.machineCost", next.machineCost);
    void setFieldValue("costBreakdown.overheadCost", next.overheadCost);
    void setFieldValue("costBreakdown.otherCost", next.otherCost);
    void setFieldValue("costBreakdown.extraLines", cloneCostConfigurationLines(config.extraLines));
    setSelectedId(config.id);
    toast.success(`Using "${config.name}" for initial amounts.`);
    if (closeAfter) onClose();
  };

  const openAddModal = (options?: { edit?: boolean; extraLine?: boolean }) => {
    persistDraft();
    setEditId(options?.edit ? selected.id : null);
    setDefaultName(options?.edit ? selected.name : "");
    setSeedExtraLine(Boolean(options?.extraLine));
    setAddOpen(true);
  };

  const updateDraft = (key: keyof RateDraft, value: string) => {
    setRateDraft((current) => ({ ...current, [key]: value }));
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Configure initial amounts"
        size="md"
        closeOnEscape={!addOpen}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => applyConfiguration(selected.id, true)}>
              Use this configuration
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormField
            id="cost-configuration"
            label="Configuration"
            hint="Edit rates and initial amounts below, or add another profile if this product needs different values."
          >
            <div className="flex items-start gap-2">
              <SearchableSelect
                id="cost-configuration"
                className="min-w-0 flex-1"
                options={options}
                value={selected.id}
                placeholder="Select configuration..."
                searchPlaceholder="Search configurations..."
                onCreateNew={(query) => {
                  persistDraft();
                  setEditId(null);
                  setDefaultName(query);
                  setSeedExtraLine(false);
                  setAddOpen(true);
                }}
                createNewLabel={(query) => `Add "${query}"`}
                onChange={(id) => {
                  persistDraft();
                  setSelectedId(id);
                  setRateDraft(draftFromConfig(resolveCostConfiguration(id)));
                }}
              />
              <Button
                type="button"
                variant="outline"
                leftIcon={<Pencil className="h-4 w-4" />}
                className="shrink-0"
                onClick={() => openAddModal({ edit: true })}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="outline"
                leftIcon={<Plus className="h-4 w-4" />}
                className="shrink-0"
                onClick={() => openAddModal()}
              >
                Add
              </Button>
            </div>
          </FormField>

          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Item</th>
                  <th className="px-3 py-2 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                <SectionRow label="Rates" />
                <EditableRow
                  label="Labour / hour"
                  value={rateDraft.labourRatePerHour}
                  prefix="LKR"
                  onChange={(value) => updateDraft("labourRatePerHour", value)}
                  onBlur={persistDraft}
                />
                <EditableRow
                  label="Machine / hour"
                  value={rateDraft.machineRatePerHour}
                  prefix="LKR"
                  onChange={(value) => updateDraft("machineRatePerHour", value)}
                  onBlur={persistDraft}
                />
                <EditableRow
                  label="Coating / unit"
                  value={rateDraft.coatingCostPerUnit}
                  prefix="LKR"
                  onChange={(value) => updateDraft("coatingCostPerUnit", value)}
                  onBlur={persistDraft}
                />
                <EditableRow
                  label="Overhead"
                  value={rateDraft.overheadPercent}
                  suffix="%"
                  onChange={(value) => updateDraft("overheadPercent", value)}
                  onBlur={persistDraft}
                />
                <SectionRow label="Initial amounts" />
                <EditableRow
                  label="Materials"
                  value={rateDraft.materialCost}
                  prefix="LKR"
                  onChange={(value) => updateDraft("materialCost", value)}
                  onBlur={persistDraft}
                />
                <EditableRow
                  label="Labour"
                  value={rateDraft.labourCost}
                  prefix="LKR"
                  onChange={(value) => updateDraft("labourCost", value)}
                  onBlur={persistDraft}
                />
                <EditableRow
                  label="Machine"
                  value={rateDraft.machineCost}
                  prefix="LKR"
                  onChange={(value) => updateDraft("machineCost", value)}
                  onBlur={persistDraft}
                />
                <EditableRow
                  label="Coating / finishing"
                  value={rateDraft.coatingFinishingCost}
                  prefix="LKR"
                  onChange={(value) => updateDraft("coatingFinishingCost", value)}
                  onBlur={persistDraft}
                />
                <EditableRow
                  label="Overhead amount"
                  value={rateDraft.overheadCost}
                  prefix="LKR"
                  onChange={(value) => updateDraft("overheadCost", value)}
                  onBlur={persistDraft}
                />
                <EditableRow
                  label="Other"
                  value={rateDraft.otherCost}
                  prefix="LKR"
                  onChange={(value) => updateDraft("otherCost", value)}
                  onBlur={persistDraft}
                />
                {extraLines.map((line) => (
                  <SummaryRow
                    key={line.id}
                    label={formatCostSheetHandleLabel(line.handle) || "Extra cost"}
                    value={formatCurrency(Number(line.amount) || 0, "LKR")}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Initial amounts are used on the cost sheet. BOM and operations replace a line only when that line has a calculated value.
          </p>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => openAddModal({ edit: true, extraLine: true })}
            >
              Add cost line
            </Button>
          </div>
        </div>
      </Modal>

      <AddCostConfigurationModal
        open={addOpen}
        editId={editId}
        seedExtraLine={seedExtraLine}
        onClose={() => {
          setAddOpen(false);
          setEditId(null);
          setSeedExtraLine(false);
        }}
        defaultName={defaultName}
        onCreated={(id) => {
          setSelectedId(id);
          applyConfiguration(id);
        }}
      />
    </>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <tr className="border-t border-border bg-muted/30">
      <td className="px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground" colSpan={2}>
        {label}
      </td>
    </tr>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-muted-foreground">{label}</td>
      <td className="px-3 py-2 text-right tabular-nums font-medium">{value}</td>
    </tr>
  );
}

function EditableRow({
  label,
  value,
  prefix,
  suffix,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  return (
    <tr className="border-t border-border">
      <td className="px-3 py-2 text-muted-foreground">{label}</td>
      <td className="px-3 py-1.5">
        <div className="ml-auto flex max-w-[160px] items-center justify-end gap-1.5">
          {prefix ? <span className="text-xs text-muted-foreground">{prefix}</span> : null}
          <Input
            type="number"
            min={0}
            step={0.01}
            size="sm"
            className="w-[92px]"
            inputClassName="text-right tabular-nums"
            value={value}
            aria-label={label}
            onChange={(event) => onChange(event.target.value)}
            onBlur={onBlur}
          />
          {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
        </div>
      </td>
    </tr>
  );
}
