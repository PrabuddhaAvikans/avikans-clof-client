import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { Button, ConfirmationDialog, IconButton, StatusBadge } from "@/components/ui";
import { UnitOfMeasureFormModal } from "@/features/inventory/components/UnitOfMeasureFormModal";
import { useDeleteUnitOfMeasure } from "@/features/inventory/hooks/useUnitsOfMeasureApi";
import { useUnitsOfMeasure } from "@/hooks/useUnitsOfMeasure";
import {
  formatUnitLabel,
  UNITS_OF_MEASURE_UPDATED_EVENT,
  type UnitOfMeasure,
} from "@/lib/unitsOfMeasure";

export function UnitsOfMeasurePage() {
  const units = useUnitsOfMeasure();
  const deleteUnit = useDeleteUnitOfMeasure();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<UnitOfMeasure | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UnitOfMeasure | null>(null);

  const columns = useMemo<ColumnDef<UnitOfMeasure, unknown>[]>(
    () => [
      { accessorKey: "code", header: "Code" },
      { accessorKey: "name", header: "Name" },
      {
        id: "display",
        header: "Display",
        cell: ({ row }) => formatUnitLabel(row.original),
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
              aria-label={`Edit ${row.original.code}`}
              onClick={() => setEditUnit(row.original)}
            />
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Trash2 className="h-4 w-4" />}
              aria-label={`Delete ${row.original.code}`}
              disabled={units.length <= 1}
              onClick={() => setDeleteTarget(row.original)}
            />
          </div>
        ),
      },
    ],
    [units.length],
  );

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteUnit.mutateAsync(deleteTarget.id);
      window.dispatchEvent(new Event(UNITS_OF_MEASURE_UPDATED_EVENT));
      setDeleteTarget(null);
      toast.success(`Deleted ${deleteTarget.code}.`);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Could not delete unit of measure.");
    }
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Units of Measure"
        description="Configure units that can be selected on inventory items."
        breadcrumbs={[
          { label: "Configuration", href: ROUTES.configuration.hub },
          { label: "Units of Measure" },
        ]}
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Add Unit
          </Button>
        }
      />

      <PageContent
        isEmpty={units.length === 0}
        emptyTitle="No units of measure"
        emptyDescription="Add a unit to use it on inventory items."
        emptyAction={
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Add Unit
          </Button>
        }
        loadingVariant="table"
      >
        <DataTable
          data={units}
          columns={columns}
          pageSize={15}
          getRowId={(row) => row.id || row.code}
          forceTable
          density="compact"
        />
      </PageContent>

      <UnitOfMeasureFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => setCreateOpen(false)}
      />
      <UnitOfMeasureFormModal
        open={Boolean(editUnit)}
        unit={editUnit}
        onClose={() => setEditUnit(null)}
        onSaved={() => setEditUnit(null)}
      />

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          void handleDelete();
        }}
        title="Delete Unit of Measure"
        description={
          deleteTarget
            ? `Deactivate "${formatUnitLabel(deleteTarget)}" so it is no longer available for new items?`
            : undefined
        }
        confirmLabel="Delete"
        variant="danger"
        loading={deleteUnit.isPending}
      />
    </PageContainer>
  );
}
