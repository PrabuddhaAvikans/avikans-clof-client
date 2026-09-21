import { cn } from '@/lib/utils';

export type ActivityEntry = {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  comment?: string;
};

export type ActivityLogProps = {
  entries: ActivityEntry[];
  className?: string;
  emptyMessage?: string;
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ActivityLog({
  entries,
  className,
  emptyMessage = 'No activity yet',
}: ActivityLogProps) {
  if (entries.length === 0) {
    return (
      <p className={cn('py-6 text-center text-sm text-muted-foreground', className)}>
        {emptyMessage}
      </p>
    );
  }

  return (
    <ul className={cn('divide-y divide-border rounded-lg border border-border bg-card', className)}>
      {entries.map((entry) => (
        <li key={entry.id} className="flex gap-3 px-4 py-3">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
            title={entry.user}
            aria-hidden
          >
            {getInitials(entry.user)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-foreground">{entry.user}</span>
              <span className="text-sm text-muted-foreground">{entry.action}</span>
              <time className="ml-auto text-xs text-muted-foreground">{entry.timestamp}</time>
            </div>
            {entry.comment && (
              <p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                {entry.comment}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
