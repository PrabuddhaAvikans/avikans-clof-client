import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Copy,
  Download,
  Eye,
  Pencil,
  Plus,
  Power,
  Trash2,
  Upload,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import {
  Button,
  ConfirmationDialog,
  DateRangePicker,
  FilterPanel,
  Input,
  RowActions,
  SearchBar,
  SearchableSelect,
  Select,
  StatusBadge,
  type DateRange,
  type RowActionItem,
} from "@/components/ui";
import { ROUTES } from "@/app/config/routes";
import { useBrands } from "@/features/products/hooks/useBrands";
import { useCategories } from "@/features/products/hooks/useCategories";
import { DuplicateProductModal } from "@/features/products/components/DuplicateProductModal";
import {
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from "@/features/products/hooks/useProducts";
import { formatCurrency, formatDate } from "@/lib/format";
import { getProductScopeLabel, isDefaultCatalogProduct } from "@/lib/productOwner";
import { getCurrentVersion } from "@/lib/productVersion";
import { ProductVersionStatusBadge } from "@/features/products/components/ProductVersionStatusBadge";
import type { Product, ProductTypeValue } from "@/types/product";
import { ProductTypeLabels } from "@/types/product";
import type { EntityStatus } from "@/types/common";
import type { StockStatusValue } from "@/types/status";

type ProductFilters = {
  search: string;
  categoryId: string;
  brandId: string;
  status: string;
  stockStatus: string;
  priceMin: string;
  priceMax: string;
  dateRange: DateRange;
};

const defaultFilters: ProductFilters = {
  search: "",
  categoryId: "",
  brandId: "",
  status: "",
  stockStatus: "",
  priceMin: "",
  priceMax: "",
  dateRange: {},
};

function getMockStock(product: Product): { quantity: number; status: StockStatusValue } {
  const seed = product.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const quantity = (seed % 120) + 5;
  if (quantity <= 10) return { quantity, status: "out_of_stock" };
  if (quantity <= 25) return { quantity, status: "low_stock" };
  return { quantity, status: "in_stock" };
}

const stockBadgeVariant = {
  in_stock: "success",
  low_stock: "warning",
  out_of_stock: "danger",
  reserved: "info",
} as const;

export function ProductListPage() {
  const navigate = useNavigate();
  const [draftFilters, setDraftFilters] = useState<ProductFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ProductFilters>(defaultFilters);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Product | null>(null);

  const apiFilters = {
    page: 1,
    pageSize: 200,
    search: appliedFilters.search || undefined,
    categoryId: appliedFilters.categoryId || undefined,
    brandId: appliedFilters.brandId || undefined,
    status: (appliedFilters.status as EntityStatus) || undefined,
  };

  const { data, isLoading, isError, refetch } = useProducts(apiFilters);
  const { data: categoriesData } = useCategories({ page: 1, pageSize: 200 });
  const { data: brandsData } = useBrands({ page: 1, pageSize: 200 });
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const filteredProducts = useMemo(() => {
    let items = data?.items ?? [];

    if (appliedFilters.stockStatus) {
      items = items.filter(
        (product) => getMockStock(product).status === appliedFilters.stockStatus,
      );
    }

    if (appliedFilters.priceMin) {
      const min = Number(appliedFilters.priceMin);
      if (!Number.isNaN(min)) {
        items = items.filter((product) => product.basePrice >= min);
      }
    }

    if (appliedFilters.priceMax) {
      const max = Number(appliedFilters.priceMax);
      if (!Number.isNaN(max)) {
        items = items.filter((product) => product.basePrice <= max);
      }
    }

    if (appliedFilters.dateRange.from) {
      const from = new Date(appliedFilters.dateRange.from).getTime();
      items = items.filter((product) => new Date(product.updatedAt).getTime() >= from);
    }

    if (appliedFilters.dateRange.to) {
      const to = new Date(appliedFilters.dateRange.to).getTime();
      items = items.filter((product) => new Date(product.updatedAt).getTime() <= to);
    }

    return items;
  }, [data?.items, appliedFilters]);

  const openDuplicateModal = (product: Product) => {
    setDuplicateSource(product);
    setDuplicateOpen(true);
  };

  const columns = useMemo<ColumnDef<Product, unknown>[]>(
    () => [
      {
        id: "image",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const image =
            row.original.images.find((img) => img.isPrimary) ?? row.original.images[0];
          return (
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
              {image ? (
                <img
                  src={image.url}
                  alt={image.alt ?? row.original.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div>
            <Link
              to={ROUTES.products.detail(row.original.id)}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {row.original.name}
            </Link>
            <p className="text-xs text-muted-foreground">{row.original.brandName}</p>
          </div>
        ),
      },
      { accessorKey: "sku", header: "SKU" },
      { accessorKey: "categoryName", header: "Category" },
      {
        id: "scope",
        header: "Customer",
        cell: ({ row }) => (
          <StatusBadge
            variant={isDefaultCatalogProduct(row.original) ? "neutral" : "info"}
            size="sm"
          >
            {getProductScopeLabel(row.original)}
          </StatusBadge>
        ),
      },
      {
        id: "productType",
        header: "Type",
        cell: ({ row }) => ProductTypeLabels[row.original.productType],
      },
      {
        id: "version",
        header: "Version",
        cell: ({ row }) => {
          const version = getCurrentVersion(row.original);
          return (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{version.label}</span>
              <ProductVersionStatusBadge status={version.status} dot />
            </div>
          );
        },
      },
      {
        accessorKey: "basePrice",
        header: "Base Price",
        cell: ({ row }) => formatCurrency(row.original.basePrice, row.original.currency),
      },
      {
        accessorKey: "costPrice",
        header: "Est. Cost",
        cell: ({ row }) => formatCurrency(row.original.costPrice, row.original.currency),
      },
      {
        id: "stock",
        header: "Stock",
        cell: ({ row }) => {
          const stock = getMockStock(row.original);
          return (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-foreground">{stock.quantity}</span>
              <StatusBadge variant={stockBadgeVariant[stock.status]} size="sm">
                {stock.status.replace(/_/g, " ")}
              </StatusBadge>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            variant={row.original.status === "active" ? "success" : "neutral"}
            size="sm"
            dot
          >
            {row.original.status}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const product = row.original;
          const isActive = product.status === "active";

          const actions: RowActionItem[] = [
            {
              id: "view",
              label: "View",
              icon: <Eye className="h-4 w-4" />,
              primary: true,
              onClick: () => navigate(ROUTES.products.detail(product.id)),
            },
            {
              id: "edit",
              label: "Edit",
              icon: <Pencil className="h-4 w-4" />,
              primary: true,
              onClick: () => navigate(ROUTES.products.edit(product.id)),
            },
            {
              id: "duplicate",
              label: "Duplicate",
              icon: <Copy className="h-4 w-4" />,
              primary: true,
              onClick: () => openDuplicateModal(product),
            },
            {
              id: "toggle-status",
              label: isActive ? "Deactivate" : "Activate",
              icon: <Power className="h-4 w-4" />,
              onClick: () =>
                void updateProduct.mutateAsync({
                  id: product.id,
                  data: { status: isActive ? "inactive" : "active" },
                }),
            },
            {
              id: "delete",
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: () => setDeleteTarget(product),
            },
          ];

          return <RowActions actions={actions} maxVisible={3} />;
        },
      },
    ],
    [navigate, updateProduct],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteProduct.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const categoryOptions = [
    { value: "", label: "All categories" },
    ...(categoriesData?.items ?? []).map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];

  const brandOptions = [
    { value: "", label: "All brands" },
    ...(brandsData?.items ?? []).map((brand) => ({
      value: brand.id,
      label: brand.name,
    })),
  ];

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Products"
        description="Browse and manage the product catalog."
        actions={
          <>
            <Button variant="outline" leftIcon={<Upload className="h-4 w-4" />}>
              Import
            </Button>
            <Link to={ROUTES.products.new}>
              <Button leftIcon={<Plus className="h-4 w-4" />}>Add Product</Button>
            </Link>
          </>
        }
      />

      <div className="mb-4">
        <SearchBar
          value={draftFilters.search}
          onChange={(event) =>
            setDraftFilters((prev) => ({ ...prev, search: event.target.value }))
          }
          placeholder="Search products by name, SKU, category..."
          className="max-w-md"
        />
      </div>

      <FilterPanel
        className="mb-6"
        onApply={() => setAppliedFilters({ ...draftFilters, search: draftFilters.search })}
        onReset={() => {
          setDraftFilters(defaultFilters);
          setAppliedFilters(defaultFilters);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <SearchableSelect
            label="Category"
            value={draftFilters.categoryId}
            onChange={(value) => setDraftFilters((prev) => ({ ...prev, categoryId: value }))}
            options={categoryOptions}
            clearable
          />
          <SearchableSelect
            label="Brand"
            value={draftFilters.brandId}
            onChange={(value) => setDraftFilters((prev) => ({ ...prev, brandId: value }))}
            options={brandOptions}
            clearable
          />
          <Select
            label="Status"
            value={draftFilters.status}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, status: event.target.value }))
            }
            options={[
              { value: "", label: "All statuses" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <Select
            label="Stock Status"
            value={draftFilters.stockStatus}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, stockStatus: event.target.value }))
            }
            options={[
              { value: "", label: "All stock levels" },
              { value: "in_stock", label: "In Stock" },
              { value: "low_stock", label: "Low Stock" },
              { value: "out_of_stock", label: "Out of Stock" },
            ]}
          />
          <Input
            label="Min Price"
            type="number"
            min={0}
            value={draftFilters.priceMin}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, priceMin: event.target.value }))
            }
          />
          <Input
            label="Max Price"
            type="number"
            min={0}
            value={draftFilters.priceMax}
            onChange={(event) =>
              setDraftFilters((prev) => ({ ...prev, priceMax: event.target.value }))
            }
          />
          <DateRangePicker
            label="Updated Date Range"
            value={draftFilters.dateRange}
            onChange={(dateRange) =>
              setDraftFilters((prev) => ({ ...prev, dateRange: dateRange }))
            }
            className="sm:col-span-2"
          />
        </div>
      </FilterPanel>

      <PageContent
        isLoading={isLoading}
        isEmpty={!isLoading && !isError && filteredProducts.length === 0}
        error={isError ? "Failed to load products." : null}
        onRetry={() => void refetch()}
        loadingVariant="table"
        emptyTitle="No products found"
        emptyDescription="Try adjusting your filters or add a new product."
        emptyAction={
          <Link to={ROUTES.products.new}>
            <Button leftIcon={<Plus className="h-4 w-4" />}>Add Product</Button>
          </Link>
        }
      >
        <DataTable
          data={filteredProducts}
          columns={columns}
          pageSize={15}
          getRowId={(row) => row.id}
          emptyMessage="No products match your filters"
          forceTable
          density="compact"
        />
      </PageContent>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Delete Product"
        description={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.name}"? This will deactivate the product.`
            : undefined
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteProduct.isPending}
      />

      <DuplicateProductModal
        open={duplicateOpen}
        product={duplicateSource}
        onClose={() => {
          setDuplicateOpen(false);
          setDuplicateSource(null);
        }}
        onCreated={(created) => {
          void refetch();
          navigate(ROUTES.products.edit(created.id));
        }}
      />
    </PageContainer>
  );
}
