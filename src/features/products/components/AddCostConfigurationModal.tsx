import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Modal } from "@/components/ui";
import { CostSheetHandleSelect } from "@/features/products/components/CostSheetHandleField";
import {
  addCostConfiguration,
  DEFAULT_COST_CONFIGURATION_ID,
  resolveCostConfiguration,
  updateCostConfiguration,
} from "@/lib/costConfigurations";
import { loadCostingRates } from "@/lib/costingRates";
import { generateId } from "@/services/http";
import type { CostSheetLine } from "@/types/product";

type ExtraLineDraft = {
  id: string;
  handle: string;
  amount: string;
};

type ConfigDraft = {
  name: string;
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
  extraLines: ExtraLineDraft[];
};

export type AddCostConfigurationModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (configId: string) => void;
  defaultName?: string;
  editId?: string | null;
  seedExtraLine?: boolean;
};

function toLineDraft(line: CostSheetLine): ExtraLineDraft {
  return {
    id: line.id || generateId("csh"),
    handle: line.handle,
    amount: String(line.amount ?? 0),
  };
}

function emptyLine(): ExtraLineDraft {
  return {
    id: generateId("csh"),
    handle: "",
    amount: "0",
  };
}

function toDraft(editId?: string | null, defaultName = "", seedExtraLine = false): ConfigDraft {
  const rates = loadCostingRates();
  const editing = editId ? resolveCostConfiguration(editId) : null;
  const extraLines = (editing?.extraLines ?? []).map(toLineDraft);
  if (seedExtraLine) extraLines.push(emptyLine());
  return {
    name: editing?.name ?? defaultName,
    labourRatePerHour: String(editing?.labourRatePerHour ?? rates.labourRatePerHour),
    machineRatePerHour: String(editing?.machineRatePerHour ?? rates.machineRatePerHour),
    coatingCostPerUnit: String(editing?.coatingCostPerUnit ?? rates.coatingCostPerUnit),
    overheadPercent: String(editing?.overheadPercent ?? rates.overheadPercent),
    materialCost: String(editing?.materialCost ?? 0),
    labourCost: String(editing?.labourCost ?? 0),
    coatingFinishingCost: String(editing?.coatingFinishingCost ?? 0),
    machineCost: String(editing?.machineCost ?? 0),
    overheadCost: String(editing?.overheadCost ?? 0),
    otherCost: String(editing?.otherCost ?? 0),
    extraLines,
  };
}

function toAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function AddCostConfigurationModal({
  open,
  onClose,
  onCreated,
  defaultName = "",
  editId = null,
  seedExtraLine = false,
}: AddCostConfigurationModalProps) {
  const isDefault = Boolean(editId && editId === DEFAULT_COST_CONFIGURATION_ID);
  const isEditing = Boolean(editId);
  const [draft, setDraft] = useState<ConfigDraft>(() => toDraft(editId, defaultName, seedExtraLine));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(toDraft(editId, defaultName, seedExtraLine));
    setError("");
  }, [open, editId, defaultName, seedExtraLine]);

  const update = (key: Exclude<keyof ConfigDraft, "extraLines">, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateLine = (id: string, patch: Partial<ExtraLineDraft>) => {
    setDraft((current) => ({
      ...current,
      extraLines: current.extraLines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    }));
  };

  const addLine = () => {
    setDraft((current) => ({
      ...current,
      extraLines: [...current.extraLines, emptyLine()],
    }));
  };

  const removeLine = (id: string) => {
    setDraft((current) => ({
      ...current,
      extraLines: current.extraLines.filter((line) => line.id !== id),
    }));
  };

  const handleSave = () => {
    const name = draft.name.trim();
    if (!name) {
      setError("Configuration name is required");
      return;
    }

    const payload = {
      name,
      labourRatePerHour: toAmount(draft.labourRatePerHour),
      overtimeMultiplier: loadCostingRates().normalOvertimeMultiplier,
      normalOvertimeMultiplier: loadCostingRates().normalOvertimeMultiplier,
      doubleOvertimeMultiplier: loadCostingRates().doubleOvertimeMultiplier,
      machineRatePerHour: toAmount(draft.machineRatePerHour),
      coatingCostPerUnit: toAmount(draft.coatingCostPerUnit),
      overheadPercent: toAmount(draft.overheadPercent),
      materialCost: toAmount(draft.materialCost),
      labourCost: toAmount(draft.labourCost),
      coatingFinishingCost: toAmount(draft.coatingFinishingCost),
      machineCost: toAmount(draft.machineCost),
      overheadCost: toAmount(draft.overheadCost),
      otherCost: toAmount(draft.otherCost),
      extraLines: draft.extraLines
        .filter((line) => line.handle.trim() || toAmount(line.amount) > 0)
        .map((line) => ({
          id: line.id,
          handle: line.handle.trim(),
          amount: toAmount(line.amount),
        })),
    };

    const saved = isEditing && editId
      ? updateCostConfiguration(editId, payload)
      : addCostConfiguration(payload);

    if (!saved) {
      setError("Could not save this configuration.");
      return;
    }

    onCreated(saved.id);
    onClose();
    toast.success(isEditing ? `Updated "${saved.name}".` : `Added configuration "${saved.name}".`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit cost configuration" : "Add cost configuration"}
      size="md"
      zIndexClassName="z-[80]"
      closeOnEscape={false}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {isEditing ? "Save" : "Add"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Input
          label="Configuration name"
          required
          placeholder="e.g. Export, Premium, Economy"
          value={draft.name}
          error={error}
          disabled={isDefault}
          hint={isDefault ? "Company standard rates apply across products until you add another profile." : undefined}
          onChange={(event) => update("name", event.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Labour / hour"
            type="number"
            min={0}
            step={0.01}
            value={draft.labourRatePerHour}
            onChange={(event) => update("labourRatePerHour", event.target.value)}
          />
          <Input
            label="Machine / hour"
            type="number"
            min={0}
            step={0.01}
            value={draft.machineRatePerHour}
            onChange={(event) => update("machineRatePerHour", event.target.value)}
          />
          <Input
            label="Coating / unit"
            type="number"
            min={0}
            step={0.01}
            value={draft.coatingCostPerUnit}
            onChange={(event) => update("coatingCostPerUnit", event.target.value)}
          />
          <Input
            label="Overhead %"
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={draft.overheadPercent}
            onChange={(event) => update("overheadPercent", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Initial amounts</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Materials"
              type="number"
              min={0}
              step={0.01}
              value={draft.materialCost}
              onChange={(event) => update("materialCost", event.target.value)}
            />
            <Input
              label="Labour"
              type="number"
              min={0}
              step={0.01}
              value={draft.labourCost}
              onChange={(event) => update("labourCost", event.target.value)}
            />
            <Input
              label="Machine"
              type="number"
              min={0}
              step={0.01}
              value={draft.machineCost}
              onChange={(event) => update("machineCost", event.target.value)}
            />
            <Input
              label="Coating / finishing"
              type="number"
              min={0}
              step={0.01}
              value={draft.coatingFinishingCost}
              onChange={(event) => update("coatingFinishingCost", event.target.value)}
            />
            <Input
              label="Overhead amount"
              type="number"
              min={0}
              step={0.01}
              value={draft.overheadCost}
              onChange={(event) => update("overheadCost", event.target.value)}
            />
            <Input
              label="Other amount"
              type="number"
              min={0}
              step={0.01}
              value={draft.otherCost}
              onChange={(event) => update("otherCost", event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Extra cost lines</p>
              <p className="text-xs text-muted-foreground">
                Optional handles such as packaging or freight. Applied when this profile is used.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 text-[12px]"
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={addLine}
            >
              Add cost line
            </Button>
          </div>

          {draft.extraLines.length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              No extra lines on this profile yet.
            </p>
          ) : (
            <div className="space-y-2">
              {draft.extraLines.map((line) => (
                <div key={line.id} className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_120px_auto]">
                  <CostSheetHandleSelect
                    id={`config-handle-${line.id}`}
                    value={line.handle}
                    compact
                    handleModalZIndexClassName="z-[90]"
                    onChange={(handleId) => updateLine(line.id, { handle: handleId })}
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={line.amount}
                    aria-label="Amount"
                    onChange={(event) => updateLine(line.id, { amount: event.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeLine(line.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
