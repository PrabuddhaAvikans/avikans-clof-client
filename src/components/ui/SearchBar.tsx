import { forwardRef, useEffect, useId, type InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField } from './FormField';

export type SearchBarProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label?: string;
  onClear?: () => void;
  showShortcutHint?: boolean;
  containerClassName?: string;
};

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      className,
      containerClassName,
      label,
      value,
      onChange,
      onClear,
      showShortcutHint = false,
      placeholder = 'Search...',
      disabled,
      id: idProp,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const hasValue = Boolean(value && String(value).length > 0);

    useEffect(() => {
      if (!showShortcutHint) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault();
          document.getElementById(id)?.focus();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showShortcutHint, id]);

    const input = (
      <div className={cn('relative h-9', !label && containerClassName)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={ref}
          id={id}
          type="search"
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'flex h-9 w-full appearance-none items-center rounded-md border border-input bg-card py-0 pl-9 text-sm leading-none text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none',
            showShortcutHint ? 'pr-20' : hasValue ? 'pr-9' : 'pr-3',
            className,
          )}
          {...props}
        />
        {showShortcutHint && !hasValue && (
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
            Ctrl+K
          </kbd>
        )}
        {hasValue && !disabled && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onClear?.()}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );

    if (!label) {
      return input;
    }

    return (
      <FormField id={id} label={label} className={containerClassName}>
        {input}
      </FormField>
    );
  },
);

SearchBar.displayName = 'SearchBar';
