import { useId } from 'react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export type RadioOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export type RadioGroupProps = {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: RadioOption[];
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  id?: string;
};

export function RadioGroup({
  name: nameProp,
  value,
  onChange,
  options,
  label,
  error,
  hint,
  required,
  disabled,
  orientation = 'vertical',
  className,
  id: idProp,
}: RadioGroupProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const name = nameProp ?? id;

  const group = (
    <div
      role="radiogroup"
      aria-labelledby={label ? `${id}-label` : undefined}
      className={cn(
        orientation === 'horizontal' ? 'flex flex-wrap gap-4' : 'flex flex-col gap-3',
        className,
      )}
    >
      {options.map((option) => {
        const optionId = `${id}-${option.value}`;
        const isDisabled = disabled || option.disabled;
        const isChecked = value === option.value;

        return (
          <label
            key={option.value}
            htmlFor={optionId}
            className={cn(
              'flex cursor-pointer items-start gap-2',
              isDisabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <input
              type="radio"
              id={optionId}
              name={name}
              value={option.value}
              checked={isChecked}
              disabled={isDisabled}
              required={required}
              onChange={() => onChange?.(option.value)}
              className="mt-0.5 h-4 w-4 shrink-0 border-input text-primary focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">{option.label}</span>
              {option.description && (
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );

  if (!label && !error && !hint) {
    return group;
  }

  return (
    <FormField id={id} label={label} error={error} hint={hint} required={required}>
      {group}
    </FormField>
  );
}
