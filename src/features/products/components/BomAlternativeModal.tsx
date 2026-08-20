import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { Textarea } from "@/components/ui/Textarea";
import type { BomLineInput } from "@/types/product";
import type { InventoryItem } from "@/types/inventory";

type AlternativeDraft = NonNullable<BomLineInput["alternatives"]>[number];

export type BomAlternativeModalProps = {
  open: boolean;
  onClose: () => void;
  inventoryItems: InventoryItem[];
  alternatives: AlternativeDraft[];
  onSave: (alternatives: AlternativeDraft[]) => void;
};

export function BomAlternativeModal({
  open,
  onClose,
  inventoryItems,
  alternatives,
  onSave,
}: BomAlternativeModalProps) {
  const [draft, setDraft] = useState<AlternativeDraft[]>(alternatives);

  useEffect(() => {
    if (open) {
      setDraft(alternatives);
    }
  }, [open, alternatives]);

  const itemOptions = useMemo(
    () =>
      inventoryItems.map((item) => ({
        value: item.id,
        label: `${item.name} (${item.sku})`,
      })),
    [inventoryItems],
  );

  const addAlternative = (inventoryItemId: string) => {
    const item = inventoryItems.find((entry) => entry.id === inventoryItemId);
    if (!item) return;
    if (draft.some((alt) => alt.inventoryItemId === item.id)) return;
    setDraft((current) => [
      ...current,
      {
        inventoryItemId: item.id,
        inventoryItemName: item.name,
        sku: item.sku,
        unit: item.unit,
        unitCost: item.costPrice,
        isApproved: false,
      },
    ]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Alternative Components"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Save Alternatives
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Alternatives must be approved before production can substitute them. They are never
          applied silently.
        </p>

        <SearchableSelect
          label="Add alternative inventory item"
          options={itemOptions}
          onChange={addAlternative}
          placeholder="Search inventory..."
        />

        {draft.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alternatives defined.</p>
        ) : (
          <div className="space-y-3">
            {draft.map((alt, index) => (
              <div key={alt.inventoryItemId} className="rounded-md border border-border p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">{alt.inventoryItemName}</div>
                    <div className="text-xs text-muted-foreground">{alt.sku}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setDraft((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    label="Unit cost"
                    type="number"
                    min={0}
                    step={0.01}
                    value={alt.unitCost}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setDraft((current) =>
                        current.map((entry, i) =>
                          i === index ? { ...entry, unitCost: value } : entry,
                        ),
                      );
                    }}
                  />
                  <label className="flex items-center gap-2 pt-6 text-sm">
                    <input
                      type="checkbox"
                      checked={alt.isApproved}
                      onChange={(event) => {
                        setDraft((current) =>
                          current.map((entry, i) =>
                            i === index ? { ...entry, isApproved: event.target.checked } : entry,
                          ),
                        );
                      }}
                    />
                    Approved for production
                  </label>
                  <Textarea
                    label="Notes"
                    rows={2}
                    className="sm:col-span-2"
                    value={alt.notes ?? ""}
                    onChange={(event) => {
                      setDraft((current) =>
                        current.map((entry, i) =>
                          i === index ? { ...entry, notes: event.target.value } : entry,
                        ),
                      );
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
