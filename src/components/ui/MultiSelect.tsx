import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export type MultiSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type MultiSelectProps = {
  value?: string[];
  onChange?: (value: string[]) => void;
  options: MultiSelectOption[];
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function MultiSelect({
  value = [],
  onChange,
  options,
  label,
  error,
  hint,
  placeholder = 'Select options',
  searchPlaceholder = 'Search...',
  required,
  disabled,
  className,
  id: idProp,
}: MultiSelectProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedOptions = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const toggle = (optionValue: string) => {
    const next = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onChange?.(next);
  };

  const remove = (optionValue: string) => {
    onChange?.(value.filter((v) => v !== optionValue));
  };

  const trigger = (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={cn(
          'flex min-h-9 w-full items-center justify-between rounded-lg border border-input bg-card px-3 py-1.5 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
        )}
      >
        <div className="flex flex-1 flex-wrap gap-1">
          {selectedOptions.length === 0 && (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
            >
              {option.label}
              {!disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Remove ${option.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(option.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      remove(option.value);
                    }
                  }}
                  className="cursor-pointer rounded text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </span>
          ))}
        </div>
        <ChevronDown className={cn('ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-md">
          <div className="border-b border-border p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <ul role="listbox" aria-multiselectable className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No options found</li>
            )}
            {filtered.map((option) => {
              const isSelected = value.includes(option.value);
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    onClick={() => toggle(option.value)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
                      isSelected && 'bg-accent/50',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded border border-input',
                          isSelected && 'border-primary bg-primary text-primary-foreground',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                      {option.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );

  if (!label && !error && !hint) {
    return trigger;
  }

  return (
    <FormField id={id} label={label} error={error} hint={hint} required={required}>
      {trigger}
    </FormField>
  );
}
