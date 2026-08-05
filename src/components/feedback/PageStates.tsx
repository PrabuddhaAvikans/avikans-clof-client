import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';

export type PageState = 'idle' | 'loading' | 'empty' | 'error';

export type PageStatesProps = {
  state: PageState;
  children: ReactNode;
  loadingVariant?: 'text' | 'card' | 'table' | 'avatar';
  loadingLines?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  errorMessage?: string;
  onRetry?: () => void;
  className?: string;
};

export function PageStates({
  state,
  children,
  loadingVariant = 'card',
  loadingLines = 5,
  emptyTitle = 'No data found',
  emptyDescription,
  emptyAction,
  errorMessage = 'Failed to load data. Please try again.',
  onRetry,
  className,
}: PageStatesProps) {
  if (state === 'loading') {
    return (
      <div className={cn('py-6', className)}>
        <LoadingSkeleton variant={loadingVariant} lines={loadingLines} />
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className={cn('py-6', className)}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={cn('py-6', className)}>
        <ErrorState message={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  return className ? <div className={className}>{children}</div> : <>{children}</>;
}

export type PageContentProps = {
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: ReactNode;
  loadingVariant?: 'text' | 'card' | 'table' | 'avatar';
  loadingLines?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  className?: string;
};

export function PageContent({
  isLoading,
  isEmpty,
  error,
  onRetry,
  children,
  loadingVariant = 'card',
  loadingLines,
  emptyTitle,
  emptyDescription,
  emptyAction,
  className,
}: PageContentProps) {
  let state: PageState = 'idle';
  if (isLoading) state = 'loading';
  else if (error) state = 'error';
  else if (isEmpty) state = 'empty';

  return (
    <PageStates
      state={state}
      loadingVariant={loadingVariant}
      loadingLines={loadingLines}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      emptyAction={emptyAction}
      errorMessage={error ?? undefined}
      onRetry={onRetry}
      className={className}
    >
      {children}
    </PageStates>
  );
}
