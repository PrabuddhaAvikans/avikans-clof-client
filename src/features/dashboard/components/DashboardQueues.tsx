import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { formatCompactAmount } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DashboardTableRow } from "@/types/dashboard";
import type { StatusMap } from "@/types/status";

export function DashboardPanel({
  title,
  href,
  children,
  className,
}: {
  title: string;
  href?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card", className)}>
      <div className="flex h-10 items-center justify-between gap-2 border-b border-border px-3.5">
        <h3 className="truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {href && (
          <Link to={href} className="shrink-0 text-[11px] font-medium text-foreground hover:underline">
            All
          </Link>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export function DashboardCompactList({
  rows,
  statusMap,
  showAmount = false,
  emptyMessage = "None",
}: {
  rows: DashboardTableRow[];
  statusMap: StatusMap;
  showAmount?: boolean;
  emptyMessage?: string;
}) {
  if (!rows.length) {
    return <p className="px-3.5 py-8 text-center text-xs text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {rows.slice(0, 4).map((row) => (
        <li key={row.id}>
          <Link
            to={row.href ?? "#"}
            className={cn(
              "grid items-center gap-x-3 px-3.5 py-2.5 hover:bg-muted/40",
              showAmount
                ? "grid-cols-[minmax(0,1fr)_auto_3.25rem]"
                : "grid-cols-[minmax(0,1fr)_auto]",
              !row.href && "pointer-events-none",
            )}
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium leading-5 text-foreground">{row.reference}</p>
              <p className="truncate text-[11px] leading-4 text-muted-foreground">
                {row.customer || row.title}
              </p>
            </div>
            <MappedStatusBadge statusMap={statusMap} value={row.status} />
            {showAmount && (
              <span className="text-right text-[11px] font-medium tabular-nums text-foreground">
                {row.amount !== undefined ? formatCompactAmount(row.amount) : "—"}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
