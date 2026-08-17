import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FileText, Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { workspacePanelBody, workspacePanelEmpty, workspacePanelShell } from "@/lib/panelLayout";
import type { CreditNote } from "@/types/credit-note";
import { CreditNoteStatus } from "@/types/status";
import { DataTable, type ColumnDef } from "@/components/tables/DataTable";
import type { CreditNoteApplication } from "@/types/credit-note";
import { ROUTES } from "@/app/config/routes";

export type CreditNoteDetailPanelProps = {
  creditNote: CreditNote | null;
  onApplyClick: () => void;
  disableApply?: boolean;
  className?: string;
};

function formatInvoiceLine(creditNote: CreditNote) {
  if (!creditNote.invoiceNumber) return "-";
  return creditNote.invoiceNumber;
}

export function CreditNoteDetailPanel({
  creditNote,
  onApplyClick,
  disableApply,
  className,
}: CreditNoteDetailPanelProps) {
  const applications = creditNote?.applications ?? [];

  const applicationColumns = useMemo<ColumnDef<CreditNoteApplication>[]>(() => {
    return [
      { accessorKey: "invoiceNumber", header: "Invoice" },
      {
        accessorKey: "amount",
        header: "Applied Amount",
        cell: ({ row }) => formatCurrency(row.original.amount, creditNote?.currency ?? "LKR"),
      },
      {
        accessorKey: "note",
        header: "Description",
        cell: ({ row }) => (
          <span className="max-w-[16rem] truncate whitespace-normal text-left">
            {row.original.note || "-"}
          </span>
        ),
      },
      {
        accessorKey: "appliedAt",
        header: "Applied At",
        cell: ({ row }) => formatDateTime(row.original.appliedAt),
      },
      { accessorKey: "appliedByName", header: "Applied By" },
    ];
  }, [creditNote?.currency]);

  if (!creditNote) {
    return (
      <div className={cn(workspacePanelEmpty, className)}>
        <p className="text-sm text-muted-foreground">Select a credit note to view details.</p>
      </div>
    );
  }

  const canApply = creditNote.remainingAmount > 0 && !disableApply;

  return (
    <div className={cn(workspacePanelShell, className)}>
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Credit Note</h2>
              <MappedStatusBadge statusMap={CreditNoteStatus} value={creditNote.status} dot />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {creditNote.creditNoteNumber} • Issued {formatDateTime(creditNote.issueDate ?? creditNote.createdAt)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Receipt className="h-4 w-4" />}
             // onClick={onApplyClick}
              disabled={!canApply}
            >
              Apply Credit Note
            </Button>
          </div>
        </div>
      </div>

      <div className={workspacePanelBody}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <section className="rounded-md border border-border bg-card p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Customer
            </h3>
            <p className="text-sm font-medium text-foreground">{creditNote.customerName}</p>
            <p className="mt-1 text-xs text-muted-foreground">{creditNote.customerEmail}</p>
          </section>

          <section className="rounded-md border border-border bg-card p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Related Invoice
            </h3>
            <p className="text-sm font-medium text-foreground">{formatInvoiceLine(creditNote)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Applied:{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(creditNote.appliedAmount, creditNote.currency)}
              </span>
            </p>
          </section>

          <section className="rounded-md border border-border bg-card p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Related Sales Order
            </h3>
            {creditNote.salesOrderId ? (
              <Link
                to={ROUTES.salesOrders.detail(creditNote.salesOrderId)}
                className="text-sm font-medium text-primary hover:underline"
              >
                {creditNote.salesOrderNumber ?? creditNote.salesOrderId}
              </Link>
            ) : (
              <p className="text-sm font-medium text-foreground">-</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Customer: <span className="font-medium text-foreground">{creditNote.customerName}</span>
            </p>
          </section>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <section className="rounded-md border border-border bg-card p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Credit Totals
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums font-medium">{formatCurrency(creditNote.subtotal, creditNote.currency)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Tax Amount</span>
                <span className="tabular-nums font-medium">{formatCurrency(creditNote.taxAmount, creditNote.currency)}</span>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 border-t border-border pt-2">
                <span className="font-semibold text-foreground">Total</span>
                <span className="tabular-nums text-base font-semibold text-foreground">
                  {formatCurrency(creditNote.totalAmount, creditNote.currency)}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-md border border-border bg-card p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Remaining Balance
            </h3>
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {formatCurrency(creditNote.remainingAmount, creditNote.currency)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Reason:{" "}
              <span className="font-medium text-foreground">
                {creditNote.reason.replace(/_/g, " ")}
              </span>
            </p>
          </section>
        </div>

        <section className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Applications
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {applications.length === 0
                  ? "No invoices have this credit note applied to yet."
                  : `${applications.length} application(s) recorded.`}
              </p>
            </div>
            {applications.length > 0 && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span className="text-sm">
                  Total applied:{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(creditNote.appliedAmount, creditNote.currency)}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className="mt-3">
            <DataTable
              data={applications}
              columns={applicationColumns}
              emptyMessage="No applications yet."
              enableColumnVisibility={false}
              forceTable
              density="compact"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

