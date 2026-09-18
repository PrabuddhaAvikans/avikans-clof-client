import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { Button, ConfirmationDialog, IconButton, StatusBadge } from "@/components/ui";
import { WarehouseFormModal } from "@/features/inventory/components/WarehouseFormModal";
import { useWarehouses } from "@/hooks/useWarehouses";
import {
  formatWarehouseLabel,
  removeWarehouse,
  type Warehouse,
} from "@/lib/warehouses";

export function WarehousesPage() {
  const warehouses = useWarehouses();
  const [createOpen, setCreateOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null);

  const columns = useMemo<ColumnDef<Warehouse, unknown>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "address",
        header: "Address",
        cell: ({ row }) => row.original.address || "—",
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
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Pencil className="h-4 w-4" />}
              aria-label={`Edit ${row.original.name}`}
              onClick={() => setEditWarehouse(row.original)}
            />
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Trash2 className="h-4 w-4" />}
              aria-label={`Delete ${row.original.name}`}
              disabled={warehouses.length <= 1}
              onClick={() => setDeleteTarget(row.original)}
            />
          </div>
        ),
      },
    ],
    [warehouses.length],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Warehouse Settings"
        description="Configure warehouses that can be selected on inventory items."
        breadcrumbs={[
          { label: "Configuration", href: ROUTES.configuration.hub },
          { label: "Warehouses" },
        ]}
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Add Warehouse
          </Button>
        }
      />

      <PageContent
        isEmpty={warehouses.length === 0}
        emptyTitle="No warehouses"
        emptyDescription="Add a warehouse to select it on inventory items."
        emptyAction={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Add Warehouse
          </Button>
        }
        loadingVariant="table"
      >
        <DataTable
          data={warehouses}
          columns={columns}
          pageSize={15}
          getRowId={(row) => row.code}
          forceTable
          density="compact"
        />
      </PageContent>

      <WarehouseFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => setCreateOpen(false)}
      />
      <WarehouseFormModal
        open={Boolean(editWarehouse)}
        warehouse={editWarehouse}
        onClose={() => setEditWarehouse(null)}
        onSaved={() => setEditWarehouse(null)}
      />

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          removeWarehouse(deleteTarget.code);
          setDeleteTarget(null);
        }}
        title="Delete Warehouse"
        description={
          deleteTarget
            ? `Remove "${formatWarehouseLabel(deleteTarget)}" from warehouse settings?`
            : undefined
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </PageContainer>
  );
}
