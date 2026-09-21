import { useEffect, useRef } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  AUDIT_ACTION_LABELS,
  AUDIT_SEVERITY_LABELS,
  auditActionVariant,
  auditSeverityVariant,
} from "@/features/admin/lib/auditLabels";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workspaceListPanelBody, workspaceListPanelShell } from "@/lib/panelLayout";
import type { AuditLogEntry } from "@/types/audit";

export function AuditLogListPanel({
  items,
  totalCount,
  selectedId,
  onSelect,
  page,
  pageSize,
  onPageChange,
  isLoading,
  className,
}: {
  items: AuditLogEntry[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  isLoading?: boolean;
  className?: string;
}) {
  const selectedRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <div className={cn(workspaceListPanelShell, className)}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Events</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {totalCount} event{totalCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className={workspaceListPanelBody} aria-label="Audit event list">
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2 px-3 py-3">
                <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-40 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No audit events match your filters.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const selected = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    ref={selected ? selectedRef : undefined}
                    onClick={() => onSelect(item.id)}
                    title={item.entityLabel || item.entity}
                    className={cn(
                      "flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                      selected && "bg-primary/5 hover:bg-primary/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground" title={item.entityLabel || item.entity}>
                        {item.entityLabel || item.entity}
                      </p>
                      <StatusBadge variant={auditSeverityVariant(item.severity)} dot size="sm">
                        {AUDIT_SEVERITY_LABELS[item.severity]}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge variant={auditActionVariant(item.action)} size="sm">
                        {AUDIT_ACTION_LABELS[item.action]}
                      </StatusBadge>
                      <span className="truncate text-xs text-muted-foreground" title={item.details}>{item.details}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{item.userName}</span>
                      <span className="whitespace-nowrap">{formatDateTime(item.timestamp)}</span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {totalCount > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalCount}
          onChange={onPageChange}
          pageSizeOptions={[10, 20, 50]}
          className="rounded-none border-0 border-t border-border"
          showPageSize={false}
        />
      )}
    </div>
  );
}
