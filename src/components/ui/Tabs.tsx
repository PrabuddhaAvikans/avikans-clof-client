import { createContext, useContext, useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TabsContextValue = {
  value: string;
  onChange: (value: string) => void;
  baseId: string;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs components must be used within Tabs');
  return ctx;
}

export type TabsProps = {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
};

export function Tabs({ value, onChange, children, className }: TabsProps) {
  const baseId = useId();

  return (
    <TabsContext.Provider value={{ value, onChange, baseId }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export type TabListProps = {
  children: ReactNode;
  className?: string;
};

export function TabList({ children, className }: TabListProps) {
  return (
    <div role="tablist" className={cn('flex gap-1 border-b border-border', className)}>
      {children}
    </div>
  );
}

export type TabProps = {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function Tab({ value, children, disabled, className }: TabProps) {
  const { value: selected, onChange, baseId } = useTabsContext();
  const isSelected = selected === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  return (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isSelected}
      aria-controls={panelId}
      disabled={disabled}
      onClick={() => onChange(value)}
      className={cn(
        'relative -mb-px rounded-t-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected
          ? 'border-b-2 border-primary text-primary'
          : 'text-muted-foreground hover:text-foreground',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

export type TabPanelProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { value: selected, baseId } = useTabsContext();
  const isSelected = selected === value;
  const tabId = `${baseId}-tab-${value}`;
  const panelId = `${baseId}-panel-${value}`;

  if (!isSelected) return null;

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      className={cn('pt-4', className)}
    >
      {children}
    </div>
  );
}
