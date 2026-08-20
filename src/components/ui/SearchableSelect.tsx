import { useEffect, useId, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export type SearchableSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SearchableSelectProps = {
  value?: string;
  onChange?: (value: string) => void;
  options: SearchableSelectOption[];
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  onCreateNew?: (query: string) => void;
  createNewLabel?: (query: string) => string;
  className?: string;
  id?: string;
};

export function SearchableSelect({
  value,
  onChange,
  options,
  label,
  error,
  hint,
  placeholder = 'Select an option',
  searchPlaceholder = 'Search...',
  required,
  disabled,
  clearable = false,
  onCreateNew,
  createNewLabel = (query) => `Create "${query}"`,
  className,
  id: idProp,
}: SearchableSelectProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const showCreate =
    onCreateNew &&
    query.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) updateDropdownPosition();
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    } else {
      setQuery('');
    }
  }, [open]);

  const handleSelect = (optionValue: string) => {
    onChange?.(optionValue);
    setOpen(false);
  };

  const handleClear = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange?.('');
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
          'flex h-9 w-full items-center justify-between rounded-lg border border-input bg-card px-3 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
        )}
      >
        <span className={cn('truncate', !selected && 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </span>
        <span className="ml-2 flex shrink-0 items-center gap-1">
          {clearable && value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear selection"
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleClear(e as unknown as React.MouseEvent);
                }
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && createPortal(
        <div ref={dropdownRef} style={dropdownStyle} className="rounded-lg border border-border bg-popover shadow-md">
          <div className="border-b border-border p-2">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 && !showCreate && (
              <li className="px-3 py-2 text-sm text-muted-foreground">No options found</li>
            )}
            {filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  disabled={option.disabled}
                  onClick={() => handleSelect(option.value)}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
                    option.value === value && 'bg-accent text-accent-foreground',
                  )}
                >
                  {option.label}
                  {option.value === value && <Check className="h-4 w-4" />}
                </button>
              </li>
            ))}
            {showCreate && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onCreateNew?.(query.trim());
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-primary hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                  {createNewLabel(query.trim())}
                </button>
              </li>
            )}
          </ul>
        </div>,
        document.body,
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
