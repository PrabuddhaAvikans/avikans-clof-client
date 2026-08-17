import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';

export type DrawerSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<DrawerSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: DrawerSize;
  className?: string;
  closeOnOverlayClick?: boolean;
};

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
  closeOnOverlayClick = true,
}: DrawerProps) {
  const titleId = useId();

  useScrollLock(open);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"
        aria-hidden
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'relative z-10 flex h-full w-full flex-col border-l border-border bg-card shadow-lg',
          sizeClasses[size],
          className,
        )}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          {title && (
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
          )}
          <IconButton
            variant="ghost"
            size="sm"
            icon={<X className="h-4 w-4" />}
            aria-label="Close drawer"
            onClick={onClose}
            className="ml-auto"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
