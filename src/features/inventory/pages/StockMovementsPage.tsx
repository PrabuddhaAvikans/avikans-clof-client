import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { FormikForm, DynamicForm } from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Timeline } from "@/components/ui/Timeline";
import { createStockMovementFormFields } from "@/features/inventory/forms/inventoryFormFields";
import {
  stockMovementFormSchema,
  type StockMovementFormValues,
} from "@/features/inventory/schemas/inventorySchema";
import {
  useInventoryItems,
  useRecordStockMovement,
  useStockMovements,
} from "@/features/inventory/hooks/useInventory";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { StockMovement } from "@/types/inventory";
import { StockMovementType } from "@/types/inventory";

const MOVEMENT_TYPE_OPTIONS = [
  { value: StockMovementType.receipt, label: "Stock In" },
  { value: StockMovementType.issue, label: "Stock Out" },
  { value: StockMovementType.adjustment, label: "Adjustment" },
  { value: StockMovementType.reservation, label: "Reservation" },
  { value: StockMovementType.transfer, label: "Transfer" },
  { value: StockMovementType.release, label: "Release Reservation" },
];

const MOVEMENT_LABELS: Record<string, string> = Object.fromEntries(
  MOVEMENT_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

const defaultValues: StockMovementFormValues = {
  inventoryItemId: "",
  type: StockMovementType.receipt,
  quantity: 1,
  notes: "",
};

export function StockMovementsPage() {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [formKey, setFormKey] = useState(0);
  const recordMovement = useRecordStockMovement();

  const { data: items } = useInventoryItems({ page: 1, pageSize: 200 });
  const { data: movements, isLoading, error, refetch } = useStockMovements({
    page: 1,
    pageSize: 100,
    inventoryItemId: selectedItemId || undefined,
  });

  const itemOptions = useMemo(
    () =>
      (items?.items ?? []).map((item) => ({
        value: item.id,
        label: `${item.sku} — ${item.name}`,
      })),
    [items?.items],
  );

  const movementFormFields = useMemo(
    () => createStockMovementFormFields(itemOptions),
    [itemOptions],
  );

  const columns = useMemo<ColumnDef<StockMovement>[]>(
    () => [
      { accessorKey: "inventoryItemSku", header: "SKU" },
      { accessorKey: "inventoryItemName", header: "Item" },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => MOVEMENT_LABELS[row.original.type] ?? row.original.type,
      },
      {
        accessorKey: "quantity",
        header: "Qty",
        cell: ({ row }) => `${formatNumber(row.original.quantity)} ${row.original.unit}`,
      },
      { accessorKey: "performedByName", header: "By" },
      {
        accessorKey: "performedAt",
        header: "Date",
        cell: ({ row }) => formatDateTime(row.original.performedAt),
      },
      { accessorKey: "notes", header: "Notes" },
    ],
    [],
  );

  const timelineItems = (movements?.items ?? []).slice(0, 10).map((m) => ({
    id: m.id,
    title: `${MOVEMENT_LABELS[m.type] ?? m.type}: ${m.inventoryItemName}`,
    description: `${formatNumber(m.quantity)} ${m.unit}${m.notes ? ` — ${m.notes}` : ""}`,
    timestamp: formatDateTime(m.performedAt),
    icon:
      m.type === StockMovementType.receipt ? (
        <ArrowUpCircle className="h-4 w-4 text-success" />
      ) : m.type === StockMovementType.issue ? (
        <ArrowDownCircle className="h-4 w-4 text-destructive" />
      ) : (
        <RefreshCw className="h-4 w-4 text-info" />
      ),
  }));

  const handleSubmit = async (values: StockMovementFormValues) => {
    await recordMovement.mutateAsync({
      inventoryItemId: values.inventoryItemId,
      type: values.type,
      quantity: values.quantity,
      reference: values.notes
        ? { referenceType: "manual", referenceId: "manual", notes: values.notes }
        : undefined,
    });
    setFormKey((key) => key + 1);
    void refetch();
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Stock Movements"
        description="Record stock in/out, adjustments, reservations, and transfers."
        breadcrumbs={[
          { label: "Inventory", href: ROUTES.inventory.list },
          { label: "Movements" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card p-6 lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Record Movement</h2>
          <FormikForm<StockMovementFormValues>
            key={formKey}
            initialValues={defaultValues}
            validationSchema={stockMovementFormSchema}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {(formik) => (
              <>
                <DynamicForm fields={movementFormFields} columns={1} className="border-0 p-0 shadow-none" />
                <Button
                  type="submit"
                  loading={formik.isSubmitting || recordMovement.isPending}
                  className="w-full"
                >
                  Record Movement
                </Button>
              </>
            )}
          </FormikForm>
        </section>

        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-border bg-card p-4">
            <Select
              label="Filter by Item"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              options={[{ value: "", label: "All items" }, ...itemOptions]}
            />
          </section>

          <PageContent
            isLoading={isLoading}
            error={error ? "Failed to load movements." : null}
            onRetry={() => void refetch()}
            loadingVariant="table"
          >
            <DataTable
              data={movements?.items ?? []}
              columns={columns}
              getRowId={(row) => row.id}
              pageSize={10}
              emptyMessage="No stock movements recorded"
            />
          </PageContent>

          {timelineItems.length > 0 && (
            <section className="rounded-lg border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold">Recent Timeline</h2>
              <Timeline events={timelineItems} />
            </section>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
