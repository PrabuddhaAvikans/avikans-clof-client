import type { ReactNode } from 'react';
import { AlertCircle, Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StepStatus = 'completed' | 'current' | 'pending' | 'error';

export type StepItem = {
  id: string;
  label: string;
  description?: string;
  /** Optional content rendered under the step label (vertical orientation). */
  content?: ReactNode;
  status: StepStatus;
};

export type StepperProps = {
  steps: StepItem[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

function StepIcon({ status }: { status: StepStatus }) {
  if (status === 'completed') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-success-foreground">
        <Check className="h-4 w-4" />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
        <AlertCircle className="h-4 w-4" />
      </span>
    );
  }
  if (status === 'current') {
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-card text-sm font-semibold text-primary">
        <Circle className="h-3 w-3 fill-primary text-primary" />
      </span>
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-sm font-medium text-muted-foreground">
      <Circle className="h-3 w-3" />
    </span>
  );
}

export function Stepper({ steps, orientation = 'horizontal', className }: StepperProps) {
  if (orientation === 'vertical') {
    return (
      <ol className={cn('space-y-0', className)}>
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-4">
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} />
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'my-1 w-px flex-1 min-h-8',
                    step.status === 'completed' ? 'bg-success' : 'bg-border',
                  )}
                />
              )}
            </div>
            <div className={cn('min-w-0 flex-1 pb-8', index === steps.length - 1 && 'pb-0')}>
              <p
                className={cn(
                  'text-sm font-medium',
                  step.status === 'current' && 'text-primary',
                  step.status === 'error' && 'text-destructive',
                  step.status === 'pending' && 'text-muted-foreground',
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{step.description}</p>
              )}
              {step.content && <div className="mt-2">{step.content}</div>}
            </div>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className={cn('flex w-full items-start', className)}>
      {steps.map((step, index) => (
        <li key={step.id} className="flex flex-1 flex-col items-center text-center">
          <div className="flex w-full items-center">
            {index > 0 && (
              <div
                className={cn(
                  'h-px flex-1',
                  steps[index - 1]?.status === 'completed' ? 'bg-success' : 'bg-border',
                )}
              />
            )}
            <StepIcon status={step.status} />
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
