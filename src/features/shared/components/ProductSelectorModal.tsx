import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { useProducts } from "@/features/products/hooks/useProducts";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { SearchBar } from "@/components/ui/SearchBar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/format";
import { getProductScopeLabel, isDefaultCatalogProduct } from "@/lib/productOwner";
import type { Product } from "@/types/product";

export type ProductSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  title?: string;
  customerId?: string;
  customerName?: string;
};

export function ProductSelectorModal({
  open,
  onClose,
  onSelect,
  title = "Select Product",
  customerId,
  customerName,
}: ProductSelectorModalProps) {
  const [search, setSearch] = useState("");
  const filterByCustomer = customerId !== undefined;
  const { data, isLoading, error, refetch } = useProducts({
    page: 1,
    pageSize: 200,
    search: search || undefined,
    status: "active",
    availableForCustomerId: filterByCustomer ? customerId : undefined,
  });

  const items = useMemo(() => {
    const list = data?.items ?? [];
    if (!filterByCustomer || !customerId) return list;
    return [...list].sort((a, b) => {
      const aCustomer = a.customerId === customerId ? 0 : 1;
      const bCustomer = b.customerId === customerId ? 0 : 1;
      return aCustomer - bCustomer;
    });
  }, [data?.items, filterByCustomer, customerId]);

  const scopeHint = filterByCustomer
    ? customerId
      ? `Showing default catalog products and products for ${customerName || "this customer"}.`
      : "Showing default catalog products. Select a customer to also include their products."
    : undefined;

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      { accessorKey: "sku", header: "SKU" },
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              to={ROUTES.products.detail(row.original.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.name}
              <ExternalLink className="h-3 w-3 shrink-0" />
            </Link>
            <p className="text-[11px] text-muted-foreground">{row.original.categoryName}</p>
          </div>
        ),
      },
      {
        id: "scope",
        header: "Scope",
        cell: ({ row }) => {
          const isDefault = isDefaultCatalogProduct(row.original);
          return (
            <StatusBadge variant={isDefault ? "neutral" : "info"} size="sm">
              {getProductScopeLabel(row.original)}
            </StatusBadge>
          );
        },
      },
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
        {scopeHint && <p className="text-xs text-muted-foreground">{scopeHint}</p>}
        <PageContent
          isLoading={isLoading}
          error={error ? "Failed to load products." : null}
          onRetry={() => void refetch()}
          isEmpty={!isLoading && !error && items.length === 0}
          emptyTitle="No products found"
          emptyDescription={
            filterByCustomer
              ? "No default or customer products match this search."
              : undefined
          }
          loadingVariant="table"
        >
          <DataTable
            data={items}
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
