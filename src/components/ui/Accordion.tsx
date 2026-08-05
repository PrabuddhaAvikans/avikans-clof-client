import { createContext, useContext, useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type AccordionContextValue = {
  openItems: string[];
  toggle: (value: string) => void;
  type: 'single' | 'multiple';
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordionContext() {
  const ctx = useContext(AccordionContext);
  if (!ctx) throw new Error('Accordion components must be used within Accordion');
  return ctx;
}

export type AccordionProps = {
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  children: ReactNode;
  className?: string;
};

export function Accordion({
  type = 'single',
  defaultValue,
  children,
  className,
}: AccordionProps) {
  const initial = Array.isArray(defaultValue)
    ? defaultValue
    : defaultValue
      ? [defaultValue]
      : [];

  const [openItems, setOpenItems] = useState<string[]>(initial);

  const toggle = (value: string) => {
    setOpenItems((prev) => {
      const isOpen = prev.includes(value);
      if (type === 'single') {
        return isOpen ? [] : [value];
      }
      return isOpen ? prev.filter((v) => v !== value) : [...prev, value];
    });
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggle, type }}>
      <div className={cn('divide-y divide-border rounded-lg border border-border bg-card', className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export type AccordionItemProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function AccordionItem({ value, children, className }: AccordionItemProps) {
  return <div data-value={value} className={cn('px-4', className)}>{children}</div>;
}

export type AccordionTriggerProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function AccordionTrigger({ value, children, className }: AccordionTriggerProps) {
  const { openItems, toggle } = useAccordionContext();
  const isOpen = openItems.includes(value);
  const triggerId = useId();
  const panelId = `${triggerId}-panel`;

  return (
    <button
      type="button"
      id={triggerId}
      aria-expanded={isOpen}
      aria-controls={panelId}
      onClick={() => toggle(value)}
      className={cn(
        'flex w-full items-center justify-between py-4 text-left text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {children}
      <ChevronDown
        className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
        aria-hidden
      />
    </button>
  );
}

export type AccordionContentProps = {
  value: string;
  children: ReactNode;
  className?: string;
};

export function AccordionContent({ value, children, className }: AccordionContentProps) {
  const { openItems } = useAccordionContext();
  const isOpen = openItems.includes(value);

  if (!isOpen) return null;

  return (
    <div className={cn('pb-4 text-sm text-muted-foreground', className)}>
      {children}
    </div>
  );
}
