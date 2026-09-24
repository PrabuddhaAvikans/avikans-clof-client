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
  issues: Issue[];
  emptyMessage?: string;
  className?: string;
}) {
  const blocking = issues.filter((item) => item.isBlocking);
  const warnings = issues.filter((item) => !item.isBlocking);

  if (issues.length === 0) {
    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800",
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
          <h4 className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Blocking ({blocking.length})
          </h4>
          <ul className="space-y-2">
            {blocking.map((issue) => (
              <li
                key={issue.id}
                className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900"
              >
                <Ban className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p>{issue.message}</p>
                  <p className="mt-1 text-xs text-red-700/80">
                    {[issue.validationType, issue.validationCode, issue.entityId]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {warnings.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Warnings ({warnings.length})
          </h4>
          <ul className="space-y-2">
            {warnings.map((issue) => (
              <li
                key={issue.id}
                className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0">
                  <p>{issue.message}</p>
                  <p className="mt-1 text-xs text-amber-800/80">
                    {[issue.validationType, issue.validationCode]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
