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
import { EntityStatusBadge } from "@/features/shared/components/EntityStatusBadge";
import { useInventoryItems } from "@/features/inventory/hooks/useInventory";
import { formatCurrency, formatNumber } from "@/lib/format";
import { InventoryItemTypeLabels } from "@/types/inventory";
import { StockStatus } from "@/types/status";
import type { InventoryItem } from "@/types/inventory";
import type { StockStatusValue } from "@/types/status";
import type { EntityStatus } from "@/types/common";

const STOCK_STATUS_OPTIONS = Object.entries(StockStatus).map(([value, def]) => ({
  value,
  label: def.label,
}));

export function InventoryListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [stockStatus, setStockStatus] = useState<StockStatusValue | "">("");
  const [status, setStatus] = useState<EntityStatus | "">("");
  const [applied, setApplied] = useState({
    search: "",
    stockStatus: "" as StockStatusValue | "",
    status: "" as EntityStatus | "",
  });

  const { data, isLoading, error, refetch } = useInventoryItems({
    page: 1,
    pageSize: 100,
    search: applied.search || undefined,
    stockStatus: applied.stockStatus || undefined,
    status: applied.status || undefined,
  });

  const columns = useMemo<ColumnDef<InventoryItem>[]>(
    () => [
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "name", header: "Item" },
      {
        accessorKey: "itemType",
        header: "Type",
        cell: ({ row }) => InventoryItemTypeLabels[row.original.itemType],
      },
      { accessorKey: "category", header: "Category" },
      { accessorKey: "warehouse", header: "Warehouse" },
      { accessorKey: "location", header: "Location" },
      {
        accessorKey: "quantityOnHand",
        header: "On Hand",
        cell: ({ row }) => formatNumber(row.original.quantityOnHand),
      },
      {
        accessorKey: "quantityAvailable",
        header: "Available",
        cell: ({ row }) => formatNumber(row.original.quantityAvailable),
      },
      {
        accessorKey: "stockStatus",
        header: "Stock Status",
        cell: ({ row }) => (
          <MappedStatusBadge statusMap={StockStatus} value={row.original.stockStatus} dot />
        ),
      },
      {
        accessorKey: "costPrice",
        header: "Cost Price",
        cell: ({ row }) => formatCurrency(row.original.costPrice, "LKR"),
      },
      {
        accessorKey: "sellingPrice",
        header: "Selling Price",
        cell: ({ row }) => formatCurrency(row.original.sellingPrice, "LKR"),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatusBadge status={row.original.status} />,
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
              onClick={() => navigate(ROUTES.inventory.detail(row.original.id))}
            />
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<Pencil className="h-3.5 w-3.5" />}
              onClick={() => navigate(ROUTES.inventory.edit(row.original.id))}
            />
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Inventory"
        description="View and manage stock items across locations."
        breadcrumbs={[{ label: "Inventory" }]}
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.inventory.new)}
          >
            New Item
          </Button>
        }
      />

      <div className="space-y-4">
        <FilterPanel
          variant="toolbar"
          onApply={() => setApplied({ search, stockStatus, status })}
          onReset={() => {
            setSearch("");
            setStockStatus("");
            setStatus("");
            setApplied({ search: "", stockStatus: "", status: "" });
          }}
        >
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SearchBar
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search inventory..."
            />
            <Select
              label="Stock Status"
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value as StockStatusValue | "")}
              options={[{ value: "", label: "All stock statuses" }, ...STOCK_STATUS_OPTIONS]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EntityStatus | "")}
              options={[
                { value: "", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
        </FilterPanel>

        <PageContent
          isLoading={isLoading}
          error={error ? "Failed to load inventory." : null}
          onRetry={() => void refetch()}
          isEmpty={!isLoading && !error && (data?.items.length ?? 0) === 0}
          emptyTitle="No inventory items"
          emptyAction={
            <Button onClick={() => navigate(ROUTES.inventory.new)}>New Item</Button>
          }
          loadingVariant="table"
        >
          <DataTable
            data={data?.items ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            pageSize={15}
            forceTable
            density="compact"
          />
        </PageContent>
      </div>
    </PageContainer>
  );
}

export const InventoryItemsPage = InventoryListPage;
