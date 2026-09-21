import { useMemo, useState } from "react";
import type { ColumnDef, Row } from "@tanstack/react-table";
import { Eye, Plus } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RecordStockMovementModal } from "@/features/inventory/components/RecordStockMovementModal";
import { StockMovementHistoryDrawer } from "@/features/inventory/components/StockMovementHistoryDrawer";
import { useInventoryItems, useStockMovements } from "@/features/inventory/hooks/useInventory";
import {
  STOCK_MOVEMENT_TYPE_CHIPS,
  movementReason,
  signedMovementQuantity,
  stockMovementBadgeVariant,
  stockMovementImpact,
  stockMovementLabel,
} from "@/features/inventory/lib/stockMovements";
import { useDebounce } from "@/hooks/useDebounce";
import { cn } from "@/lib/utils";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { StockMovement, StockMovementTypeValue } from "@/types/inventory";

export function StockMovementsPage() {
  const [recordOpen, setRecordOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [search, setSearch] = useState("");
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<StockMovementTypeValue | "">("");
  const debouncedSearch = useDebounce(search, 250);

  const { data: items } = useInventoryItems({ page: 1, pageSize: 200 });
  const { data: movements, isLoading, error, refetch } = useStockMovements({
    page: 1,
    pageSize: 200,
    search: debouncedSearch.trim() || undefined,
    inventoryItemId: itemId || undefined,
  });

  const itemOptions = useMemo(
    () =>
      (items?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.sku} - ${item.name}`,
      })),
    [items?.items],
  );

  const selectedItem = useMemo(
    () =>
      (items?.items ?? []).find(
        (item) => item.id === (selectedMovement?.inventoryItemId ?? itemId),
      ),
    [itemId, items?.items, selectedMovement?.inventoryItemId],
  );

  const allRows = movements?.items ?? [];

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { "": allRows.length };
    for (const row of allRows) {
      counts[row.type] = (counts[row.type] ?? 0) + 1;
    }
    return counts;
  }, [allRows]);

  const visibleRows = useMemo(
    () => (type ? allRows.filter((row) => row.type === type) : allRows),
    [allRows, type],
  );

  const openHistory = (movement: StockMovement) => {
    setSelectedMovement(movement);
  };

  const columns = useMemo<ColumnDef<StockMovement>[]>(
    () => [
      {
        accessorKey: "performedAt",
        header: "When",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {formatDateTime(row.original.performedAt)}
          </span>
        ),
      },
      {
        id: "item",
        header: "Item",
        cell: ({ row }) => (
          <div className="min-w-[10rem]">
            <span className="block text-sm font-medium text-foreground">
              {row.original.inventoryItemName}
            </span>
            <span className="block font-mono text-[11px] text-muted-foreground">
              {row.original.inventoryItemSku}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <StatusBadge variant={stockMovementBadgeVariant(row.original.type)} dot>
            {stockMovementLabel(row.original.type)}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ row }) => {
          const signed = signedMovementQuantity(row.original);
          return (
            <span className={`font-medium tabular-nums ${signed.className}`}>
              {signed.prefix}
              {formatNumber(Math.abs(row.original.quantity))} {row.original.unit}
            </span>
          );
        },
      },
      {
        id: "impact",
        header: "Effect",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{stockMovementImpact(row.original)}</span>
        ),
      },
      {
        id: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <span className="max-w-[18rem] truncate" title={movementReason(row.original)}>
            {movementReason(row.original)}
          </span>
        ),
      },
      {
        accessorKey: "performedByName",
        header: "By",
      },
      {
        id: "view",
        header: "",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="ghost"
            leftIcon={<Eye className="h-3.5 w-3.5" />}
            onClick={(event) => {
              event.stopPropagation();
              openHistory(row.original);
            }}
          >
            View
          </Button>
        ),
      },
    ],
    [],
  );

  const renderMobileCard = (row: Row<StockMovement>) => {
    const movement = row.original;
    const signed = signedMovementQuantity(movement);
    return (
      <div className="w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={movement.inventoryItemName}>{movement.inventoryItemName}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{movement.inventoryItemSku}</p>
          </div>
          <span className={`shrink-0 text-sm font-semibold tabular-nums ${signed.className}`}>
            {signed.prefix}
            {formatNumber(Math.abs(movement.quantity))} {movement.unit}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <StatusBadge variant={stockMovementBadgeVariant(movement.type)} dot>
            {stockMovementLabel(movement.type)}
          </StatusBadge>
          <span className="text-[11px] text-muted-foreground">
            {formatDateTime(movement.performedAt)}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{movementReason(movement)}</p>
        <p className="mt-2 text-xs font-medium text-foreground">View history</p>
      </div>
    );
  };

  return (
    <PageContainer>
      <PageHeader
        title="Stock Movements"
        description="Click a row or View to see that item's history."
        breadcrumbs={[
          { label: "Inventory", href: ROUTES.inventory.list },
          { label: "Movements" },
        ]}
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setRecordOpen(true)}>
            Record
          </Button>
        }
      />

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchBar
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search SKU, item, or reason"
            containerClassName="min-w-0 flex-1"
          />
          <SearchableSelect
            value={itemId}
            onChange={setItemId}
            options={itemOptions}
            placeholder="All items"
            searchPlaceholder="Find item..."
            clearable
            className="w-full sm:w-[22rem]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STOCK_MOVEMENT_TYPE_CHIPS.map((chip) => {
            const selected = type === chip.value;
            const count = typeCounts[chip.value] ?? 0;
            if (chip.value && count === 0 && !selected) return null;
            return (
              <button
                key={chip.value || "all"}
                type="button"
                onClick={() => setType(chip.value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-foreground hover:bg-muted",
                )}
              >
                {chip.label}
                <span className={cn("tabular-nums", selected ? "opacity-80" : "text-muted-foreground")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <PageContent
          isLoading={isLoading}
          error={error ? "Failed to load stock movements." : null}
          onRetry={() => void refetch()}
          isEmpty={!isLoading && !error && visibleRows.length === 0}
          emptyTitle="No movements to show"
          emptyDescription={
            itemId || type || search
              ? "Try another type, item, or search."
              : "Record a movement when stock is received, issued, or corrected."
          }
          emptyAction={
            itemId || type || search ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setItemId("");
                  setType("");
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button onClick={() => setRecordOpen(true)}>Record</Button>
            )
          }
          loadingVariant="table"
        >
          <DataTable
            data={visibleRows}
            columns={columns}
            getRowId={(row) => row.id}
            pageSize={20}
            density="compact"
            enableColumnVisibility={false}
            renderMobileCard={renderMobileCard}
            emptyMessage="No stock movements recorded"
            onRowClick={openHistory}
            getRowClassName={(row) =>
              row.id === selectedMovement?.id ? "bg-muted/70" : undefined
            }
          />
        </PageContent>
      </div>

      <StockMovementHistoryDrawer
        open={Boolean(selectedMovement)}
        onClose={() => setSelectedMovement(null)}
        movement={selectedMovement}
        item={selectedItem}
        onRecord={() => setRecordOpen(true)}
      />

      <RecordStockMovementModal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        items={items?.items ?? []}
        initialItemId={selectedMovement?.inventoryItemId || itemId}
        onRecorded={() => void refetch()}
      />
    </PageContainer>
  );
}
