import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { Calendar, Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { IconButton } from "@/components/ui/IconButton";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDeliveries } from "@/features/delivery/hooks/useDeliveries";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";
import { formatDate } from "@/lib/format";
import { deliveryService } from "@/services";
import type { Delivery } from "@/types/delivery";
import {
  DeliveryStatus,
  Priority,
  type DeliveryStatusValue,
  type PriorityValue,
} from "@/types/status";

const STATUS_OPTIONS = Object.keys(DeliveryStatus).map((value) => ({
  value,
  label: DeliveryStatus[value as DeliveryStatusValue].label,
}));

const PRIORITY_OPTIONS = Object.keys(Priority).map((value) => ({
  value,
  label: Priority[value as PriorityValue].label,
}));

export function DeliveryListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Delivery | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, error, refetch } = useDeliveries({
    page: 1,
    pageSize: 100,
    search: search || undefined,
    status: (status as DeliveryStatusValue) || undefined,
    priority: (priority as PriorityValue) || undefined,
  });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deliveryService.delete(deleteTarget.id);
      toast.success(`Delivery ${deleteTarget.deliveryNumber} deleted`);
      setDeleteTarget(null);
      void refetch();
    } catch {
      toast.error("Failed to delete delivery");
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<Delivery>[]>(
    () => [
      {
        id: "deliveryNumber",
        accessorKey: "deliveryNumber",
        header: "Delivery #",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => navigate(ROUTES.deliveries.detail(row.original.id))}
          >
            {row.original.deliveryNumber}
          </button>
        ),
      },
      {
        id: "customer",
        accessorKey: "customerName",
        header: "Customer",
      },
      {
        id: "salesOrder",
        accessorKey: "salesOrderNumber",
        header: "Sales Order",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            variant={statusVariant(DeliveryStatus, row.original.status)}
            dot
            size="sm"
          >
            {statusLabel(DeliveryStatus, row.original.status)}
          </StatusBadge>
        ),
      },
      {
        id: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <StatusBadge variant={statusVariant(Priority, row.original.priority)} size="sm">
            {statusLabel(Priority, row.original.priority)}
          </StatusBadge>
        ),
      },
      {
        id: "scheduledDate",
        header: "Scheduled",
        cell: ({ row }) => formatDate(row.original.scheduledDate),
      },
      {
        id: "driver",
        header: "Driver",
        cell: ({ row }) => row.original.driverName ?? "—",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Eye className="h-4 w-4" />}
              aria-label="View delivery"
              onClick={() => navigate(ROUTES.deliveries.detail(row.original.id))}
            />
            {row.original.status === "planned" && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Trash2 className="h-4 w-4 text-destructive" />}
                aria-label="Delete delivery"
                onClick={() => setDeleteTarget(row.original)}
              />
            )}
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Deliveries"
        description="Track and manage outbound deliveries."
        breadcrumbs={[{ label: "Delivery" }, { label: "List" }]}
        actions={
          <div className="flex gap-2">
            <Link to={ROUTES.deliveries.calendar}>
              <Button variant="outline" leftIcon={<Calendar className="h-4 w-4" />}>
                Calendar
              </Button>
            </Link>
            <Link to={ROUTES.deliveries.new}>
              <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
                Create Delivery
              </Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6">
        <FilterPanel
          onReset={() => {
            setSearch("");
            setStatus("");
            setPriority("");
          }}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search deliveries..."
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
              placeholder="All statuses"
            />
            <Select
              label="Priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              options={PRIORITY_OPTIONS}
              placeholder="All priorities"
            />
          </div>
        </FilterPanel>
      </div>

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load deliveries" : null}
        onRetry={() => void refetch()}
        isEmpty={!isLoading && (data?.items.length ?? 0) === 0}
        emptyTitle="No deliveries"
        loadingVariant="table"
      >
        <DataTable
          data={data?.items ?? []}
          columns={columns}
          pageSize={15}
          getRowId={(row) => row.id}
          forceTable
          density="compact"
        />
      </PageContent>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Delete Delivery"
        description={`Delete ${deleteTarget?.deliveryNumber}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  );
}
