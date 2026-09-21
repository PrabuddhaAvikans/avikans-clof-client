import { Link } from "react-router-dom";

export type DashboardKpi = {
  id: string;
  label: string;
  value: string | number;
  meta?: string;
  href?: string;
  bar?: number;
};

export type DashboardStat = {
  id: string;
  label: string;
  value: string | number;
  href?: string;
};

export function DashboardKpiStrip({ items }: { items: DashboardKpi[] }) {
  const maxBar = Math.max(...items.map((item) => item.bar ?? 0), 1);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const width = Math.round(((item.bar ?? 0) / maxBar) * 100);
        const body = (
          <div className="flex h-full flex-col rounded-lg border border-border bg-card px-3.5 py-2.5 transition-colors hover:bg-muted/40">
            <div className="flex min-h-[14px] items-baseline justify-between gap-2">
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground" title={item.label}>
                {item.label}
              </p>
              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {item.meta ?? "\u00a0"}
              </span>
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-foreground">
              {item.value}
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-foreground" style={{ width: `${width}%` }} />
            </div>
          </div>
        );

        return item.href ? (
          <Link key={item.id} to={item.href} className="min-w-0" title={item.label}>
            {body}
          </Link>
        ) : (
          <div key={item.id} className="min-w-0" title={item.label}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

export function DashboardStatRow({ items }: { items: DashboardStat[] }) {
  if (!items.length) return null;

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const body = (
          <div className="flex items-baseline justify-between gap-2 px-3 py-2">
            <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground" title={String(item.value)}>
              {item.value}
            </span>
          </div>
        );

        return item.href ? (
          <Link
            key={item.id}
            to={item.href}
            title={item.label}
            className="min-w-0 bg-card transition-colors hover:bg-muted/40"
          >
            {body}
          </Link>
        ) : (
          <div key={item.id} className="min-w-0 bg-card" title={item.label}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
