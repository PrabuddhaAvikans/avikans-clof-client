import type { ReactNode } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'completed' | 'current' | 'pending' | 'error';

export type StepItem = {
  id: string;
  label: string;
  description?: string;
  content?: ReactNode;
  status: StepStatus;
};

export type StepperProps = {
  steps: StepItem[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

function StepIcon({
  status,
  title,
  compact,
}: {
  status: StepStatus;
  title: string;
  compact?: boolean;
}) {
  const box = compact ? 'h-4 w-4' : 'h-8 w-8';

  if (status === 'completed') {
    return (
      <span
        title={title}
        className={cn(
          'flex items-center justify-center rounded-full bg-success text-success-foreground',
          box,
        )}
      >
        <Check className={compact ? 'h-2.5 w-2.5' : 'h-4 w-4'} strokeWidth={2.75} />
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span
        title={title}
        className={cn(
          'flex items-center justify-center rounded-full bg-destructive text-destructive-foreground',
          box,
        )}
      >
        <AlertCircle className={compact ? 'h-2.5 w-2.5' : 'h-4 w-4'} />
      </span>
    );
  }

  if (status === 'current') {
    return (
      <span
        title={title}
        className={cn(
          'flex items-center justify-center rounded-full border border-foreground bg-card',
          box,
        )}
      >
        <span className={cn('rounded-full bg-foreground', compact ? 'h-1.5 w-1.5' : 'h-2.5 w-2.5')} />
      </span>
    );
  }

  return (
    <span
      title={title}
      className={cn('rounded-full border border-border bg-card', box)}
    />
  );
}

export function Stepper({ steps, orientation = 'horizontal', className }: StepperProps) {
  if (orientation === 'vertical') {
    return (
      <ol className={cn('space-y-0', className)}>
        {steps.map((step, index) => (
          <li
            key={step.id}
            className="flex gap-2.5"
            data-status={step.status}
            title={step.description ? `${step.label} — ${step.description}` : step.label}
          >
            <div className="flex w-4 shrink-0 flex-col items-center">
              <StepIcon status={step.status} title={step.label} compact />
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'mt-1 w-px flex-1',
                    step.status === 'completed' ? 'bg-success/70' : 'bg-border',
                  )}
                />
              )}
            </div>
            <div className={cn('min-w-0 flex-1 pb-2.5', index === steps.length - 1 && 'pb-0')}>
              <div className="flex items-baseline justify-between gap-2">
                <p
                  className={cn(
                    'truncate text-[13px] leading-4',
                    step.status === 'current' && 'font-semibold text-foreground',
                    step.status === 'completed' && 'font-medium text-foreground',
                    step.status === 'error' && 'font-medium text-destructive',
                    step.status === 'pending' && 'font-medium text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p className="max-w-[55%] truncate text-[11px] leading-4 text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
              {step.content && <div className="mt-1.5">{step.content}</div>}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className={cn('flex w-full items-start', className)}>
      {steps.map((step, index) => (
        <li
          key={step.id}
          className="flex flex-1 flex-col items-center text-center"
          title={step.description ? `${step.label} — ${step.description}` : step.label}
        >
          <div className="flex w-full items-center">
            {index > 0 && (
              <div
                className={cn(
                  'h-px flex-1',
                  steps[index - 1]?.status === 'completed' ? 'bg-success' : 'bg-border',
                )}
              />
            )}
            <StepIcon status={step.status} title={step.label} />
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1',
                  step.status === 'completed' ? 'bg-success' : 'bg-border',
                )}
              />
            )}
          </div>
          <p
            className={cn(
              'mt-2 text-xs font-medium sm:text-sm',
              step.status === 'current' && 'text-primary',
              step.status === 'error' && 'text-destructive',
              step.status === 'pending' && 'text-muted-foreground',
            )}
          >
            {step.label}
          </p>
          {step.description && (
            <p className="mt-0.5 hidden text-xs text-muted-foreground sm:block">{step.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
