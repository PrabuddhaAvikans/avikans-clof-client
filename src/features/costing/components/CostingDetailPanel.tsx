import { File, FileSpreadsheet, FileArchive, Paperclip, Save } from "lucide-react";
import { FormikForm } from "@/components/forms/FormikForm";
import { FormikTextarea } from "@/components/forms/FormikTextarea";
import { Button } from "@/components/ui/Button";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { notesSchema } from "@/features/costing/schemas/costingSchema";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workspacePanelBody, workspacePanelEmpty, workspacePanelShell } from "@/lib/panelLayout";
import type { CostingAttachment, CostingRequest } from "@/types/costing";
import { CostingRequestStatus, CostingRiskFlag } from "@/types/status";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentIcon({ type }: { type: CostingAttachment["type"] }) {
  switch (type) {
    case "pdf":
      return <File className="h-4 w-4" />;
    case "xlsx":
      return <FileSpreadsheet className="h-4 w-4" />;
    case "zip":
      return <FileArchive className="h-4 w-4" />;
    default:
      return <Paperclip className="h-4 w-4" />;
  }
}

export type CostingDetailPanelProps = {
  request: CostingRequest | null;
  onSaveNotes?: (notes: string) => void;
  isSavingNotes?: boolean;
  className?: string;
};

export function CostingDetailPanel({
  request,
  onSaveNotes,
  isSavingNotes,
  className,
}: CostingDetailPanelProps) {
  if (!request) {
    return (
      <div className={cn(workspacePanelEmpty, className)}>
        <p className="text-sm text-muted-foreground">
          Select a costing request to view details.
        </p>
      </div>
    );
  }

  const lineTotal = request.lineItems.reduce((sum, item) => sum + item.baseCost, 0);

  return (
    <div className={cn(workspacePanelShell, className)}>
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{request.projectName}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {request.requestNumber} · {request.requestType}
            </p>
          </div>
          <MappedStatusBadge statusMap={CostingRequestStatus} value={request.status} />
        </div>
      </div>

      <div className={workspacePanelBody}>
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Metadata
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Customer</dt>
              <dd className="font-medium">{request.customerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Requested</dt>
              <dd className="font-medium">{formatDate(request.requestedDate)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Payment Terms</dt>
              <dd className="font-medium">{request.paymentTerms}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Proposed Price</dt>
              <dd className="font-medium tabular-nums">
                {formatCurrency(request.proposedPrice, request.currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Margin</dt>
              <dd className="font-medium tabular-nums">
                {formatPercent(request.marginPercent)}{" "}
                <span className="text-xs text-muted-foreground">
                  (target {formatPercent(request.targetMargin)})
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Risk</dt>
              <dd>
                <MappedStatusBadge statusMap={CostingRiskFlag} value={request.riskFlag} dot />
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Cost Breakdown
          </h3>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Description</th>
                  <th className="px-3 py-2 text-left font-medium">Category</th>
                  <th className="px-3 py-2 text-right font-medium">Base Cost</th>
                  <th className="px-3 py-2 text-right font-medium">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {request.lineItems.map((item) => (
                  <tr key={item.id} className="border-t border-border">
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item.category}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatCurrency(item.baseCost, request.currency)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatPercent(item.percentOfCost, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-border bg-muted/30">
                <tr>
                  <td colSpan={2} className="px-3 py-2 font-semibold">
                    Total Estimate
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">
                    {formatCurrency(lineTotal, request.currency)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Attachments
          </h3>
          {request.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {request.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground">
                    <AttachmentIcon type={attachment.type} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)} · {attachment.type.toUpperCase()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

         {/* <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notes
          </h3>
          <FormikForm
            initialValues={{ notes: request.notes }}
            validationSchema={notesSchema}
            enableReinitialize
            onSubmit={async (values, { setSubmitting }) => {
              await onSaveNotes?.(values.notes ?? "");
              setSubmitting(false);
            }}
          >
            {({ isSubmitting, dirty }) => (
              <div className="space-y-3">
                <FormikTextarea
                  name="notes"
                  rows={4}
                  placeholder="Add internal notes about this costing request…"
                />
                {onSaveNotes && (
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={!dirty || isSubmitting || isSavingNotes}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    Save Notes
                  </Button>
                )}
              </div>
            )}
          </FormikForm>
        </section> */}
      </div>
    </div>
  );
}
