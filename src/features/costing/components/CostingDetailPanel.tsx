import { Download, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/app/config/routes";
import { FormikForm } from "@/components/forms/FormikForm";
import { FormikTextarea } from "@/components/forms/FormikTextarea";
import { AttachmentIcon } from "@/components/ui/AttachmentIcon";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { notesSchema } from "@/features/costing/schemas/costingSchema";
import { downloadAttachment, openAttachment } from "@/lib/attachment";
import { formatCurrency, formatDate, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workspacePanelBody, workspacePanelEmpty, workspacePanelShell } from "@/lib/panelLayout";
import type { CostingRequest } from "@/types/costing";
import { CostingRequestStatus, CostingRiskFlag, CoatingStatus } from "@/types/status";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
          <div className="flex flex-wrap gap-1.5">
            <MappedStatusBadge statusMap={CostingRequestStatus} value={request.status} />
            <MappedStatusBadge statusMap={CoatingStatus} value={request.coatingStatus} dot />
          </div>
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
            {request.salesOrderId && request.salesOrderNumber && (
              <div>
                <dt className="text-xs text-muted-foreground">Sales Order</dt>
                <dd className="font-medium">
                  <Link to={ROUTES.salesOrders.detail(request.salesOrderId)} className="text-primary hover:underline">
                    {request.salesOrderNumber}
                  </Link>
                </dd>
              </div>
            )}
            {request.quotationId && request.quotationNumber && (
              <div>
                <dt className="text-xs text-muted-foreground">Quotation</dt>
                <dd className="font-medium">
                  <Link to={ROUTES.quotations.detail(request.quotationId)} className="text-primary hover:underline">
                    {request.quotationNumber}
                  </Link>
                </dd>
              </div>
            )}
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

        {request.coatingItems.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Coating / Finishing
            </h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">Product</th>
                    <th className="px-3 py-2 text-left font-medium">Finish</th>
                    <th className="px-3 py-2 text-left font-medium">Process</th>
                    <th className="px-3 py-2 text-right font-medium">Qty</th>
                    <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {request.coatingItems.map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.finish}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.process}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatCurrency(item.unitCost, request.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

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
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => openAttachment(attachment)}
                    title={`Open ${attachment.name}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-card text-muted-foreground">
                      <AttachmentIcon type={attachment.type} fileName={attachment.name} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="cursor-pointer truncate text-sm font-medium underline-offset-2 hover:underline">
                        {attachment.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.size)} · {attachment.type.toUpperCase()}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={<Download className="h-4 w-4" />}
                      aria-label={`Download ${attachment.name}`}
                      onClick={() => downloadAttachment(attachment)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

         <section>
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
        </section>
      </div>
    </div>
  );
}
