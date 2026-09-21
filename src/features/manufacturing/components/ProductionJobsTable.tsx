import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Eye, Trash2 } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { RowActions, type RowActionItem } from "@/components/ui/RowActions";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductionJob } from "@/types/production-tracking";
import { ManufacturingJobStatus, Priority } from "@/types/status";

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
  onView?: (job: ProductionJob) => void;
  onDelete?: (job: ProductionJob) => void;
  className?: string;
};

export function ProductionJobsTable({
  jobs,
  selectedId,
  onSelect,
  onView,
  onDelete,
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
        accessorKey: "productName",
        header: "Product",
        cell: ({ row }) => (
          <div className="min-w-[110px] max-w-[160px]">
            <p className="truncate font-medium text-foreground" title={row.original.productName}>{row.original.productName}</p>
            <p className="truncate text-[10px] text-muted-foreground" title={`${row.original.customerName} · ${row.original.productSku}`}>
              {row.original.customerName} · {row.original.productSku}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ getValue }) => <span className="tabular-nums">{String(getValue())}</span>,
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <StatusBadge variant={statusVariant(Priority, row.original.priority)} size="sm">
            {statusLabel(Priority, row.original.priority)}
          </StatusBadge>
        ),
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
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
            {formatDate(row.original.dueDate, "dd MMM")}
            {(row.original.overdueDays ?? 0) > 0 && (
              <AlertTriangle className="h-3 w-3 text-warning" />
            )}
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
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const job = row.original;
          const actions: RowActionItem[] = [];

          if (onView) {
            actions.push({
              id: "view",
              label: "View",
              icon: <Eye className="h-4 w-4" />,
              primary: true,
              onClick: () => onView(job),
            });
          }

          if (onDelete && job.status === "draft") {
            actions.push({
              id: "delete",
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: () => onDelete(job),
            });
          }

          if (actions.length === 0) return null;

          return (
            <div
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <RowActions actions={actions} maxVisible={2} />
            </div>
          );
        },
      },
    ],
    [onDelete, onSelect, onView],
  );

  return (
    <div className={cn("min-w-0", className)}>
      <DataTable
        data={jobs}
        columns={columns}
        enableColumnVisibility={false}
        forceTable
        density="compact"
        pageSize={6}
        getRowId={(row) => row.id}
        emptyMessage="No jobs match filters."
        onRowClick={(job) => onSelect(job.id)}
        getRowClassName={(job) =>
          job.id === selectedId ? "bg-muted/70" : undefined
        }
        className="[&>div]:rounded-none [&>div]:border-0"
      />
    </div>
  );
}
