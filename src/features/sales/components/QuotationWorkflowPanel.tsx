import { useMemo } from "react";
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  Link2,
  Mail,
  Pencil,
  Phone,
  Printer,
  Trash2,
  ArrowRightLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Stepper, type StepItem, type StepStatus } from "@/components/ui/Stepper";
import { cn } from "@/lib/utils";
import type { Quotation } from "@/types/quotation";
import type { QuotationStatusValue } from "@/types/status";

const WORKFLOW_ORDER: QuotationStatusValue[] = [
  "draft",
  "ready_to_send",
  "viewed",
  "accepted",
  "converted",
];

const WORKFLOW_LABELS: Record<string, string> = {
  draft: "Draft",
  ready_to_send: "Submitted",
  viewed: "Under Review",
  accepted: "Approved",
  converted: "Converted to Order",
};

function normalizeStatus(status: QuotationStatusValue): QuotationStatusValue {
  if (status === "sent") return "ready_to_send";
  if (status === "expired") return "rejected";
  return status;
}

function buildWorkflowSteps(status: QuotationStatusValue): StepItem[] {
  const normalized = normalizeStatus(status);

  if (normalized === "rejected") {
    return [
      { id: "draft", label: "Draft", status: "completed" },
      { id: "ready_to_send", label: "Submitted", status: "completed" },
      { id: "viewed", label: "Under Review", status: "completed" },
      { id: "rejected", label: "Rejected", status: "error" },
      { id: "converted", label: "Converted to Order", status: "pending" },
    ];
  }

  const currentIndex = WORKFLOW_ORDER.indexOf(normalized);

  return WORKFLOW_ORDER.map((id, index) => {
    let stepStatus: StepStatus = "pending";
    if (currentIndex > index) stepStatus = "completed";
    else if (currentIndex === index) stepStatus = "current";
    return {
      id,
      label: WORKFLOW_LABELS[id],
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
  onEdit,
  onDelete,
  onSend,
  onDuplicate,
  onConvert,
  onDownloadPdf,
  onOpenContacts,
  isSending,
  isConverting,
  isDeleting,
  className,
}: QuotationWorkflowPanelProps) {
  const steps = useMemo(
    () => (quotation ? buildWorkflowSteps(quotation.status) : []),
    [quotation],
  );

  if (!quotation) {
    return (
      <div
        className={cn(
          "flex h-full items-center justify-center rounded-lg border border-border bg-card p-8 shadow-xs",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">Select a quotation to view workflow.</p>
      </div>
    );
  }

  const canEdit =
    quotation.status === "draft" || quotation.status === "ready_to_send";
  const canDelete =
    quotation.status === "draft" || quotation.status === "ready_to_send";
  const canSend =
    quotation.status === "draft" || quotation.status === "ready_to_send";
  const canConvert =
    quotation.status === "accepted" || quotation.status === "sent";

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xs",
        className,
      )}
    >
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Quotation Workflow</h2>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
        <Stepper steps={steps} orientation="vertical" />

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Quick Actions
          </h3>
          {/* <div className="space-y-1.5">
            {onOpenContacts && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Phone className="h-4 w-4" />}
                onClick={onOpenContacts}
              >
                Calls & Contacts
                {(quotation.contactHistory?.length ?? 0) > 0
                  ? ` (${quotation.contactHistory.length})`
                  : ""}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Pencil className="h-4 w-4" />}
                onClick={onEdit}
              >
                Edit Quotation
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Trash2 className="h-4 w-4" />}
                loading={isDeleting}
                onClick={onDelete}
              >
                Delete Quotation
              </Button>
            )}
            {canSend && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                leftIcon={<Mail className="h-4 w-4" />}
                loading={isSending}
                onClick={onSend}
              >
                Send to Customer
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              leftIcon={<Copy className="h-4 w-4" />}
              onClick={onDuplicate}
            >
              Duplicate
            </Button>
            {canConvert && (
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-start"
                leftIcon={<ArrowRightLeft className="h-4 w-4" />}
                loading={isConverting}
                onClick={onConvert}
              >
                Convert to Order
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              leftIcon={<Download className="h-4 w-4" />}
              onClick={onDownloadPdf}
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              leftIcon={<FileSpreadsheet className="h-4 w-4" />}
              onClick={() => onDownloadPdf?.()}
            >
              Export to Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              leftIcon={<Printer className="h-4 w-4" />}
              onClick={onDownloadPdf}
            >
              Print Quotation
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              leftIcon={<Link2 className="h-4 w-4" />}
              onClick={() => {
                void navigator.clipboard.writeText(window.location.href);
              }}
            >
              Share Link
            </Button>
          </div> */}
        </section>

        {(quotation.status === "accepted" || quotation.status === "converted") && (
          <section className="rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Ready for fulfillment</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {quotation.salesOrderId
                    ? `Linked sales order: ${quotation.salesOrderId}`
                    : "Convert this quotation to create a sales order."}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
