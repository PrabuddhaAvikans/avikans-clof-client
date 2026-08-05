import { useField, useFormikContext } from 'formik';

export function useFormikFieldState(name: string) {
  const [field, meta, helpers] = useField(name);
  const { submitCount } = useFormikContext();
  const showError = Boolean((meta.touched || submitCount > 0) && meta.error);

  return {
    field,
    meta,
    helpers,
    error: showError ? meta.error : undefined,
    showError,
  };
}
