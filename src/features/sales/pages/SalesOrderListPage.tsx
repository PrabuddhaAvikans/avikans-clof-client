import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil, Plus } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { useSalesOrders } from "@/features/sales/hooks/useSalesOrders";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  PaymentStatus,
  Priority,
  SalesOrderStatus,
  type SalesOrderStatusValue,
} from "@/types/status";
import type { PriorityValue } from "@/types/status";
import type { SalesOrder } from "@/types/sales-order";

const STATUS_OPTIONS = Object.entries(SalesOrderStatus).map(([value, def]) => ({
  value,
  label: def.label,
}));

const PRIORITY_OPTIONS = Object.entries(Priority).map(([value, def]) => ({
  value,
  label: def.label,
}));

export function SalesOrderListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SalesOrderStatusValue | "">("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityValue | "">("");
  const [applied, setApplied] = useState({
    search: "",
    status: "" as SalesOrderStatusValue | "",
    priority: "" as PriorityValue | "",
  });

  const { data, isLoading, error, refetch } = useSalesOrders({
    page: 1,
    pageSize: 100,
    search: applied.search || undefined,
    status: applied.status || undefined,
    priority: applied.priority || undefined,
  });

  const columns = useMemo<ColumnDef<SalesOrder>[]>(
    () => [
      { accessorKey: "orderNumber", header: "Order #" },
      { accessorKey: "customerName", header: "Customer" },
      {
        accessorKey: "status",
        header: "Overall Status",
        cell: ({ row }) => (
          <MappedStatusBadge statusMap={SalesOrderStatus} value={row.original.status} dot />
        ),
      },
      {
        id: "manufacturing",
        header: "Manufacturing",
        cell: ({ row }) => {
          const inMfg = row.original.lineItems.some((li) => li.quantityInManufacturing > 0);
          return inMfg ? "In Progress" : row.original.manufacturingJobIds.length > 0 ? "Scheduled" : "-";
        },
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment",
        cell: ({ row }) => (
          <MappedStatusBadge statusMap={PaymentStatus} value={row.original.paymentStatus} />
        ),
      },
      {
        id: "delivery",
        header: "Delivery",
        cell: ({ row }) =>
          row.original.deliveryIds.length > 0
            ? `${row.original.deliveryIds.length} scheduled`
            : "Pending",
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <MappedStatusBadge statusMap={Priority} value={row.original.priority} />
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.totalAmount, row.original.currency),
      },
      {
        accessorKey: "requestedDeliveryDate",
        header: "Delivery Date",
        cell: ({ row }) =>
          row.original.requestedDeliveryDate
            ? formatDate(row.original.requestedDeliveryDate)
            : "-",
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Eye className="h-3.5 w-3.5" />}
              onClick={() => navigate(ROUTES.salesOrders.detail(row.original.id))}
            />
            {["draft", "pending_review"].includes(row.original.status) && (
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => navigate(ROUTES.salesOrders.edit(row.original.id))}
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
        title="Sales Orders"
        description="Track confirmed sales orders through manufacturing and delivery."
        breadcrumbs={[{ label: "Sales Orders" }]}
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate(ROUTES.salesOrders.new)}>
            New Sales Order
          </Button>
        }
      />

      <div className="space-y-4">
        <FilterPanel
          variant="toolbar"
          onApply={() => setApplied({ search, status: statusFilter, priority: priorityFilter })}
          onReset={() => {
            setSearch("");
            setStatusFilter("");
            setPriorityFilter("");
            setApplied({ search: "", status: "", priority: "" });
          }}
        >
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SearchBar
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search orders..."
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SalesOrderStatusValue | "")}
              options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS]}
            />
            <Select
              label="Priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as PriorityValue | "")}
              options={[{ value: "", label: "All priorities" }, ...PRIORITY_OPTIONS]}
            />
          </div>
        </FilterPanel>

        <PageContent
          isLoading={isLoading}
          error={error ? "Failed to load sales orders." : null}
          onRetry={() => void refetch()}
          isEmpty={!isLoading && !error && (data?.items.length ?? 0) === 0}
          emptyTitle="No sales orders"
          emptyAction={<Button onClick={() => navigate(ROUTES.salesOrders.new)}>New Sales Order</Button>}
          loadingVariant="table"
        >
          <DataTable data={data?.items ?? []} columns={columns} getRowId={(row) => row.id} pageSize={15} forceTable density="compact" />
        </PageContent>
      </div>
    </PageContainer>
  );
}
