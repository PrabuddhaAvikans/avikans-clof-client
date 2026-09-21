import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { getNodeText, resolveHoverTitle } from '@/lib/hoverTitle';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full font-medium whitespace-nowrap border',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-700 border-neutral-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-red-50 text-red-700 border-red-200',
        info: 'bg-blue-50 text-blue-700 border-blue-200',
        teal: 'bg-teal-50 text-teal-700 border-teal-200',
        neutral: 'bg-neutral-50 text-neutral-500 border-neutral-200',
        primary: 'bg-neutral-900 text-white border-neutral-900',
        outline: 'bg-transparent text-neutral-600 border-neutral-300',
      },
      size: {
        sm: 'gap-1 px-2 py-0.5 text-[11px] leading-none',
        md: 'gap-1.5 px-2.5 py-1 text-xs leading-none',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
);

export type StatusBadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
export type StatusBadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>;

export type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants> & {
    dot?: boolean;
  };

export function StatusBadge({
  className,
  variant = 'default',
  size = 'sm',
  dot = false,
  children,
  title,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
      title={resolveHoverTitle(title, getNodeText(children))}
    >
      {dot && (
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
            variant === 'success' && 'bg-emerald-500',
            variant === 'warning' && 'bg-amber-500',
            variant === 'danger' && 'bg-red-500',
            variant === 'info' && 'bg-blue-500',
            variant === 'teal' && 'bg-teal-500',
            variant === 'primary' && 'bg-white',
            (variant === 'default' || variant === 'neutral' || variant === 'outline') &&
              'bg-neutral-400',
          )}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
