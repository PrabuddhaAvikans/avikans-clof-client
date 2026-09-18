import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle, Play } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { Textarea } from "@/components/ui/Textarea";
import {
  useCompleteReprocessingBatch,
  useReprocessingBatch,
  useStartReprocessingBatch,
} from "@/features/reprocessing/hooks/useReprocessing";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import {
  computeCarriedValue,
  computeRecoveredUnitCost,
  sumReprocessingCosts,
  validateReprocessingOutput,
} from "@/lib/materialScrap";
import { ReprocessingBatchStatusLabels } from "@/types/reprocessing";

export function ReprocessingBatchDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: batch, isLoading, error, refetch } = useReprocessingBatch(id);
  const startBatch = useStartReprocessingBatch();
  const completeBatch = useCompleteReprocessingBatch();

  const [completeOpen, setCompleteOpen] = useState(false);
  const [recoveredQuantity, setRecoveredQuantity] = useState(0);
  const [processLossQuantity, setProcessLossQuantity] = useState(0);
  const [labour, setLabour] = useState(0);
  const [electricity, setElectricity] = useState(0);
  const [machine, setMachine] = useState(0);
  const [other, setOther] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!batch || !completeOpen) return;
    setRecoveredQuantity(Math.max(0, batch.inputQuantity - 1));
    setProcessLossQuantity(Math.min(1, batch.inputQuantity));
    setLabour(batch.costs.labour);
    setElectricity(batch.costs.electricity);
    setMachine(batch.costs.machine);
    setOther(batch.costs.other);
    setNotes("");
  }, [batch, completeOpen]);

  const processingCost = useMemo(
    () => sumReprocessingCosts({ labour, electricity, machine, other }),
    [labour, electricity, machine, other],
  );

  const previewUnitCost = useMemo(() => {
    if (!batch || recoveredQuantity <= 0) return null;
    try {
      return computeRecoveredUnitCost({
        inputQuantity: batch.inputQuantity,
        inputUnitCost: batch.inputUnitCost,
        processingCost,
        recoveredQuantity,
      });
    } catch {
      return null;
    }
  }, [batch, recoveredQuantity, processingCost]);

  const validation = batch
    ? validateReprocessingOutput({
        inputQuantity: batch.inputQuantity,
        recoveredQuantity,
        processLossQuantity,
      })
    : { ok: false as const, message: "Loading…" };

  const handleStart = async () => {
    if (!batch) return;
    try {
      await startBatch.mutateAsync(batch.id);
      toast.success("Reprocessing started - scrap issued to WIP");
      void refetch();
    } catch (err) {
      toast.error(
        typeof err === "object" && err && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to start",
      );
    }
  };

  const handleComplete = async () => {
    if (!batch || !validation.ok) return;
    try {
      await completeBatch.mutateAsync({
        id: batch.id,
        data: {
          recoveredQuantity,
          processLossQuantity,
          costs: { labour, electricity, machine, other },
          notes: notes || undefined,
        },
      });
      toast.success("Reprocessing completed - recovered lot posted (no purchase)");
      setCompleteOpen(false);
      void refetch();
    } catch (err) {
      toast.error(
        typeof err === "object" && err && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to complete",
      );
    }
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title={batch ? batch.batchNumber : "Reprocessing batch"}
        description={
          batch
            ? `${batch.inputScrapSku} · ${formatNumber(batch.inputQuantity)} ${batch.inputUnit}`
            : undefined
        }
        breadcrumbs={[
          { label: "Inventory", href: ROUTES.inventory.list },
          { label: "Reprocessing", href: ROUTES.reprocessing.list },
          { label: batch?.batchNumber ?? "Details" },
        ]}
        actions={
          <Link to={ROUTES.reprocessing.list}>
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load batch." : null}
        onRetry={() => void refetch()}
      >
        {batch && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <StatusBadge
                variant={
                  batch.status === "completed"
                    ? "success"
                    : batch.status === "in_progress"
                      ? "info"
                      : "neutral"
                }
                dot
              >
                {ReprocessingBatchStatusLabels[batch.status]}
              </StatusBadge>
              <div className="ml-auto flex flex-wrap gap-2">
                {(batch.status === "draft" || batch.status === "in_progress") &&
                  !batch.wipLotId && (
                    <Button
                      size="sm"
                      leftIcon={<Play className="h-4 w-4" />}
                      loading={startBatch.isPending}
                      onClick={() => void handleStart()}
                    >
                      Start reprocessing
                    </Button>
                  )}
                {batch.status !== "completed" && batch.status !== "cancelled" && (
                  <Button
                    size="sm"
                    variant="success"
                    leftIcon={<CheckCircle className="h-4 w-4" />}
                    onClick={() => setCompleteOpen(true)}
                  >
                    Complete
                  </Button>
                )}
              </div>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Scrap carrying value"
                value={formatCurrency(
                  computeCarriedValue(batch.inputQuantity, batch.inputUnitCost),
                )}
                description={`${formatNumber(batch.inputQuantity)} × ${formatCurrency(batch.inputUnitCost)}`}
              />
              <SummaryCard
                title="Processing cost"
                value={formatCurrency(batch.totalProcessingCost)}
                description="Labour / energy / machine only"
              />
              <SummaryCard
                title="Recovered qty"
                value={
                  batch.recoveredQuantity != null
                    ? `${formatNumber(batch.recoveredQuantity)} ${batch.inputUnit}`
                    : "-"
                }
              />
              <SummaryCard
                title="Recovered unit cost"
                value={
                  batch.recoveredUnitCost != null
                    ? formatCurrency(batch.recoveredUnitCost)
                    : "-"
                }
                description="(scrap value + processing) ÷ recovered"
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-lg border border-border bg-card p-5 text-sm">
                <h3 className="mb-3 font-semibold">Input scrap</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">SKU</dt>
                    <dd className="font-mono text-xs">{batch.inputScrapSku}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Name</dt>
                    <dd>{batch.inputScrapName}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Unit cost (carried)</dt>
                    <dd>{formatCurrency(batch.inputUnitCost)}</dd>
                  </div>
                  {batch.wipLotId && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">WIP lot</dt>
                      <dd>
                        <Link
                          to={ROUTES.inventory.detail(batch.wipLotId)}
                          className="text-primary hover:underline"
                        >
                          View WIP
                        </Link>
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section className="rounded-lg border border-border bg-card p-5 text-sm">
                <h3 className="mb-3 font-semibold">Output</h3>
                {batch.status === "completed" ? (
                  <dl className="space-y-2">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Recovered lot</dt>
                      <dd>
                        {batch.recoveredLotId ? (
                          <Link
                            to={ROUTES.inventory.detail(batch.recoveredLotId)}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {batch.recoveredLotSku}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Process loss</dt>
                      <dd>
                        {formatNumber(batch.processLossQuantity ?? 0)} {batch.inputUnit}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Completed</dt>
                      <dd>{batch.completedAt ? formatDateTime(batch.completedAt) : "-"}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-muted-foreground">
                    Complete the batch to post recovered material at carried cost + processing.
                  </p>
                )}
              </section>
            </div>

            {batch.notes && (
              <p className="mt-4 text-sm text-muted-foreground">{batch.notes}</p>
            )}
          </>
        )}
      </PageContent>

      <Modal
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Complete reprocessing"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={completeBatch.isPending}
              disabled={!validation.ok}
              onClick={() => void handleComplete()}
            >
              Complete & post recovered
            </Button>
          </>
        }
      >
        {batch && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Input {formatNumber(batch.inputQuantity)} {batch.inputUnit}. Split into recovered
              material and process loss. Recovered unit cost adds processing only - no purchase.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={`Recovered (${batch.inputUnit})`}
                type="number"
                min={0}
                step={0.001}
                value={recoveredQuantity}
                onChange={(event) => setRecoveredQuantity(Number(event.target.value))}
              />
              <Input
                label={`Process loss (${batch.inputUnit})`}
                type="number"
                min={0}
                step={0.001}
                value={processLossQuantity}
                onChange={(event) => setProcessLossQuantity(Number(event.target.value))}
              />
              <Input
                label="Labour"
                type="number"
                min={0}
                step={0.01}
                value={labour}
                onChange={(event) => setLabour(Number(event.target.value))}
              />
              <Input
                label="Electricity"
                type="number"
                min={0}
                step={0.01}
                value={electricity}
                onChange={(event) => setElectricity(Number(event.target.value))}
              />
              <Input
                label="Machine / furnace"
                type="number"
                min={0}
                step={0.01}
                value={machine}
                onChange={(event) => setMachine(Number(event.target.value))}
              />
              <Input
                label="Other"
                type="number"
                min={0}
                step={0.01}
                value={other}
                onChange={(event) => setOther(Number(event.target.value))}
              />
            </div>
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                validation.ok
                  ? "border-border bg-muted/30 text-muted-foreground"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              Processing {formatCurrency(processingCost)}
              {previewUnitCost != null && (
                <> · Preview recovered cost/unit {formatCurrency(previewUnitCost)}</>
              )}
              {!validation.ok && <p className="mt-1">{validation.message}</p>}
            </div>
            <Textarea
              label="Notes"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        )}
      </Modal>
    </PageContainer>
  );
}
