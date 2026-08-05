import type { ReactNode } from 'react';
import { FieldArray, useFormikContext } from 'formik';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export type FieldArraySectionProps = {
  name: string;
  title: string;
  description?: string;
  addLabel?: string;
  defaultItem: unknown;
  children: (name: string, index: number) => ReactNode;
  className?: string;
};

export function FieldArraySection({
  name,
  title,
  description,
  addLabel = 'Add Item',
  defaultItem,
  children,
  className,
}: FieldArraySectionProps) {
  const { values } = useFormikContext<Record<string, unknown>>();
  const items = values[name];
  const itemCount = Array.isArray(items) ? items.length : 0;

  return (
    <section className={cn('rounded-md border border-border bg-card p-6 shadow-xs', className)}>
      <FieldArray name={name}>
        {({ push, remove }) => (
          <>
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
                {description && (
                  <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => push(defaultItem)}
              >
                {addLabel}
              </Button>
            </div>

            {itemCount === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No items added yet.</p>
            ) : (
              <div className="space-y-4">
                {Array.from({ length: itemCount }).map((_, index) => (
                  <div
                    key={`${name}-${index}`}
                    className="relative rounded-md border border-border bg-muted/20 p-4"
                  >
                    <div className="absolute right-3 top-3">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Remove item"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {children(`${name}.${index}`, index)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </FieldArray>
    </section>
  );
}
