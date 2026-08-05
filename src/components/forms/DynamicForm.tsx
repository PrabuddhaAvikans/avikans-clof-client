import { useFormikContext } from 'formik';
import { DynamicField } from '@/components/forms/DynamicField';
import type { DynamicFieldConfig, DynamicFormSection } from '@/components/forms/types';
import { COL_SPAN_CLASSES, GRID_COLUMN_CLASSES } from '@/components/forms/utils';
import { cn } from '@/lib/utils';

export type DynamicFormProps = {
  sections?: DynamicFormSection[];
  fields?: DynamicFieldConfig[];
  columns?: 1 | 2 | 3 | 4;
  className?: string;
};

function FieldGrid({
  fields,
  columns,
}: {
  fields: DynamicFieldConfig[];
  columns: 1 | 2 | 3 | 4;
}) {
  return (
    <div className={cn('grid gap-4', GRID_COLUMN_CLASSES[columns])}>
      {fields.map((field) => (
        <DynamicField
          key={field.name}
          config={field}
          className={field.colSpan ? COL_SPAN_CLASSES[field.colSpan] : undefined}
        />
      ))}
    </div>
  );
}

export function DynamicForm({ sections, fields, columns = 3, className }: DynamicFormProps) {
  useFormikContext();

  if (sections && sections.length > 0) {
    return (
      <div className={cn('space-y-6', className)}>
        {sections.map((section) => (
          <section
            key={section.id}
            className="rounded-md border border-border bg-card p-6 shadow-xs"
          >
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
              {section.description && (
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              )}
            </div>
            <FieldGrid fields={section.fields} columns={section.columns ?? columns} />
          </section>
        ))}
      </div>
    );
  }

  if (fields && fields.length > 0) {
    return (
      <div className={cn('rounded-md border border-border bg-card p-6 shadow-xs', className)}>
        <FieldGrid fields={fields} columns={columns} />
      </div>
    );
  }

  return null;
}
