import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type FormFieldProps = {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
};

export function FormField({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label
          htmlFor={id}
          title={label}
          className="block text-xs font-medium leading-none text-foreground"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-red-600" aria-hidden>
              *
            </span>
          )}
        </label>
      ) : null}
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="text-xs text-blue-600/80">{hint}</p>}
    </div>
  );
}
