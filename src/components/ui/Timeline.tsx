import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type TimelineEvent = {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: ReactNode;
  status?: 'default' | 'success' | 'warning' | 'danger' | 'info';
};

export type TimelineProps = {
  events: TimelineEvent[];
  className?: string;
};

const statusColors: Record<NonNullable<TimelineEvent['status']>, string> = {
  default: 'bg-muted-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-info',
};

export function Timeline({ events, className }: TimelineProps) {
  return (
    <ol className={cn('relative space-y-0', className)}>
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
          {index < events.length - 1 && (
            <div className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-border" aria-hidden />
          )}
          <div
            className={cn(
              'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-card bg-muted text-muted-foreground',
            )}
          >
            {event.icon ?? (
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  statusColors[event.status ?? 'default'],
                )}
              />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{event.title}</p>
              <time className="text-xs text-muted-foreground">{event.timestamp}</time>
            </div>
            {event.description && (
              <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
