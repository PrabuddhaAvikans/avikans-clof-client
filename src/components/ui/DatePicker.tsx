import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export type DatePickerProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label?: string;
  error?: string;
  hint?: string;
  inputClassName?: string;
};

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      className,
      inputClassName,
      label,
      error,
      hint,
      required,
      id: idProp,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    const input = (
      <div className={cn('relative', className)}>
        <Calendar
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={ref}
          type="date"
          id={id}
          required={required}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            inputClassName,
          )}
          {...props}
          title={props.title ?? label ?? props.placeholder}
        />
      </div>
    );

    if (!label && !error && !hint) {
      return input;
    }

    return (
      <FormField id={id} label={label} error={error} hint={hint} required={required}>
        {input}
      </FormField>
    );
  },
);

DatePicker.displayName = 'DatePicker';
