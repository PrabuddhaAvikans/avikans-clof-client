import { useMemo, useState } from "react";
import {
  Check,
  Mail,
  MessageSquarePlus,
  RotateCcw,
  X,
} from "lucide-react";
import { FormikForm } from "@/components/forms/FormikForm";
import { FormikTextarea } from "@/components/forms/FormikTextarea";
import { Button } from "@/components/ui/Button";
import { Stepper, type StepItem, type StepStatus } from "@/components/ui/Stepper";
import { Timeline, type TimelineEvent } from "@/components/ui/Timeline";
import { commentSchema } from "@/features/costing/schemas/costingSchema";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workspacePanelBody, workspacePanelEmpty, workspacePanelShell } from "@/lib/panelLayout";
import type { ApprovalLevel, CostingRequest } from "@/types/costing";

function mapApprovalStatus(status: ApprovalLevel["status"]): StepStatus {
  switch (status) {
    case "approved":
      return "completed";
    case "rejected":
      return "error";
    case "pending":
      return "current";
    default:
      return "pending";
  }
}

function mapHistoryStatus(action: string): TimelineEvent["status"] {
  if (action.toLowerCase().includes("approved")) return "success";
  if (action.toLowerCase().includes("reject")) return "danger";
  if (action.toLowerCase().includes("change")) return "warning";
  if (action.toLowerCase().includes("comment")) return "info";
  return "default";
}

export type ApprovalWorkflowPanelProps = {
  request: CostingRequest | null;
  onApprove?: (comment?: string) => void;
  onReject?: (comment: string) => void;
  onRequestChanges?: (comment: string) => void;
  onAddComment?: (comment: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
  isRequestingChanges?: boolean;
  isAddingComment?: boolean;
  className?: string;
};

export function ApprovalWorkflowPanel({
  request,
  onApprove,
  onReject,
  onRequestChanges,
  onAddComment,
  isApproving,
  isRejecting,
  isRequestingChanges,
  isAddingComment,
  className,
}: ApprovalWorkflowPanelProps) {
  const [decisionComment, setDecisionComment] = useState("");

  const steps = useMemo<StepItem[]>(() => {
    if (!request) return [];
    return request.approvalLevels.map((level) => ({
      id: level.id,
      label: level.role,
      description: `${level.assigneeName} · ${level.status.replace("_", " ")}`,
      status: mapApprovalStatus(level.status),
    }));
  }, [request]);

  const timelineEvents = useMemo<TimelineEvent[]>(() => {
    if (!request) return [];
    return request.history.map((entry) => ({
      id: entry.id,
      title: entry.action,
      description: entry.comment
        ? `${entry.userName} - ${entry.comment}`
        : entry.userName,
      timestamp: formatDateTime(entry.timestamp),
      status: mapHistoryStatus(entry.action),
    }));
  }, [request]);

  const canDecide =
    request &&
    (request.status === "pending" ||
      request.status === "in_review" ||
      request.status === "changes_requested");

  const handleReject = () => {
    const comment = decisionComment.trim();
    if (comment.length < 3) return;
    onReject?.(comment);
    setDecisionComment("");
  };

  const handleRequestChanges = () => {
    const comment = decisionComment.trim();
    if (comment.length < 3) return;
    onRequestChanges?.(comment);
    setDecisionComment("");
  };

  const handleApprove = () => {
    const comment = decisionComment.trim();
    onApprove?.(comment || undefined);
    setDecisionComment("");
  };

  if (!request) {
    return (
      <div className={cn(workspacePanelEmpty, className)}>
        <p className="text-sm text-muted-foreground">
          Approval workflow will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className={cn(workspacePanelShell, className)}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Approval Workflow</h2>
      </div>

      <div className={workspacePanelBody}>
        <section className="rounded-md border border-border bg-muted/20 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Requester
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {request.requester.avatarInitials}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-foreground">{request.requester.name}</p>
              <p className="text-xs text-muted-foreground">{request.requester.title}</p>
              <a
                href={`mailto:${request.requester.email}`}
                className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Mail className="h-3 w-3" />
                {request.requester.email}
              </a>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Approval Levels
          </h3>
          <Stepper steps={steps} orientation="vertical" />
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Add Comment
          </h3>
          <FormikForm
            initialValues={{ comment: "" }}
            validationSchema={commentSchema}
            onSubmit={async (values, { resetForm, setSubmitting }) => {
              await onAddComment?.(values.comment);
              resetForm();
              setSubmitting(false);
            }}
          >
            {({ isSubmitting }) => (
              <div className="space-y-2">
                <FormikTextarea
                  name="comment"
                  rows={3}
                  placeholder="Add a comment to the approval thread…"
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  loading={isSubmitting || isAddingComment}
                  leftIcon={<MessageSquarePlus className="h-4 w-4" />}
                  disabled={!onAddComment}
                >
                  Post Comment
                </Button>
              </div>
            )}
          </FormikForm>
        </section>

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Approval History
          </h3>
          {timelineEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history yet.</p>
          ) : (
            <Timeline events={timelineEvents} />
          )}
        </section>
      </div>

      {canDecide && (
        <div className="space-y-3 border-t border-border p-4">
          <label className="block text-sm font-medium text-foreground" htmlFor="decision-comment">
            Decision comment
          </label>
          <textarea
            id="decision-comment"
            rows={2}
            value={decisionComment}
            onChange={(event) => setDecisionComment(event.target.value)}
            placeholder="Optional for approve; required for reject or request changes"
            className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="success"
              size="sm"
              loading={isApproving}
              leftIcon={<Check className="h-4 w-4" />}
              disabled={!onApprove}
              onClick={handleApprove}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              loading={isRejecting}
              leftIcon={<X className="h-4 w-4" />}
              disabled={!onReject || decisionComment.trim().length < 3}
              onClick={handleReject}
            >
              Reject
            </Button>
            <Button
              variant="outline"
              size="sm"
              loading={isRequestingChanges}
              leftIcon={<RotateCcw className="h-4 w-4" />}
              disabled={!onRequestChanges || decisionComment.trim().length < 3}
              onClick={handleRequestChanges}
            >
              Request Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
