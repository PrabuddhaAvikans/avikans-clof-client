import { useState, type ReactNode } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export type FilterPanelProps = {
  children: ReactNode;
  title?: string;
  defaultOpen?: boolean;
  onApply?: () => void;
  onReset?: () => void;
  applyLabel?: string;
  resetLabel?: string;
  className?: string;
  showActions?: boolean;
  variant?: 'default' | 'toolbar';
};

export function FilterPanel({
  children,
  title = 'Filters',
  defaultOpen = true,
  onApply,
  onReset,
  applyLabel = 'Apply',
  resetLabel = 'Reset',
  className,
  showActions = true,
  variant = 'default',
}: FilterPanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (variant === 'toolbar') {
    return (
      <div
        className={cn(
          'rounded-lg border border-border bg-card px-4 py-3 shadow-xs',
          className,
        )}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:gap-3">
          <div className="min-w-0 flex-1">{children}</div>
          {showActions && (onApply || onReset) && (
            <div className="flex h-9 shrink-0 items-center gap-2">
              {onReset && (
                <Button
                  variant="outline"
                  className="h-9 px-3"
                  onClick={onReset}
                >
                  {resetLabel}
                </Button>
              )}
              {onApply && (
                <Button
                  variant="primary"
                  className="h-9 px-4"
                  onClick={onApply}
                >
                  {applyLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card shadow-xs', className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {title}
        </span>
        <ChevronDown
          className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <>
          <div className="space-y-4 border-t border-border px-4 py-4">{children}</div>
          {showActions && (onApply || onReset) && (
            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              {onReset && (
                <Button variant="outline" className="h-9 px-3" onClick={onReset}>
                  {resetLabel}
                </Button>
              )}
              {onApply && (
                <Button variant="primary" className="h-9 px-4" onClick={onApply}>
                  {applyLabel}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
