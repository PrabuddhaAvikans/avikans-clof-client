import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { validateProductionMaterialBreakdown } from "@/lib/materialScrap";
import type { ManufacturingJob, ProductionCompletionInput } from "@/types/manufacturing";

type Props = {
  job: ManufacturingJob | null;
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (completion: ProductionCompletionInput) => void;
};

export function CompleteJobDialog({ job, open, loading, onClose, onSubmit }: Props) {
  const issuedQuantity = useMemo(
    () => (job?.materialRequirements ?? []).reduce((sum, mr) => sum + mr.issuedQuantity, 0),
    [job],
  );
  const unit = job?.materialRequirements[0]?.unit ?? "kg";

  const [finishedMaterialQuantity, setFinishedMaterialQuantity] = useState(0);
  const [reusableScrapQuantity, setReusableScrapQuantity] = useState(0);
  const [recoverableQuantity, setRecoverableQuantity] = useState(0);
  const [permanentWasteQuantity, setPermanentWasteQuantity] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open || !job) return;
    const issued = job.materialRequirements.reduce((sum, mr) => sum + mr.issuedQuantity, 0);
    setFinishedMaterialQuantity(issued);
    setReusableScrapQuantity(0);
    setRecoverableQuantity(0);
    setPermanentWasteQuantity(0);
    setNotes("");
  }, [open, job]);

  const validation = validateProductionMaterialBreakdown({
    issuedQuantity,
    finishedMaterialQuantity,
    reusableScrapQuantity,
    recoverableQuantity,
    permanentWasteQuantity,
  });

  const accounted =
    finishedMaterialQuantity + reusableScrapQuantity + recoverableQuantity + permanentWasteQuantity;

  if (!job) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Complete ${job.jobNumber}`}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={loading}
            disabled={!validation.ok}
            onClick={() =>
              onSubmit({
                finishedMaterialQuantity,
                reusableScrapQuantity,
                recoverableQuantity,
                permanentWasteQuantity,
                notes: notes || undefined,
              })
            }
          >
            Complete & post inventory
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Material issued:{" "}
          <span className="font-medium text-foreground">
            {issuedQuantity} {unit}
          </span>
          . Split into finished consumption, reusable scrap, recoverable material, and permanent
          waste. Reusable scrap keeps the original material cost - it is not a new purchase.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label={`Finished material (${unit})`}
            type="number"
            min={0}
            step={0.001}
            value={finishedMaterialQuantity}
            onChange={(event) => setFinishedMaterialQuantity(Number(event.target.value))}
            hint="Material mass in finished product"
          />
          <Input
            label={`Reusable scrap (${unit})`}
            type="number"
            min={0}
            step={0.001}
            value={reusableScrapQuantity}
            onChange={(event) => setReusableScrapQuantity(Number(event.target.value))}
            hint="Returned to scrap inventory at carried cost"
          />
          <Input
            label={`Other recoverable (${unit})`}
            type="number"
            min={0}
            step={0.001}
            value={recoverableQuantity}
            onChange={(event) => setRecoverableQuantity(Number(event.target.value))}
          />
          <Input
            label={`Permanent waste (${unit})`}
            type="number"
            min={0}
            step={0.001}
            value={permanentWasteQuantity}
            onChange={(event) => setPermanentWasteQuantity(Number(event.target.value))}
            hint="Process loss - not an inventory asset"
          />
        </div>

        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            validation.ok
              ? "border-border bg-muted/30 text-muted-foreground"
              : "border-destructive/40 bg-destructive/5 text-destructive"
          }`}
        >
          Accounted: {accounted} {unit} / Issued: {issuedQuantity} {unit}
          {!validation.ok && <p className="mt-1">{validation.message}</p>}
        </div>

        <Textarea
          label="Notes"
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Optional completion notes"
        />
      </div>
    </Modal>
  );
}
