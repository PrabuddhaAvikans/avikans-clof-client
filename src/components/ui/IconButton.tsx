import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iconButtonVariants } from './button-variants';
import type { ButtonSize, ButtonVariant } from './Button';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon: ReactNode;
  'aria-label': string;
  tooltip?: string;
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      variant = 'ghost',
      size = 'md',
      loading = false,
      icon,
      disabled,
      tooltip,
      type = 'button',
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        title={tooltip ?? ariaLabel}
        className={cn(iconButtonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      </button>
    );
  },
);

IconButton.displayName = 'IconButton';
