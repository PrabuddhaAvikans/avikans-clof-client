import { cn } from '@/lib/utils';

export type LoadingSkeletonVariant = 'text' | 'card' | 'table' | 'avatar';

export type LoadingSkeletonProps = {
  variant?: LoadingSkeletonVariant;
  lines?: number;
  className?: string;
};

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      aria-hidden
    />
  );
}

export function LoadingSkeleton({
  variant = 'text',
  lines = 3,
  className,
}: LoadingSkeletonProps) {
  if (variant === 'avatar') {
    return (
      <div className={cn('flex items-center gap-3', className)} aria-busy aria-label="Loading">
        <Bone className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Bone className="h-4 w-1/3" />
          <Bone className="h-3 w-1/2" />
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div
        className={cn('rounded-lg border border-border bg-card p-4 space-y-3', className)}
        aria-busy
        aria-label="Loading"
      >
        <Bone className="h-5 w-1/3" />
        <Bone className="h-8 w-1/2" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-4/5" />
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('space-y-2', className)} aria-busy aria-label="Loading">
        <Bone className="h-9 w-full" />
        {Array.from({ length: lines }).map((_, i) => (
          <Bone key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)} aria-busy aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <Bone key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
