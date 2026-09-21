import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  indeterminate?: boolean;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      indeterminate = false,
      id: idProp,
      disabled,
      checked,
      title,
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const hoverTitle = title ?? label ?? ariaLabel;

    const setRef = (element: HTMLInputElement | null) => {
      if (element) {
        element.indeterminate = indeterminate;
      }
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

    return (
      <label
        htmlFor={id}
        title={hoverTitle}
        className={cn(
          'inline-flex cursor-pointer items-center gap-2',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <span className="relative inline-flex">
          <input
            ref={setRef}
            type="checkbox"
            id={id}
            disabled={disabled}
            checked={checked}
            aria-label={ariaLabel}
            className="peer sr-only"
            {...props}
          />
          <span
            aria-hidden
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded border border-input bg-card shadow-xs transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
              'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground',
              indeterminate && 'border-primary bg-primary text-primary-foreground',
            )}
          >
            {indeterminate ? (
              <Minus className="h-3 w-3" />
            ) : checked ? (
              <Check className="h-3 w-3" />
            ) : null}
          </span>
        </span>
        {label && <span className="text-sm text-foreground">{label}</span>}
      </label>
    );
  },
);

Checkbox.displayName = 'Checkbox';
