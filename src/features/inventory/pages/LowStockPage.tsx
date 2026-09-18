import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Pencil } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { useLowStockItems } from "@/features/inventory/hooks/useInventory";
import { formatNumber } from "@/lib/format";
import { StockStatus } from "@/types/status";
import type { InventoryItem } from "@/types/inventory";

export function LowStockPage() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useLowStockItems();

  const columns = useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "name", header: "Item" },
      { accessorKey: "location", header: "Location" },
      {
        accessorKey: "quantityAvailable",
        header: "Available",
        cell: ({ row }) => formatNumber(row.original.quantityAvailable),
      },
      {
        accessorKey: "reorderLevel",
        header: "Reorder Level",
        cell: ({ row }) => formatNumber(row.original.reorderLevel),
      },
      {
        accessorKey: "reorderQuantity",
        header: "Reorder Qty",
        cell: ({ row }) => formatNumber(row.original.reorderQuantity),
      },
      {
        accessorKey: "stockStatus",
        header: "Status",
        cell: ({ row }) => (
          <MappedStatusBadge statusMap={StockStatus} value={row.original.stockStatus} dot />
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            leftIcon={<Pencil className="h-3.5 w-3.5" />}
            onClick={() => navigate(ROUTES.inventory.edit(row.original.id))}
          >
            Restock
          </Button>
        ),
      },
    ],
    [navigate],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Low Stock Items"
        description="Items at or below reorder thresholds."
        breadcrumbs={[
          { label: "Inventory", href: ROUTES.inventory.list },
          { label: "Low Stock" },
        ]}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Low Stock Items"
          value={data?.length ?? 0}
          icon={<AlertTriangle className="h-5 w-5 text-warning" />}
          description="Require attention"
        />
      </div>

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load low stock items." : null}
        onRetry={() => void refetch()}
        isEmpty={!isLoading && !error && (data?.length ?? 0) === 0}
        emptyTitle="All stock levels healthy"
        emptyDescription="No items are currently below reorder levels."
        loadingVariant="table"
      >
        <DataTable
          data={data ?? []}
          columns={columns}
          getRowId={(row) => row.id}
          pageSize={15}
        />
      </PageContent>
    </PageContainer>
  );
}

export function StockOverviewPage() {
  return <LowStockPage />;
}

