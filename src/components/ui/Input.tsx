import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export type InputSize = 'md' | 'sm';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
  inputClassName?: string;
  size?: InputSize;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      inputClassName,
      label,
      error,
      hint,
      required,
      leftAddon,
      rightAddon,
      id: idProp,
      disabled,
      size = 'md',
      type,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    const inputClasses = cn(
      'flex w-full rounded-md border border-input bg-card text-sm text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      size === 'sm' ? 'h-8 min-w-[4.5rem] px-2 py-0.5' : 'h-9 px-3 py-1',
      type === 'number' &&
        size === 'sm' &&
        '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
      error && 'border-destructive focus-visible:ring-destructive',
      leftAddon && 'pl-9',
      rightAddon && 'pr-9',
      inputClassName,
    );

    const field = (
      <div className={cn('relative', className)}>
        {leftAddon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {leftAddon}
          </div>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          required={required}
          disabled={disabled}
          className={inputClasses}
          {...props}
        />
        {rightAddon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">{rightAddon}</div>
        )}
      </div>
    );

    if (!label && !error && !hint) {
      return field;
    }

    return (
      <FormField id={id} label={label} error={error} hint={hint} required={required}>
        {field}
      </FormField>
    );
  },
);

Input.displayName = 'Input';
