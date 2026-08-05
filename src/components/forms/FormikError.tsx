import { useField, useFormikContext } from 'formik';
import { cn } from '@/lib/utils';

export type FormikErrorProps = {
  name: string;
  className?: string;
};

export function FormikError({ name, className }: FormikErrorProps) {
  const [, meta] = useField(name);
  const { submitCount } = useFormikContext();
  const showError = (meta.touched || submitCount > 0) && meta.error;

  if (!showError) {
    return null;
  }

  return (
    <p className={cn('text-xs text-destructive', className)} role="alert">
      {meta.error}
    </p>
  );
}
