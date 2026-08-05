import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import {
  Button,
  ConfirmationDialog,
  IconButton,
  StatusBadge,
} from "@/components/ui";
import { CreateBrandModal } from "@/features/products/components/CreateBrandModal";
import { useBrands, useDeleteBrand } from "@/features/products/hooks/useBrands";
import { formatDate } from "@/lib/format";
import type { Brand } from "@/types/brand";

export function BrandListPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Brand | null>(null);

  const { data, isLoading, isError, refetch } = useBrands({ page: 1, pageSize: 200 });
  const deleteBrand = useDeleteBrand();

  const columns = useMemo<ColumnDef<Brand, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "slug", header: "Code" },
      {
        accessorKey: "countryOfOrigin",
        header: "Country",
        cell: ({ row }) => row.original.countryOfOrigin ?? "—",
      },
      {
        accessorKey: "productCount",
        header: "Products",
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
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Pencil className="h-4 w-4" />}
              aria-label="Edit brand"
              onClick={() => {
                setEditBrand(row.original);
                setModalOpen(true);
              }}
            />
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Trash2 className="h-4 w-4" />}
              aria-label="Delete brand"
              onClick={() => setDeleteTarget(row.original)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteBrand.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditBrand(null);
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Brands"
        description="Manage product brands and manufacturers."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditBrand(null);
              setModalOpen(true);
            }}
          >
            Add Brand
          </Button>
        }
      />

      <PageContent
        isLoading={isLoading}
        isEmpty={!isLoading && !isError && (data?.items.length ?? 0) === 0}
        error={isError ? "Failed to load brands." : null}
        onRetry={() => void refetch()}
        loadingVariant="table"
        emptyTitle="No brands yet"
        emptyDescription="Create your first product brand."
        emptyAction={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setModalOpen(true)}>
            Add Brand
          </Button>
        }
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

      <CreateBrandModal
        open={modalOpen}
        onClose={closeModal}
        editBrand={editBrand}
      />

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Delete Brand"
        description={
          deleteTarget?.productCount
            ? `"${deleteTarget.name}" has ${deleteTarget.productCount} assigned product(s). Continue?`
            : deleteTarget
              ? `Are you sure you want to delete "${deleteTarget.name}"?`
              : undefined
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteBrand.isPending}
      />
    </PageContainer>
  );
}
