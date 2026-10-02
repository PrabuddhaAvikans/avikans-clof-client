import { useMemo } from "react";
import { ArrowRightLeft, Check, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/app/config/routes";
import { Button } from "@/components/ui/Button";
import { Stepper, type StepItem, type StepStatus } from "@/components/ui/Stepper";
import { canConvertQuotation } from "@/features/sales/lib/quotationLifecycle";
import { cn } from "@/lib/utils";
import { workspacePanelBody, workspacePanelEmpty, workspacePanelShell } from "@/lib/panelLayout";
import type { Quotation } from "@/types/quotation";
import type { QuotationStatusValue } from "@/types/status";

const WORKFLOW_ORDER: QuotationStatusValue[] = [
  "draft",
  "ready_to_send",
  "sent",
  "customer_feedback",
  "revised",
  "accepted",
  "converted",
];

const WORKFLOW_LABELS: Record<string, string> = {
  draft: "Draft",
  ready_to_send: "Submitted",
  sent: "Sent",
  customer_feedback: "Customer Feedback",
  revised: "Revised",
  accepted: "Approved",
  converted: "Converted to Order",
  revision_required: "Revision Required",
  viewed: "Customer Feedback",
  rejected: "Rejected",
};

function normalizeStatus(status: QuotationStatusValue): QuotationStatusValue {
  if (status === "viewed" || status === "revision_required") return "customer_feedback";
  return status;
}

function buildWorkflowSteps(status: QuotationStatusValue): StepItem[] {
  if (status === "rejected") {
    return [
      { id: "draft", label: "Draft", status: "completed" },
      { id: "ready_to_send", label: "Submitted", status: "completed" },
      { id: "sent", label: "Sent", status: "completed" },
      { id: "rejected", label: "Rejected", status: "error" },
      { id: "converted", label: "Converted to Order", status: "pending" },
    ];
  }

  const normalized = normalizeStatus(status);
  const currentIndex = WORKFLOW_ORDER.indexOf(normalized);
  const labelOverride =
    status === "revision_required" ? WORKFLOW_LABELS.revision_required : undefined;

  return WORKFLOW_ORDER.map((id, index) => {
    let stepStatus: StepStatus = "pending";
    if (currentIndex > index) stepStatus = "completed";
    else if (currentIndex === index) stepStatus = "current";
    return {
      id,
      label:
        currentIndex === index && labelOverride
          ? labelOverride
          : WORKFLOW_LABELS[id],
      status: stepStatus,
    };
  });
}

export type QuotationWorkflowPanelProps = {
  quotation: Quotation | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onSend?: () => void;
  onDuplicate?: () => void;
  onConvert?: () => void;
  onDownloadPdf?: () => void;
  onOpenContacts?: () => void;
  isSending?: boolean;
  isConverting?: boolean;
  isDeleting?: boolean;
  className?: string;
};

export function QuotationWorkflowPanel({
  quotation,
  onConvert,
  onOpenContacts,
  isConverting,
  className,
}: QuotationWorkflowPanelProps) {
  const steps = useMemo(
    () => (quotation ? buildWorkflowSteps(quotation.status) : []),
    [quotation],
  );

  if (!quotation) {
    return (
      <div className={cn(workspacePanelEmpty, className)}>
        <p className="text-sm text-muted-foreground">Select a quotation to view workflow.</p>
      </div>
    );
  }

  const canConvert = canConvertQuotation(quotation.status);

  return (
    <div className={cn(workspacePanelShell, className)}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Quotation Workflow</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Quotation → Customer Feedback → Revision → Approval → Sales Order
        </p>
      </div>

      <div className={workspacePanelBody}>
        <Stepper steps={steps} orientation="vertical" />

        {quotation.status === "rejected" && quotation.rejectionReason && (
          <section className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
              Rejection reason
            </p>
            <p className="mt-1 text-sm text-foreground">{quotation.rejectionReason}</p>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Next in flow
          </h3>
          <div className="space-y-1.5">
            {onOpenContacts && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                leftIcon={<MessageSquare className="h-4 w-4" />}
                onClick={onOpenContacts}
              >
                Communication Log
              </Button>
            )}
            {canConvert && (
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-start"
                leftIcon={<ArrowRightLeft className="h-4 w-4" />}
                loading={isConverting}
                onClick={onConvert}
              >
                Convert to Sales Order
              </Button>
            )}
            {quotation.salesOrderId && (
              <Link to={ROUTES.salesOrders.detail(quotation.salesOrderId)} className="block">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Open sales order
                </Button>
              </Link>
            )}
            {!canConvert && quotation.status !== "converted" && (
              <p className="text-xs text-muted-foreground">
                Approve this quotation before converting it to a sales order, or revise it
                after customer feedback.
              </p>
            )}
          </div>
        </section>

        {(quotation.status === "accepted" ||
          quotation.status === "revised" ||
          quotation.status === "converted") && (
          <section className="rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {quotation.salesOrderId ? "Continue costing approval" : "Ready to convert"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {quotation.salesOrderId
                    ? "A BOM estimation is generated from the sales order. Costing must be approved before the order can be confirmed."
                    : "Convert this quotation to create a sales order. Estimation with BOM is generated automatically."}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
