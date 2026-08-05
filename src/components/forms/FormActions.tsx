import type { ReactNode } from 'react';
import { useFormikContext } from 'formik';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export type FormActionsProps = {
  cancelLabel?: string;
  onCancel?: () => void;
  submitLabel?: string;
  secondaryActions?: ReactNode;
  className?: string;
};

export function FormActions({
  cancelLabel = 'Cancel',
  onCancel,
  submitLabel = 'Save',
  secondaryActions,
  className,
}: FormActionsProps) {
  const { isSubmitting } = useFormikContext();

  return (
    <div
      className={cn(
        'sticky bottom-0 flex flex-wrap items-center justify-end gap-2 rounded-md border border-border bg-card p-4 shadow-xs',
        className,
      )}
    >
      {onCancel && (
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
          {cancelLabel}
        </Button>
      )}
      {secondaryActions}
      <Button type="submit" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </div>
  );
}
