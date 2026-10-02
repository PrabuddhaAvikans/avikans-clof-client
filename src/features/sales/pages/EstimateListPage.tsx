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
import { toast } from "@/components/feedback/toast";
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
import { Textarea } from "@/components/ui/Textarea";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { DuplicateQuotationModal } from "@/features/sales/components/DuplicateQuotationModal";
import { SendQuotationModal } from "@/features/sales/components/SendQuotationModal";
import {
  useConvertQuotationToSalesOrder,
  useDeleteQuotation,
  useQuotations,
  useUpdateQuotation,
} from "@/features/sales/hooks/useQuotations";
import {
  canApproveQuotation,
  canConvertQuotation,
  canDeleteQuotation,
  canEditQuotation,
  canRejectQuotation,
  canSendQuotation,
} from "@/features/sales/lib/quotationLifecycle";
import { formatCurrency, formatDate } from "@/lib/format";
import { QuotationStatus, type QuotationStatusValue } from "@/types/status";
import type { Quotation } from "@/types/quotation";

const STATUS_OPTIONS = Object.entries(QuotationStatus).map(([value, def]) => ({
  value,
  label: def.label,
}));

export function EstimateListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuotationStatusValue | "">("");
  const [applied, setApplied] = useState({
    search: "",
    status: "" as QuotationStatusValue | "",
  });
  const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Quotation | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [sendTarget, setSendTarget] = useState<Quotation | null>(null);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Quotation | null>(null);

  const { data, isLoading, error, refetch } = useQuotations({
    page: 1,
    pageSize: 100,
    search: applied.search || undefined,
    status: applied.status || undefined,
  });

  const deleteQuotation = useDeleteQuotation();
  const updateQuotation = useUpdateQuotation();
  const convertToOrder = useConvertQuotationToSalesOrder();

  const openDuplicateModal = useCallback((quotation: Quotation) => {
    setDuplicateSource(quotation);
    setDuplicateOpen(true);
  }, []);

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
              onClick: () => openDuplicateModal(q),
            },
          ];

          if (canEditQuotation(q.status)) {
            actions.push({
              id: "edit",
              label: "Edit",
              icon: <Pencil className="h-4 w-4" />,
              primary: true,
              onClick: () => navigate(ROUTES.quotations.edit(q.id)),
            });
          }

          if (canSendQuotation(q.status)) {
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

          if (canApproveQuotation(q.status)) {
            actions.push({
              id: "accept",
              label: "Approve",
              icon: <Check className="h-4 w-4" />,
              onClick: () =>
                void updateQuotation.mutateAsync({
                  id: q.id,
                  data: { status: "accepted" },
                }),
            });
          }

          if (canRejectQuotation(q.status)) {
            actions.push({
              id: "reject",
              label: "Reject",
              icon: <X className="h-4 w-4" />,
              danger: true,
              onClick: () => {
                setRejectReason("");
                setRejectTarget(q);
              },
            });
          }

          if (canConvertQuotation(q.status)) {
            actions.push({
              id: "convert",
              label: "Convert to Sales Order",
              icon: <ArrowRightLeft className="h-4 w-4" />,
              onClick: () =>
                void convertToOrder
                  .mutateAsync(q.id)
                  .then((so) => {
                    toast.success(
                      so.quotationNumber
                        ? `Sales order created from ${so.quotationNumber}. BOM estimation sent for costing approval.`
                        : "Sales order created. BOM estimation sent for costing approval.",
                    );
                    navigate(ROUTES.costing.forOrder(so.id));
                  }),
            });
          }

          if (canDeleteQuotation(q.status)) {
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
    [navigate, convertToOrder, updateQuotation, openDuplicateModal],
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
            setApplied({ search, status: statusFilter })
          }
          onReset={() => {
            setSearch("");
            setStatusFilter("");
            setApplied({ search: "", status: "" });
          }}
        >
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
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
        open={Boolean(rejectTarget)}
        onClose={() => {
          setRejectTarget(null);
          setRejectReason("");
        }}
        onConfirm={() => {
          if (!rejectTarget) return;
          const reason = rejectReason.trim();
          if (reason.length < 3) {
            toast.error("Enter a rejection reason (at least 3 characters).");
            return;
          }
          void updateQuotation
            .mutateAsync({
              id: rejectTarget.id,
              data: { status: "rejected", rejectionReason: reason },
            })
            .then(() => {
              toast.success("Quotation rejected");
              setRejectTarget(null);
              setRejectReason("");
              void refetch();
            })
            .catch((err) => {
              toast.error(
                err instanceof Error ? err.message : "Failed to reject quotation",
              );
            });
        }}
        title="Reject quotation?"
        description={`Explain why ${rejectTarget?.quotationNumber ?? "this quotation"} is being rejected.`}
        confirmLabel="Reject"
        variant="danger"
        loading={updateQuotation.isPending}
      >
        <div className="mt-3">
          <Textarea
            label="Rejection reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="e.g. Customer chose a competitor due to lead time"
            rows={3}
            disabled={updateQuotation.isPending}
          />
        </div>
      </ConfirmationDialog>

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
            setSendTarget(null);
            void refetch();
          }}
        />
      )}

      <DuplicateQuotationModal
        open={duplicateOpen}
        quotation={duplicateSource}
        onClose={() => {
          setDuplicateOpen(false);
          setDuplicateSource(null);
        }}
        onCreated={(created) => {
          void refetch();
          navigate(ROUTES.quotations.detail(created.id));
        }}
      />
    </PageContainer>
  );
}

export const EstimatesPage = EstimateListPage;
