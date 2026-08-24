import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/tables/DataTable";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InventoryPriceHistoryEntry } from "@/types/inventory";
import { PricingMethodLabels } from "@/types/inventory";

export type InventoryPriceHistoryTableProps = {
  entries: InventoryPriceHistoryEntry[];
  isLoading?: boolean;
};

export function InventoryPriceHistoryTable({
  entries,
  isLoading,
}: InventoryPriceHistoryTableProps) {
  const columns = useMemo<ColumnDef<InventoryPriceHistoryEntry>[]>(
    () => [
      {
        accessorKey: "effectiveDate",
        header: "Effective Date",
        cell: ({ row }) => formatDate(row.original.effectiveDate),
      },
      {
        accessorKey: "costPrice",
        header: "Cost Price",
        cell: ({ row }) => formatCurrency(row.original.costPrice, "LKR"),
      },
      {
        accessorKey: "buyingPrice",
        header: "Buying Price",
        cell: ({ row }) =>
          row.original.buyingPrice != null
            ? formatCurrency(row.original.buyingPrice, "LKR")
            : "-",
      },
      {
        accessorKey: "sellingPrice",
        header: "Selling Price",
        cell: ({ row }) => formatCurrency(row.original.sellingPrice, "LKR"),
      },
      {
        accessorKey: "pricingMethod",
        header: "Method",
        cell: ({ row }) => PricingMethodLabels[row.original.pricingMethod],
      },
      {
        id: "markup",
        header: "Markup",
        cell: ({ row }) => {
          if (row.original.pricingMethod === "percentage_markup") {
            return `${row.original.markupPercent}%`;
          }
          if (row.original.pricingMethod === "fixed_markup") {
            return formatCurrency(row.original.markupFixedAmount, "LKR");
          }
          return "Manual";
        },
      },
      {
        accessorKey: "changedByName",
        header: "Changed By",
      },
      {
        accessorKey: "createdAt",
        header: "Recorded At",
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading price history…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
        No price history recorded yet. Changes to cost or selling price will appear here.
      </div>
    );
  }

  return (
    <DataTable
      data={entries}
      columns={columns}
      getRowId={(row) => row.id}
      pageSize={10}
      forceTable
      density="compact"
    />
  );
}
