import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Flame, Plus } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import {
  useCreateReprocessingBatch,
  useReprocessingBatches,
  useReusableScrapLots,
} from "@/features/reprocessing/hooks/useReprocessing";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/format";
import { computeCarriedValue, sumReprocessingCosts } from "@/lib/materialScrap";
import type { ReprocessingBatch } from "@/types/reprocessing";
import { ReprocessingBatchStatusLabels } from "@/types/reprocessing";

function statusVariant(
  status: ReprocessingBatch["status"],
): "neutral" | "info" | "success" | "warning" | "danger" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "info";
  if (status === "cancelled") return "danger";
  return "neutral";
}

export function ReprocessingBatchesPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useReprocessingBatches({
    page: 1,
    pageSize: 100,
  });
  const { data: scrapLots, refetch: refetchScrap } = useReusableScrapLots();
  const createBatch = useCreateReprocessingBatch();

  const [createOpen, setCreateOpen] = useState(false);
  const [scrapLotId, setScrapLotId] = useState("");
  const [inputQuantity, setInputQuantity] = useState(0);
  const [labour, setLabour] = useState(0);
  const [electricity, setElectricity] = useState(0);
  const [machine, setMachine] = useState(0);
  const [other, setOther] = useState(0);
  const [notes, setNotes] = useState("");

  const selectedLot = (scrapLots ?? []).find((lot) => lot.id === scrapLotId);
  const processingCost = sumReprocessingCosts({ labour, electricity, machine, other });

  const columns = useMemo<ColumnDef<ReprocessingBatch>[]>(
    () => [
      {
        accessorKey: "batchNumber",
        header: "Batch",
        cell: ({ row }) => (
          <Link
            to={ROUTES.reprocessing.detail(row.original.id)}
            className="font-medium text-primary hover:underline"
          >
            {row.original.batchNumber}
          </Link>
        ),
      },
      {
        id: "scrap",
        header: "Scrap lot",
        cell: ({ row }) => (
          <div>
            <p className="font-mono text-xs">{row.original.inputScrapSku}</p>
            <p className="text-xs text-muted-foreground">{row.original.inputScrapName}</p>
          </div>
        ),
      },
      {
        id: "qty",
        header: "Input",
        cell: ({ row }) =>
          `${formatNumber(row.original.inputQuantity)} ${row.original.inputUnit}`,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge variant={statusVariant(row.original.status)} size="sm">
            {ReprocessingBatchStatusLabels[row.original.status]}
          </StatusBadge>
        ),
      },
      {
        id: "recovered",
        header: "Recovered",
        cell: ({ row }) =>
          row.original.recoveredQuantity != null
            ? `${formatNumber(row.original.recoveredQuantity)} ${row.original.inputUnit}`
            : "—",
      },
      {
        id: "unitCost",
        header: "Recovered cost/u",
        cell: ({ row }) =>
          row.original.recoveredUnitCost != null
            ? formatCurrency(row.original.recoveredUnitCost)
            : "—",
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => formatDateTime(row.original.updatedAt),
      },
    ],
    [],
  );

  const openCreate = () => {
    void refetchScrap();
    setScrapLotId("");
    setInputQuantity(0);
    setLabour(0);
    setElectricity(0);
    setMachine(0);
    setOther(0);
    setNotes("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!scrapLotId || inputQuantity <= 0) {
      toast.error("Select a scrap lot and enter quantity");
      return;
    }
    try {
      const batch = await createBatch.mutateAsync({
        inputScrapLotId: scrapLotId,
        inputQuantity,
        costs: { labour, electricity, machine, other },
        notes: notes || undefined,
      });
      toast.success(`Batch ${batch.batchNumber} created`);
      setCreateOpen(false);
      void refetch();
      navigate(ROUTES.reprocessing.detail(batch.id));
    } catch (err) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to create reprocessing batch";
      toast.error(message);
    }
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Reprocessing"
        description="Melt reusable scrap into recovered material. Carries scrap value and adds only processing costs — never a new purchase."
        breadcrumbs={[
          { label: "Inventory", href: ROUTES.inventory.list },
          { label: "Reprocessing" },
        ]}
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New batch
          </Button>
        }
      />

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load reprocessing batches." : null}
        onRetry={() => void refetch()}
        isEmpty={!isLoading && (data?.items.length ?? 0) === 0}
        emptyTitle="No reprocessing batches"
        emptyAction={
          <Button leftIcon={<Flame className="h-4 w-4" />} onClick={openCreate}>
            Create first batch
          </Button>
        }
        loadingVariant="table"
      >
        <DataTable
          data={data?.items ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          pageSize={15}
        />
      </PageContent>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create reprocessing batch"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createBatch.isPending}
              onClick={() => void handleCreate()}
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Select
            label="Reusable scrap lot"
            value={scrapLotId}
            onChange={(event) => {
              const id = event.target.value;
              setScrapLotId(id);
              const lot = (scrapLots ?? []).find((item) => item.id === id);
              setInputQuantity(lot?.quantityAvailable ?? 0);
            }}
            options={[
              { value: "", label: "Select scrap lot…" },
              ...(scrapLots ?? []).map((lot) => ({
                value: lot.id,
                label: `${lot.sku} · ${formatNumber(lot.quantityAvailable)} ${lot.unit} @ ${formatCurrency(lot.costPrice)}`,
              })),
            ]}
          />
          {(scrapLots ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              No reusable scrap on hand. Complete a manufacturing job with scrap qty first.
            </p>
          )}
          <Input
            label={`Input quantity${selectedLot ? ` (${selectedLot.unit})` : ""}`}
            type="number"
            min={0}
            max={selectedLot?.quantityAvailable}
            step={0.001}
            value={inputQuantity}
            onChange={(event) => setInputQuantity(Number(event.target.value))}
          />
          {selectedLot && (
            <p className="text-xs text-muted-foreground">
              Carried scrap value:{" "}
              {formatCurrency(computeCarriedValue(inputQuantity, selectedLot.costPrice))}{" "}
              (not a purchase)
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Labour cost"
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
              label="Other processing"
              type="number"
              min={0}
              step={0.01}
              value={other}
              onChange={(event) => setOther(Number(event.target.value))}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Planned processing cost: {formatCurrency(processingCost)}
          </p>
          <Textarea
            label="Notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>
      </Modal>
    </PageContainer>
  );
}
