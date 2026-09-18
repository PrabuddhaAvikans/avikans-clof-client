import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
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
import { CreateCategoryModal } from "@/features/products/components/CreateCategoryModal";
import {
  useCategories,
  useDeleteCategory,
  useUpdateCategory,
} from "@/features/products/hooks/useCategories";
import type { Category } from "@/types/category";

export function CategoryListPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data, isLoading, isError, refetch } = useCategories({ page: 1, pageSize: 200 });
  const deleteCategory = useDeleteCategory();
  const updateCategory = useUpdateCategory();

  const columns = useMemo<ColumnDef<Category, unknown>[]>(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "slug", header: "Code" },
      {
        accessorKey: "parentName",
        header: "Parent",
        cell: ({ row }) => row.original.parentName ?? "-",
      },
      {
        accessorKey: "productCount",
        header: "Products",
        cell: ({ row }) => row.original.productCount,
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
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const category = row.original;
          const isActive = category.status === "active";

          return (
            <div className="flex items-center justify-end gap-1">
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Pencil className="h-4 w-4" />}
                aria-label="Toggle category status"
                onClick={() =>
                  void updateCategory.mutateAsync({
                    id: category.id,
                    data: { status: isActive ? "inactive" : "active" },
                  })
                }
              />
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Trash2 className="h-4 w-4" />}
                aria-label="Delete category"
                onClick={() => setDeleteTarget(category)}
              />
            </div>
          );
        },
      },
    ],
    [updateCategory],
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteCategory.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Categories"
        description="Organize products into hierarchical categories."
        breadcrumbs={[
          { label: "Configuration", href: ROUTES.configuration.hub },
          { label: "Categories" },
        ]}
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateModalOpen(true)}>
            Add Category
          </Button>
        }
      />

      <PageContent
        isLoading={isLoading}
        isEmpty={!isLoading && !isError && (data?.items.length ?? 0) === 0}
        error={isError ? "Failed to load categories." : null}
        onRetry={() => void refetch()}
        loadingVariant="table"
        emptyTitle="No categories yet"
        emptyDescription="Create your first product category."
        emptyAction={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateModalOpen(true)}>
            Add Category
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

      <CreateCategoryModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} />

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Delete Category"
        description={
          deleteTarget?.productCount
            ? `"${deleteTarget.name}" has ${deleteTarget.productCount} assigned product(s). Deleting may affect catalog organization. Continue?`
            : deleteTarget
              ? `Are you sure you want to delete "${deleteTarget.name}"?`
              : undefined
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteCategory.isPending}
      />
    </PageContainer>
  );
}
