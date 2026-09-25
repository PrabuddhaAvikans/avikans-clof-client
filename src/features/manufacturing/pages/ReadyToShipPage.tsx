import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, CheckCircle2, Package, RefreshCw, XCircle } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCreateDelivery, useDeliveries, useUpdateDeliveryStatus } from "@/features/delivery/hooks/useDeliveries";
import { getDeliveryStatusAction } from "@/features/delivery/lib/deliveryStatus";
import { useManufacturingJobs } from "@/features/manufacturing/hooks/useManufacturing";
import {
  buildShipChecks,
  coverCompletedJobs,
  emptyCoverage,
  SHIP_DISPOSITION_LABEL,
  shipDisposition,
  type ShipCheck,
  type ShipCoverage,
  type ShipDisposition,
} from "@/features/manufacturing/lib/readyToShip";
import { useSalesOrders } from "@/features/sales/hooks/useSalesOrders";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ManufacturingJob } from "@/types/manufacturing";
import type { SalesOrder } from "@/types/sales-order";
import { DeliveryStatus, Priority, type DeliveryStatusValue } from "@/types/status";

type ShipRow = {
  job: ManufacturingJob;
  order?: SalesOrder;
  coverage: ShipCoverage;
  checks: ShipCheck[];
  disposition: ShipDisposition;
  canRelease: boolean;
};

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  ...(Object.keys(SHIP_DISPOSITION_LABEL) as ShipDisposition[]).map((value) => ({
    value,
    label: SHIP_DISPOSITION_LABEL[value],
  })),
];

const controlClass = "h-8 text-[12px]";

function toDatetimeLocalValue(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function dispositionVariant(disposition: ShipDisposition) {
  if (disposition === "ready") return "success" as const;
  if (disposition === "on_delivery") return "info" as const;
  if (disposition === "blocked") return "warning" as const;
  return "neutral" as const;
}

function sentPercent(row: ShipRow) {
  if (row.job.quantity <= 0) return 0;
  return Math.round((row.coverage.shippedQuantity / row.job.quantity) * 100);
}

export function ReadyToShipPage() {
  const navigate = useNavigate();
  const jobsQuery = useManufacturingJobs({ page: 1, pageSize: 100 });
  const deliveriesQuery = useDeliveries({ page: 1, pageSize: 100 });
  const ordersQuery = useSalesOrders({ page: 1, pageSize: 100 });
  const createDelivery = useCreateDelivery();
  const updateDeliveryStatus = useUpdateDeliveryStatus();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState("");

  const ordersById = useMemo(
    () => new Map((ordersQuery.data?.items ?? []).map((order) => [order.id, order])),
    [ordersQuery.data?.items],
  );

  const assessed = useMemo<ShipRow[]>(() => {
    const coverageByJob = coverCompletedJobs(
      (jobsQuery.data?.items ?? []).map((job) => ({
        id: job.id,
        salesOrderNumber: job.salesOrderNumber,
        productSku: job.productSku,
        quantity: job.quantity,
        status: job.status,
        completedAt: job.actualEndDate,
      })),
      (deliveriesQuery.data?.items ?? []).map((delivery) => ({
        id: delivery.id,
        deliveryNumber: delivery.deliveryNumber,
        salesOrderNumber: delivery.salesOrderNumber,
        status: delivery.status,
        items: delivery.items.map((item) => ({
          productSku: item.productSku,
          quantityOrdered: item.quantityOrdered,
          quantityDelivered: item.quantityDelivered,
        })),
      })),
    );

    return (jobsQuery.data?.items ?? [])
      .filter((job) => job.status === "completed")
      .map((job) => {
        const order = ordersById.get(job.salesOrderId);
        const coverage = coverageByJob.get(job.id) ?? emptyCoverage(job.quantity);
        const checks = buildShipChecks(job, order);
        const checksPassed = checks.every((check) => check.passed);
        const disposition = shipDisposition(coverage, checksPassed);
        return {
          job,
          order,
          coverage,
          checks,
          disposition,
          canRelease: checksPassed && coverage.remainingQuantity > 0,
        };
      });
  }, [deliveriesQuery.data?.items, jobsQuery.data?.items, ordersById]);

  const counts = useMemo(() => {
    const tally = { ready: 0, on_delivery: 0, shipped: 0, blocked: 0, qty: 0 };
    for (const row of assessed) {
      tally[row.disposition] += 1;
      tally.qty += row.coverage.remainingQuantity;
    }
    return tally;
  }, [assessed]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assessed.filter((row) => {
      if (status && row.disposition !== status) return false;
      if (!query) return true;
      return [row.job.jobNumber, row.job.customerName, row.job.productName, row.job.salesOrderNumber]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [assessed, search, status]);

  useEffect(() => {
    if (!rows.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !rows.some((row) => row.job.id === selectedId)) {
      setSelectedId(rows[0].job.id);
    }
  }, [rows, selectedId]);

  const selected = assessed.find((row) => row.job.id === selectedId) ?? null;
  const selectedJobId = selected?.job.id;
  const requestedDate = selected?.order?.requestedDeliveryDate;

  useEffect(() => {
    if (!selectedJobId) return;
    setScheduledDate(toDatetimeLocalValue(requestedDate));
  }, [requestedDate, selectedJobId]);

  const refresh = () => {
    jobsQuery.refetch();
    deliveriesQuery.refetch();
    ordersQuery.refetch();
    toast.success("Refreshed");
  };

  const handleRelease = async () => {
    if (!selected?.canRelease) return;
    const when = new Date(scheduledDate);
    if (!scheduledDate || Number.isNaN(when.getTime())) {
      toast.error("Choose a delivery date");
      return;
    }

    try {
      const delivery = await createDelivery.mutateAsync({
        salesOrderId: selected.job.salesOrderId,
        items: [
          {
            productId: selected.job.productId,
            productSku: selected.job.productSku,
            productName: selected.job.productName,
            quantityOrdered: selected.coverage.remainingQuantity,
            quantityDelivered: 0,
            unit: "pcs",
          },
        ],
        scheduledDate: when.toISOString(),
        priority: selected.order?.priority ?? selected.job.priority,
        notes: `From ${selected.job.jobNumber}`,
      });
      toast.success(`Delivery ${delivery.deliveryNumber} created`);
      deliveriesQuery.refetch();
    } catch (err) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message: string }).message)
          : "Could not create the delivery";
      toast.error(message);
    }
  };

  const handleAdvanceDelivery = async (deliveryId: string, status: DeliveryStatusValue) => {
    try {
      const updated = await updateDeliveryStatus.mutateAsync({ id: deliveryId, status });
      toast.success(
        `${updated.deliveryNumber} → ${statusLabel(DeliveryStatus, updated.status)}`,
      );
      deliveriesQuery.refetch();
    } catch (err) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message: string }).message)
          : "Could not update delivery status";
      toast.error(message);
    }
  };

  const columns = useMemo<ColumnDef<ShipRow>[]>(
    () => [
      {
        id: "job",
        header: "Job",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{row.original.job.jobNumber}</span>
        ),
      },
      {
        id: "product",
        header: "Product",
        cell: ({ row }) => (
          <div className="min-w-[120px] max-w-[180px]">
            <p className="truncate font-medium" title={row.original.job.productName}>
              {row.original.job.productName}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              {row.original.job.customerName} · {row.original.job.salesOrderNumber}
            </p>
          </div>
        ),
      },
      {
        id: "quantity",
        header: "Qty",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.job.quantity}</span>
        ),
      },
      {
        id: "remaining",
        header: "To send",
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.coverage.remainingQuantity}</span>
        ),
      },
      {
        id: "sent",
        header: "Sent",
        cell: ({ row }) => <QtyBar value={sentPercent(row.original)} />,
      },
      {
        id: "priority",
        header: "Priority",
        cell: ({ row }) => {
          const priority = row.original.order?.priority ?? row.original.job.priority;
          return (
            <StatusBadge variant={statusVariant(Priority, priority)} size="sm">
              {statusLabel(Priority, priority)}
            </StatusBadge>
          );
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge variant={dispositionVariant(row.original.disposition)} size="sm">
            {SHIP_DISPOSITION_LABEL[row.original.disposition]}
          </StatusBadge>
        ),
      },
    ],
    [],
  );

  const isLoading = jobsQuery.isLoading || deliveriesQuery.isLoading || ordersQuery.isLoading;
  const error =
    jobsQuery.error || deliveriesQuery.error || ordersQuery.error
      ? "Failed to load ready to ship."
      : null;

  const kpis: { id: ShipDisposition | "qty"; label: string; value: number }[] = [
    { id: "ready", label: "Can ship", value: counts.ready },
    { id: "on_delivery", label: "Booked", value: counts.on_delivery },
    { id: "shipped", label: "Delivered", value: counts.shipped },
    { id: "blocked", label: "Not ready", value: counts.blocked },
    { id: "qty", label: "Qty to send", value: counts.qty },
  ];
  const kpiMax = Math.max(...kpis.map((item) => item.value), 1);

  return (
    <PageContainer
      maxWidth="full"
      className="flex min-h-0 flex-col !gap-0 !px-2 !py-2 sm:!px-3 lg:!px-4"
    >
      <PageContent
        isLoading={isLoading}
        error={error}
        onRetry={refresh}
        isEmpty={!isLoading && assessed.length === 0}
        emptyTitle="No finished jobs"
        emptyDescription="Jobs appear here after production is complete."
        className="flex min-h-0 flex-1 flex-col"
        loadingVariant="table"
      >
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="col-span-1 flex flex-wrap items-center gap-1.5 border border-border bg-card px-2.5 py-1.5 lg:col-span-3 xl:col-span-4">
            <h1 className="mr-auto text-sm font-semibold tracking-tight text-foreground">
              Ready to Ship
            </h1>
            <IconButton
              variant="outline"
              size="sm"
              className="h-8 w-8"
              aria-label="Refresh"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={refresh}
            />
          </div>

          <div className="col-span-1 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:col-span-3 lg:grid-cols-5 xl:col-span-4">
            {kpis.map((item) => {
              const active = item.id !== "qty" && status === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.id === "qty"}
                  onClick={() => {
                    if (item.id === "qty") return;
                    setStatus((current) => (current === item.id ? "" : item.id));
                  }}
                  className={cn(
                    "min-w-0 border border-border bg-card px-2.5 py-2 text-left",
                    item.id !== "qty" && "hover:bg-muted/40",
                    active && "ring-1 ring-foreground",
                  )}
                >
                  <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                    {item.value}
                  </p>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-foreground"
                      style={{ width: `${Math.round((item.value / kpiMax) * 100)}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          <div className="col-span-1 flex flex-wrap items-center gap-1.5 border border-border bg-card px-2.5 py-1.5 lg:col-span-3 xl:col-span-4">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search jobs…"
              className={`${controlClass} min-w-[140px] flex-1 basis-[160px] sm:max-w-[220px]`}
              aria-label="Search jobs"
            />
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              options={STATUS_OPTIONS}
              selectClassName={`${controlClass} py-0`}
              className="w-[148px]"
              aria-label="Filter by ship status"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[11px]"
              onClick={() => {
                setSearch("");
                setStatus("");
              }}
            >
              Reset
            </Button>
            <p className="ml-auto text-[10px] tabular-nums text-muted-foreground">
              {rows.length} jobs
            </p>
          </div>

          <div className="col-span-1 flex min-h-0 min-w-0 flex-col border border-border bg-card lg:col-span-2 xl:col-span-3">
            <div className="flex items-center justify-between border-b border-border px-2.5 py-1">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Finished jobs
              </p>
            </div>
            <div className="min-w-0 flex-1 overflow-auto p-1">
              <DataTable
                data={rows}
                columns={columns}
                enableColumnVisibility={false}
                forceTable
                density="compact"
                pageSize={8}
                getRowId={(row) => row.job.id}
                emptyMessage="No jobs match filters."
                onRowClick={(row) => setSelectedId(row.job.id)}
                getRowClassName={(row) =>
                  row.job.id === selectedId ? "bg-muted/70" : undefined
                }
                className="[&>div]:rounded-none [&>div]:border-0"
              />
            </div>
          </div>

          <div className="col-span-1 max-h-[520px] overflow-auto border border-border bg-card p-2 lg:max-h-[min(720px,calc(100dvh-220px))]">
            <ShipDetailPanel
              row={selected}
              scheduledDate={scheduledDate}
              onScheduledDate={setScheduledDate}
              creating={createDelivery.isPending}
              updatingStatus={updateDeliveryStatus.isPending}
              onCreate={() => void handleRelease()}
              onAdvanceDelivery={(deliveryId, nextStatus, screen) => {
                if (screen === "dispatch") {
                  navigate(ROUTES.deliveries.dispatch(deliveryId));
                  return;
                }
                if (screen === "proof") {
                  navigate(ROUTES.deliveries.proof(deliveryId));
                  return;
                }
                void handleAdvanceDelivery(deliveryId, nextStatus);
              }}
              onOpenDelivery={(id) => navigate(ROUTES.deliveries.detail(id))}
              onOpenJob={(id) => navigate(ROUTES.manufacturing.jobDetail(id))}
            />
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}

function QtyBar({ value }: { value: number }) {
  return (
    <div className="flex min-w-[72px] items-center gap-1.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${value}%` }} />
      </div>
      <span className="w-7 text-right text-[10px] tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}

function ShipDetailPanel({
  row,
  scheduledDate,
  onScheduledDate,
  creating,
  updatingStatus,
  onCreate,
  onAdvanceDelivery,
  onOpenDelivery,
  onOpenJob,
}: {
  row: ShipRow | null;
  scheduledDate: string;
  onScheduledDate: (value: string) => void;
  creating: boolean;
  updatingStatus: boolean;
  onCreate: () => void;
  onAdvanceDelivery: (
    deliveryId: string,
    nextStatus: DeliveryStatusValue,
    screen?: "dispatch" | "proof",
  ) => void;
  onOpenDelivery: (id: string) => void;
  onOpenJob: (id: string) => void;
}) {
  if (!row) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center p-4 text-center text-[12px] text-muted-foreground">
        Select a job
      </div>
    );
  }

  const { job, coverage } = row;
  const shippedPct = job.quantity > 0 ? Math.round((coverage.shippedQuantity / job.quantity) * 100) : 0;
  const bookedPct = job.quantity > 0 ? Math.round((coverage.reservedQuantity / job.quantity) * 100) : 0;
  const problems = row.checks.filter((check) => !check.passed);
  const delivery =
    coverage.deliveries.find((item) => item.kind === (row.disposition === "shipped" ? "shipped" : "reserved")) ??
    coverage.deliveries[0];
  const statusAction = delivery
    ? getDeliveryStatusAction(delivery.status as DeliveryStatusValue)
    : null;

  return (
    <div className="flex h-full min-h-[240px] flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Ship detail
          </p>
          <p className="truncate text-sm font-semibold text-foreground">{job.jobNumber}</p>
        </div>
        <StatusBadge variant={dispositionVariant(row.disposition)} size="sm">
          {SHIP_DISPOSITION_LABEL[row.disposition]}
        </StatusBadge>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3 text-[12px]">
        <div className="flex gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-muted">
            <Package className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground" title={job.productName}>
              {job.productName}
            </p>
            <p className="text-[10px] text-muted-foreground">{job.productSku}</p>
            <div className="mt-1.5 grid grid-cols-3 gap-1 text-[10px]">
              <Meta label="Customer" value={job.customerName} />
              <Meta label="Order" value={job.salesOrderNumber} />
              <Meta label="Finished" value={job.actualEndDate ? formatDate(job.actualEndDate, "dd MMM") : "-"} />
            </div>
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-[10px]">
            <span className="uppercase tracking-wider text-muted-foreground">Quantity</span>
            <span className="font-semibold tabular-nums">
              {coverage.shippedQuantity + coverage.reservedQuantity}/{job.quantity}
            </span>
          </div>
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-foreground" style={{ width: `${shippedPct}%` }} />
            <div className="h-full bg-foreground/35" style={{ width: `${bookedPct}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px overflow-hidden border border-border bg-border">
          <Stat title="Delivered" value={String(coverage.shippedQuantity)} />
          <Stat title="Booked" value={String(coverage.reservedQuantity)} />
          <Stat title="To send" value={String(coverage.remainingQuantity)} />
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Checks
          </p>
          <ul className="space-y-1">
            {row.checks.map((check) => (
              <li key={check.id} className="flex items-start gap-2">
                {check.passed ? (
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-foreground" />
                ) : (
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                )}
                <span className={cn("min-w-0 flex-1 text-[11px]", check.passed ? "text-foreground" : "text-muted-foreground")}>
                  <span className="block truncate">{check.label}</span>
                  {!check.passed && <span className="block text-[10px]">{check.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {problems.length > 0 && (
          <div className="space-y-1 border border-amber-200 bg-amber-50 p-2 text-amber-900">
            <p className="text-[10px] font-medium uppercase tracking-wider text-amber-700">
              Still to finish
            </p>
            {problems.map((check) => (
              <p key={check.id} className="flex items-start gap-1.5 text-[11px]">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                {check.detail}
              </p>
            ))}
          </div>
        )}

        {coverage.deliveries.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Deliveries
            </p>
            <ul className="space-y-1">
              {[
                ...new Map(
                  coverage.deliveries.map((item) => [item.id, item]),
                ).values(),
              ].map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 border border-border px-2 py-1.5 text-left hover:bg-muted/50"
                    onClick={() => onOpenDelivery(item.id)}
                  >
                    <span className="font-medium">{item.deliveryNumber}</span>
                    <span className="flex items-center gap-2">
                      <StatusBadge
                        variant={statusVariant(DeliveryStatus, item.status as DeliveryStatusValue)}
                        size="sm"
                      >
                        {statusLabel(DeliveryStatus, item.status as DeliveryStatusValue)}
                      </StatusBadge>
                      <span className="tabular-nums text-muted-foreground">{item.quantity}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        {row.canRelease && (
          <Input
            label="Delivery date"
            type="datetime-local"
            value={scheduledDate}
            onChange={(event) => onScheduledDate(event.target.value)}
            className={controlClass}
          />
        )}
        {row.canRelease ? (
          <>
            <Button variant="primary" size="sm" className="w-full" loading={creating} onClick={onCreate}>
              Create delivery · {coverage.remainingQuantity}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onOpenJob(job.id)}>
              Open job
            </Button>
          </>
        ) : statusAction && delivery ? (
          <>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              loading={updatingStatus}
              onClick={() =>
                onAdvanceDelivery(delivery.id, statusAction.nextStatus, statusAction.useScreen)
              }
            >
              {statusAction.label}
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onOpenDelivery(delivery.id)}>
              Open delivery
            </Button>
          </>
        ) : delivery ? (
          <Button variant="primary" size="sm" className="w-full" onClick={() => onOpenDelivery(delivery.id)}>
            Open delivery
          </Button>
        ) : (
          <Button variant="primary" size="sm" className="w-full" onClick={() => onOpenJob(job.id)}>
            Open job
          </Button>
        )}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground">{label}</p>
      <p className="truncate font-medium text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-card p-2">
      <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
      <p className="mt-0.5 text-[12px] font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
