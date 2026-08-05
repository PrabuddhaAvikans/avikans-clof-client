import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Check,
  Copy,
  Eye,
  FileDown,
  Mail,
  Pencil,
  Plus,
  Trash2,
  X,
  ArrowRightLeft,
} from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { RowActions, type RowActionItem } from "@/components/ui/RowActions";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { SendQuotationModal } from "@/features/sales/components/SendQuotationModal";
import {
  useConvertQuotationToSalesOrder,
  useCreateQuotation,
  useDeleteQuotation,
  useQuotations,
  useSendQuotation,
  useUpdateQuotation,
} from "@/features/sales/hooks/useQuotations";
import { formatCurrency, formatDate } from "@/lib/format";
import { Priority, QuotationStatus, type QuotationStatusValue } from "@/types/status";
import type { PriorityValue } from "@/types/status";
import type { Quotation } from "@/types/quotation";

const STATUS_OPTIONS = Object.entries(QuotationStatus).map(([value, def]) => ({
  value,
  label: def.label,
}));

const PRIORITY_OPTIONS = Object.entries(Priority).map(([value, def]) => ({
  value,
  label: def.label,
}));

export function EstimateListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatusValue | "">("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityValue | "">("");
  const [applied, setApplied] = useState({
    search: "",
    status: "" as QuotationStatusValue | "",
    priority: "" as PriorityValue | "",
  });
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [sendTarget, setSendTarget] = useState<Quotation | null>(null);

  const { data, isLoading, error, refetch } = useQuotations({
    page: 1,
    pageSize: 100,
    search: applied.search || undefined,
    status: applied.status || undefined,
    priority: applied.priority || undefined,
  });

  const sendQuotation = useSendQuotation();
  const deleteQuotation = useDeleteQuotation();
  const updateQuotation = useUpdateQuotation();
  const convertToOrder = useConvertQuotationToSalesOrder();
  const createQuotation = useCreateQuotation();

  const handleDuplicate = useCallback(
    async (quotation: Quotation) => {
      await createQuotation.mutateAsync({
        customerId: quotation.customerId,
        lineItems: quotation.lineItems.map((item) => ({
          productId: item.productId,
          productSku: item.productSku,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
        })),
        validUntil: quotation.validUntil,
        priority: quotation.priority,
        notes: quotation.notes,
        termsAndConditions: quotation.termsAndConditions,
        discountAmount: quotation.discountAmount,
      });
      void refetch();
    },
    [createQuotation, refetch],
  );

  const columns = useMemo<ColumnDef<Quotation>[]>(
    () => [
      {
        accessorKey: "quotationNumber",
        header: "Quote No.",
        cell: ({ row }) => (
          <button
            type="button"
            className="font-semibold text-primary hover:underline"
            onClick={() => navigate(ROUTES.quotations.detail(row.original.id))}
          >
            {row.original.quotationNumber}
          </button>
        ),
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <span className="font-medium text-foreground">{row.original.customerName}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <MappedStatusBadge statusMap={QuotationStatus} value={row.original.status} dot />
        ),
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <MappedStatusBadge statusMap={Priority} value={row.original.priority} />
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium text-foreground">
            {formatCurrency(row.original.totalAmount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: "validUntil",
        header: "Valid Until",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{formatDate(row.original.validUntil)}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const q = row.original;
          const actions: RowActionItem[] = [
            {
              id: "view",
              label: "View",
              icon: <Eye className="h-4 w-4" />,
              primary: true,
              onClick: () => navigate(ROUTES.quotations.detail(q.id)),
            },
            {
              id: "duplicate",
              label: "Duplicate",
              icon: <Copy className="h-4 w-4" />,
              primary: true,
              onClick: () => void handleDuplicate(q),
            },
          ];

          if (q.status === "draft") {
            actions.push({
              id: "edit",
              label: "Edit",
              icon: <Pencil className="h-4 w-4" />,
              primary: true,
              onClick: () => navigate(ROUTES.quotations.edit(q.id)),
            });
          }

          if (["draft", "ready_to_send"].includes(q.status)) {
            actions.push({
              id: "send",
              label: "Send",
              icon: <Mail className="h-4 w-4" />,
              primary: q.status !== "draft",
              onClick: () => setSendTarget(q),
            });
          }

          actions.push({
            id: "pdf",
            label: "Download PDF",
            icon: <FileDown className="h-4 w-4" />,
            onClick: () => navigate(ROUTES.quotations.preview(q.id)),
          });

          if (["sent", "viewed"].includes(q.status)) {
            actions.push(
              {
                id: "accept",
                label: "Mark Accepted",
                icon: <Check className="h-4 w-4" />,
                onClick: () =>
                  void updateQuotation.mutateAsync({
                    id: q.id,
                    data: { status: "accepted" },
                  }),
              },
              {
                id: "reject",
                label: "Mark Rejected",
                icon: <X className="h-4 w-4" />,
                danger: true,
                onClick: () =>
                  void updateQuotation.mutateAsync({
                    id: q.id,
                    data: { status: "rejected" },
                  }),
              },
            );
          }

          if (["accepted", "sent"].includes(q.status)) {
            actions.push({
              id: "convert",
              label: "Convert to Sales Order",
              icon: <ArrowRightLeft className="h-4 w-4" />,
              onClick: () =>
                void convertToOrder
                  .mutateAsync(q.id)
                  .then((so) => navigate(ROUTES.salesOrders.detail(so.id))),
            });
          }

          if (q.status === "draft") {
            actions.push({
              id: "delete",
              label: "Delete Draft",
              icon: <Trash2 className="h-4 w-4" />,
              danger: true,
              onClick: () => setDeleteTarget(q),
            });
          }

          return <RowActions actions={actions} maxVisible={3} />;
        },
      },
    ],
    [navigate, convertToOrder, updateQuotation, handleDuplicate],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Quotations"
        description="Create, send, and convert customer quotations through the sales lifecycle."
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.quotations.new)}
          >
            New Quotation
          </Button>
        }
      />

      <div className="space-y-4">
        <FilterPanel
          variant="toolbar"
          onApply={() =>
            setApplied({ search, status: statusFilter, priority: priorityFilter })
          }
          onReset={() => {
            setSearch("");
            setStatusFilter("");
            setPriorityFilter("");
            setApplied({ search: "", status: "", priority: "" });
          }}
        >
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SearchBar
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search quotations..."
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as QuotationStatusValue | "")
              }
              options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS]}
            />
            <Select
              label="Priority"
              value={priorityFilter}
              onChange={(e) =>
                setPriorityFilter(e.target.value as PriorityValue | "")
              }
              options={[{ value: "", label: "All priorities" }, ...PRIORITY_OPTIONS]}
            />
          </div>
        </FilterPanel>

        <PageContent
          isLoading={isLoading}
          error={error ? "Failed to load quotations." : null}
          onRetry={() => void refetch()}
          isEmpty={!isLoading && !error && (data?.items.length ?? 0) === 0}
          emptyTitle="No quotations yet"
          emptyAction={
            <Button onClick={() => navigate(ROUTES.quotations.new)}>
              New Quotation
            </Button>
          }
          loadingVariant="table"
        >
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
            <DataTable
              data={data?.items ?? []}
              columns={columns}
              getRowId={(row) => row.id}
              pageSize={10}
              forceTable
              density="compact"
              className="[&>div]:border-0 [&>div]:shadow-none [&>div]:rounded-none"
            />
          </div>
        </PageContent>
      </div>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() =>
          deleteTarget &&
          void deleteQuotation.mutateAsync(deleteTarget.id).then(() => setDeleteTarget(null))
        }
        title="Delete Draft?"
        description={`Permanently delete draft ${deleteTarget?.quotationNumber}?`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteQuotation.isPending}
      />

      {sendTarget && (
        <SendQuotationModal
          open={Boolean(sendTarget)}
          onClose={() => setSendTarget(null)}
          quotation={sendTarget}
          onSent={() => {
            void sendQuotation.mutateAsync(sendTarget.id);
            setSendTarget(null);
          }}
        />
      )}
    </PageContainer>
  );
}

export const EstimatesPage = EstimateListPage;
