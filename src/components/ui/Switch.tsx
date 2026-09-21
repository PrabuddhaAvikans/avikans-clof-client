import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type SwitchProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label?: string;
  description?: string;
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      label,
      description,
      id: idProp,
      disabled,
      checked,
      onChange,
      title,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const hoverTitle = title ?? label ?? description ?? ariaLabel;

    return (
      <label
        htmlFor={id}
        title={hoverTitle}
        className={cn(
          'flex cursor-pointer items-start justify-between gap-3',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        {(label || description) && (
          <span className="flex flex-col">
            {label && <span className="text-sm font-medium text-foreground">{label}</span>}
            {description && <span className="text-xs text-muted-foreground">{description}</span>}
          </span>
        )}
        <span className="relative inline-flex shrink-0">
          <input
            ref={ref}
            type="checkbox"
            role="switch"
            id={id}
            disabled={disabled}
            checked={checked}
            onChange={onChange}
            aria-label={ariaLabel}
            className="peer sr-only"
            {...props}
          />
          <span
            aria-hidden
            className={cn(
              'block h-5 w-9 rounded-full bg-input transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
              'peer-checked:bg-primary',
            )}
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-0.5 top-0.5 block h-4 w-4 rounded-full bg-card shadow-sm transition-transform peer-checked:translate-x-4"
          />
        </span>
      </label>
    );
  },
);

Switch.displayName = 'Switch';
