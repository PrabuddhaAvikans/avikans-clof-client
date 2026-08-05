import { useId } from 'react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';
import { DatePicker } from './DatePicker';

export type DateRange = {
  from?: string;
  to?: string;
};

export type DateRangePickerProps = {
  value?: DateRange;
  onChange?: (value: DateRange) => void;
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  disabled?: boolean;
  fromLabel?: string;
  toLabel?: string;
  className?: string;
  id?: string;
};

export function DateRangePicker({
  value = {},
  onChange,
  label,
  error,
  hint,
  required,
  disabled,
  fromLabel = 'From',
  toLabel = 'To',
  className,
  id: idProp,
}: DateRangePickerProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;

  const picker = (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      <DatePicker
        label={fromLabel}
        value={value.from ?? ''}
        disabled={disabled}
        max={value.to}
        onChange={(e) => onChange?.({ ...value, from: e.target.value })}
      />
      <DatePicker
        label={toLabel}
        value={value.to ?? ''}
        disabled={disabled}
        min={value.from}
        onChange={(e) => onChange?.({ ...value, to: e.target.value })}
      />
    </div>
  );

  if (!label && !error && !hint) {
    return picker;
  }

  return (
    <FormField id={id} label={label} error={error} hint={hint} required={required}>
      {picker}
    </FormField>
  );
}
