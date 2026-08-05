import type { ReactNode } from 'react';
import { Form, Formik } from 'formik';
import type { FormikHelpers, FormikProps, FormikValues } from 'formik';
import type * as Yup from 'yup';
import { cn } from '@/lib/utils';

export type FormikFormProps<T extends FormikValues> = {
  initialValues: T;
  validationSchema?: Yup.AnyObjectSchema;
  onSubmit: (values: T, helpers: FormikHelpers<T>) => void | Promise<void>;
  children: ReactNode | ((formik: FormikProps<T>) => ReactNode);
  enableReinitialize?: boolean;
  className?: string;
  id?: string;
};

export function FormikForm<T extends FormikValues>({
  initialValues,
  validationSchema,
  onSubmit,
  children,
  enableReinitialize = false,
  className,
  id,
}: FormikFormProps<T>) {
  return (
    <Formik<T>
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
      enableReinitialize={enableReinitialize}
    >
      {(formik) => (
        <Form id={id} className={cn('space-y-6', className)} noValidate>
          {typeof children === 'function' ? children(formik) : children}
        </Form>
      )}
    </Formik>
  );
}
