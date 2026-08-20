import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/utils';
import { IconButton } from './IconButton';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  className?: string;
  closeOnOverlayClick?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
  closeOnOverlayClick = true,
}: ModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"
        aria-hidden
        onClick={closeOnOverlayClick ? onClose : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        className={cn(
          'relative z-10 flex max-h-[90vh] w-full flex-col rounded-lg border border-border bg-card shadow-lg',
          sizeClasses[size],
          className,
        )}
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          {title ? (
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              {title}
            </h2>
          ) : (
            <span className="sr-only" id={titleId}>
              Dialog
            </span>
          )}
          <IconButton
            variant="ghost"
            size="sm"
            icon={<X className="h-4 w-4" />}
            aria-label="Close dialog"
            onClick={onClose}
            className="ml-auto"
          />
        </div>
        <div className="flex-1 overflow-visible px-5 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
