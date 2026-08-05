import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  selectClassName?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      selectClassName,
      label,
      error,
      hint,
      required,
      options,
      placeholder,
      id: idProp,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;

    const select = (
      <div className={cn('relative', className)}>
        <select
          ref={ref}
          id={id}
          required={required}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full appearance-none rounded-md border border-input bg-card px-3 pr-9 text-sm text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive',
            selectClassName,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
    );

    if (!label && !error && !hint) {
      return select;
    }

    return (
      <FormField id={id} label={label} error={error} hint={hint} required={required}>
        {select}
      </FormField>
    );
  },
);

Select.displayName = 'Select';
