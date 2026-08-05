import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useProducts } from "@/features/products/hooks/useProducts";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { SearchBar } from "@/components/ui/SearchBar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types/product";

export type ProductSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  title?: string;
};

export function ProductSelectorModal({
  open,
  onClose,
  onSelect,
  title = "Select Product",
}: ProductSelectorModalProps) {
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch } = useProducts({
    page: 1,
    pageSize: 50,
    search: search || undefined,
    status: "active",
  });

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "name", header: "Product" },
      { accessorKey: "categoryName", header: "Category" },
      {
        accessorKey: "basePrice",
        header: "Price",
        cell: ({ row }) => formatCurrency(row.original.basePrice, row.original.currency),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onSelect(row.original);
              onClose();
            }}
          >
            Add
          </Button>
        ),
      },
    ],
    [onClose, onSelect],
  );

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="space-y-4">
        <SearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
        />
        <PageContent
          isLoading={isLoading}
          error={error ? "Failed to load products." : null}
          onRetry={() => void refetch()}
          isEmpty={!isLoading && !error && (data?.items.length ?? 0) === 0}
          emptyTitle="No products found"
          loadingVariant="table"
        >
          <DataTable
            data={data?.items ?? []}
            columns={columns}
            pageSize={8}
            enableColumnVisibility={false}
            getRowId={(row) => row.id}
          />
        </PageContent>
      </div>
    </Modal>
  );
}
