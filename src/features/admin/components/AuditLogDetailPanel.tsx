import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_SEVERITY_LABELS,
  auditActionVariant,
  auditEntityPath,
  auditFieldLabel,
  auditSeverityVariant,
} from "@/features/admin/lib/auditLabels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workspacePanelBody, workspacePanelEmpty, workspacePanelShell } from "@/lib/panelLayout";
import type { AuditLogEntry } from "@/types/audit";

export function AuditLogDetailPanel({
  log,
  className,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: {
  log: AuditLogEntry | null;
  className?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
}) {
  if (!log) {
    return (
      <div className={cn(workspacePanelEmpty, className)}>
        <p className="text-sm text-muted-foreground">Select an event to view details.</p>
      </div>
    );
  }

  const entityPath = auditEntityPath(log.entity, log.entityId);

  return (
    <div className={cn(workspacePanelShell, className)}>
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              {log.entityLabel || log.entity}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {log.userName} · {formatDateTime(log.timestamp)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge variant={auditActionVariant(log.action)}>
              {AUDIT_ACTION_LABELS[log.action]}
            </StatusBadge>
            <StatusBadge variant={auditSeverityVariant(log.severity)} dot>
              {AUDIT_SEVERITY_LABELS[log.severity]}
            </StatusBadge>
            <IconButton
              variant="outline"
              size="sm"
              icon={<ChevronUp className="h-4 w-4" />}
              aria-label="Previous event"
              disabled={!hasPrevious}
              onClick={onPrevious}
            />
            <IconButton
              variant="outline"
              size="sm"
              icon={<ChevronDown className="h-4 w-4" />}
              aria-label="Next event"
              disabled={!hasNext}
              onClick={onNext}
            />
          </div>
        </div>
      </div>

      <div className={workspacePanelBody}>
        <p className="text-sm text-foreground">{log.details}</p>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Metadata
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">User</dt>
              <dd className="font-medium">{log.userName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Entity</dt>
              <dd className="font-medium">{log.entity}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Record ID</dt>
              <dd className="font-medium">{log.entityId}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">When</dt>
              <dd className="font-medium">{formatDateTime(log.timestamp)}</dd>
            </div>
            {log.ipAddress && (
              <div>
                <dt className="text-xs text-muted-foreground">IP address</dt>
                <dd className="font-medium">{log.ipAddress}</dd>
              </div>
            )}
            {log.userAgent && (
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Client</dt>
                <dd className="font-medium break-words">{log.userAgent}</dd>
              </div>
            )}
          </dl>
        </section>

        {log.changes && log.changes.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Changes
            </h3>
            <div className="overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs font-medium uppercase text-muted-foreground">
                    <th className="px-3 py-2">Field</th>
                    <th className="px-3 py-2">Before</th>
                    <th className="px-3 py-2">After</th>
                  </tr>
                </thead>
                <tbody>
                  {log.changes.map((change) => (
                    <tr key={change.field} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{auditFieldLabel(change.field)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{change.from || "-"}</td>
                      <td className="px-3 py-2 font-medium">{change.to || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {entityPath && (
          <Link to={entityPath} className="inline-flex">
            <Button variant="outline" size="sm" leftIcon={<ExternalLink className="h-4 w-4" />}>
              Open record
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
