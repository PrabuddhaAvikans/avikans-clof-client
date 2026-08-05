import type { FieldOption } from '@/components/forms/types';

export function resolveFieldCondition(
  condition: boolean | ((values: Record<string, unknown>) => boolean) | undefined,
  values: Record<string, unknown>,
): boolean {
  if (condition === undefined) {
    return false;
  }
  return typeof condition === 'function' ? condition(values) : condition;
}

export function resolveFieldOptions(
  options: FieldOption[] | ((values: Record<string, unknown>) => FieldOption[]) | undefined,
  values: Record<string, unknown>,
): FieldOption[] {
  if (!options) {
    return [];
  }
  return typeof options === 'function' ? options(values) : options;
}

export const GRID_COLUMN_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export const COL_SPAN_CLASSES: Record<1 | 2 | 3 | 4, string> = {
  1: '',
  2: 'sm:col-span-2',
  3: 'sm:col-span-2 lg:col-span-3',
  4: 'sm:col-span-2 lg:col-span-4',
};
