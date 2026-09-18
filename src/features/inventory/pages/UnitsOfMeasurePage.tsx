import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { Button, ConfirmationDialog, IconButton, StatusBadge } from "@/components/ui";
import { AddUnitOfMeasureModal } from "@/features/inventory/components/AddUnitOfMeasureModal";
import { useUnitsOfMeasure } from "@/hooks/useUnitsOfMeasure";
import {
  formatUnitLabel,
  isDefaultUnit,
  removeCustomUnitOfMeasure,
  type UnitOfMeasure,
} from "@/lib/unitsOfMeasure";

export function UnitsOfMeasurePage() {
  const units = useUnitsOfMeasure();
  const [createOpen, setCreateOpen] = useState(false);
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
        id: "source",
        header: "Type",
        cell: ({ row }) => (
          <StatusBadge
            variant={isDefaultUnit(row.original.code) ? "neutral" : "success"}
            size="sm"
          >
            {isDefaultUnit(row.original.code) ? "Standard" : "Custom"}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          if (isDefaultUnit(row.original.code)) return null;
          return (
            <div className="flex justify-end">
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Trash2 className="h-4 w-4" />}
                aria-label={`Delete ${row.original.code}`}
                onClick={() => setDeleteTarget(row.original)}
              />
            </div>
          );
        },
      },
    ],
    [],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Units of Measure"
        description="Add units that can be selected on inventory items."
        breadcrumbs={[
          { label: "Inventory", href: ROUTES.inventory.list },
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
          getRowId={(row) => row.code}
          forceTable
          density="compact"
        />
      </PageContent>

      <AddUnitOfMeasureModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setCreateOpen(false)}
      />

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          removeCustomUnitOfMeasure(deleteTarget.code);
          setDeleteTarget(null);
        }}
        title="Delete Unit of Measure"
        description={
          deleteTarget
            ? `Remove "${formatUnitLabel(deleteTarget)}" from the custom unit list?`
            : undefined
        }
        confirmLabel="Delete"
        variant="danger"
      />
    </PageContainer>
  );
}
