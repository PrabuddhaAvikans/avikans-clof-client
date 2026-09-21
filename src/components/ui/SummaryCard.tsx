import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type SummaryCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: number;
  trendLabel?: string;
  className?: string;
};

export function SummaryCard({
  title,
  value,
  description,
  icon,
  trend,
  trendLabel = 'vs last month',
  className,
}: SummaryCardProps) {
  const isPositive = trend !== undefined && trend >= 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card p-4',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground" title={title}>{title}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground tabular-nums" title={String(value)}>
            {value}
          </p>
        </div>
        {icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
            {icon}
          </div>
        )}
      </div>

      {(trend !== undefined || description) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {trend !== undefined && (
            <span
              className={cn(
                'inline-flex items-center text-[11px] font-medium',
                isPositive && 'text-blue-600',
                isNegative && 'text-red-600',
              )}
            >
              {isPositive ? '↑' : '↓'} {Math.abs(trend)}%
              <span className="ml-1 font-normal text-muted-foreground">{trendLabel}</span>
            </span>
          )}
          {description && !trend && (
            <p className="text-[11px] text-muted-foreground">{description}</p>
          )}
        </div>
      )}
    </div>
  );
}
