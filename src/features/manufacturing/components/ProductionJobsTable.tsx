import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductionJob } from "@/types/production-tracking";
import { ManufacturingJobStatus } from "@/types/status";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="flex min-w-[72px] items-center gap-1.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="w-7 text-right text-[10px] tabular-nums text-muted-foreground">
        {value}%
      </span>
    </div>
  );
}

export type ProductionJobsTableProps = {
  jobs: ProductionJob[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  className?: string;
};

export function ProductionJobsTable({
  jobs,
  selectedId,
  onSelect,
  className,
}: ProductionJobsTableProps) {
  const columns = useMemo<ColumnDef<ProductionJob, unknown>[]>(
    () => [
      {
        accessorKey: "jobNumber",
        header: "Job",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium tabular-nums hover:underline"
            onClick={() => onSelect(row.original.id)}
          >
            {row.original.jobNumber}
          </button>
        ),
      },
      {
        accessorKey: "salesOrderNumber",
        header: "Order",
        cell: ({ getValue }) => (
          <span className="text-muted-foreground">{String(getValue())}</span>
        ),
      },
      {
        accessorKey: "productName",
        header: "Product",
        cell: ({ row }) => (
          <div className="min-w-[110px] max-w-[160px]">
            <p className="truncate font-medium text-foreground">{row.original.productName}</p>
            <p className="truncate text-[10px] text-muted-foreground">{row.original.productSku}</p>
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ getValue }) => <span className="tabular-nums">{String(getValue())}</span>,
      },
      {
        accessorKey: "line",
        header: "Task",
        cell: ({ row }) => row.original.currentTaskName || String(row.original.line),
      },
      {
        accessorKey: "supervisorName",
        header: "Lead",
      },
      {
        accessorKey: "dueDate",
        header: "Due",
        cell: ({ getValue }) => (
          <span className="tabular-nums text-muted-foreground">
            {formatDate(String(getValue()), "dd MMM")}
          </span>
        ),
      },
      {
        accessorKey: "completionPercent",
        header: "%",
        cell: ({ getValue }) => <ProgressBar value={Number(getValue())} />,
      },
      {
        accessorKey: "statusLabel",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge variant={statusVariant(ManufacturingJobStatus, row.original.status)} size="sm">
            {statusLabel(ManufacturingJobStatus, row.original.status)}
          </StatusBadge>
        ),
      },
    ],
    [onSelect],
  );

  return (
    <div className={cn("min-w-0", className)}>
      <DataTable
        data={jobs}
        columns={columns}
        enableRowSelection
        enableColumnVisibility={false}
        forceTable
        density="compact"
        pageSize={6}
        getRowId={(row) => row.id}
        emptyMessage="No jobs match filters."
        className="[&>div]:rounded-none [&>div]:border-0"
      />
    </div>
  );
}
