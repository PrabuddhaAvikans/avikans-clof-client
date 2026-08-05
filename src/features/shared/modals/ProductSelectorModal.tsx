import { useMemo, useState } from "react";
import { Button, Modal, SearchBar } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useProducts } from "@/features/products/hooks/useProducts";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Product } from "@/types/product";

export type ProductSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  title?: string;
  statusFilter?: "active" | "inactive";
};

export function ProductSelectorModal({
  open,
  onClose,
  onSelect,
  title = "Select Product",
  statusFilter = "active",
}: ProductSelectorModalProps) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useProducts({
    page: 1,
    pageSize: 50,
    search: search || undefined,
    status: statusFilter,
  });

  const products = useMemo(() => data?.items ?? [], [data?.items]);

  const handleSelect = (product: Product) => {
    onSelect(product);
    onClose();
    setSearch("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="space-y-4">
        <SearchBar
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, SKU, or category..."
        />

        <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No products found</p>
          ) : (
            <ul className="divide-y divide-border">
              {products.map((product) => {
                const primaryImage = product.images.find((img) => img.isPrimary) ?? product.images[0];

                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(product)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                        {primaryImage ? (
                          <img
                            src={primaryImage.url}
                            alt={primaryImage.alt ?? product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">{product.name}</p>
                        <p className="truncate text-sm text-muted-foreground">
                          {product.sku} · {product.categoryName}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrency(product.basePrice, product.currency)}
                        </span>
                        <StatusBadge
                          variant={product.status === "active" ? "success" : "neutral"}
                          size="sm"
                        >
                          {product.status}
                        </StatusBadge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(product.updatedAt)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
