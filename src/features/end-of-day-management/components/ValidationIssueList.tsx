import { AlertTriangle, Ban, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Issue = {
  id: string;
  message: string;
  isBlocking: boolean;
  validationType?: string;
  validationCode?: string;
  entityType?: string;
  entityId?: string;
};

export function ValidationIssueList({
  issues,
  emptyMessage = "No validation issues. Period is ready to close.",
  className,
}: {
  issues?: Issue[] | null;
  emptyMessage?: string;
  className?: string;
}) {
  const safeIssues = issues ?? [];
  const blocking = safeIssues.filter((item) => item.isBlocking);
  const warnings = safeIssues.filter((item) => !item.isBlocking);

  if (safeIssues.length === 0) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success",
          className,
        )}
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {blocking.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive">
            Blocking ({blocking.length})
          </h4>
          <ul className="space-y-2">
            {blocking.map((issue) => (
              <li
                key={issue.id}
                className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-foreground"
              >
                <Ban className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
                <div className="min-w-0">
                  <p>{issue.message}</p>
                  {(issue.validationType || issue.validationCode || issue.entityId) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[issue.validationType, issue.validationCode, issue.entityId]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {warnings.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-warning">
            Warnings ({warnings.length})
          </h4>
          <ul className="space-y-2">
            {warnings.map((issue) => (
              <li
                key={issue.id}
                className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5 text-sm text-foreground"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                <div className="min-w-0">
                  <p>{issue.message}</p>
                  {(issue.validationType || issue.validationCode) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[issue.validationType, issue.validationCode]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
