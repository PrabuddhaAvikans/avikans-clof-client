import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
  hint?: string;
  textareaClassName?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      textareaClassName,
      label,
      error,
      hint,
      required,
      id: idProp,
      rows = 3,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    const textarea = (
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        required={required}
        disabled={disabled}
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          textareaClassName,
          className,
        )}
        {...props}
      />
    );

    if (!label && !error && !hint) {
      return textarea;
    }

    return (
      <FormField id={id} label={label} error={error} hint={hint} required={required}>
        {textarea}
      </FormField>
    );
  },
);

Textarea.displayName = 'Textarea';
