import { useFormikContext } from 'formik';
import type { DateRange } from '@/components/ui/DateRangePicker';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import { FormikCheckbox } from '@/components/forms/FormikCheckbox';
import { FormikDatePicker } from '@/components/forms/FormikDatePicker';
import { FormikInput } from '@/components/forms/FormikInput';
import { FormikMultiSelect } from '@/components/forms/FormikMultiSelect';
import { FormikSearchableSelect } from '@/components/forms/FormikSearchableSelect';
import { FormikSelect } from '@/components/forms/FormikSelect';
import { FormikSwitch } from '@/components/forms/FormikSwitch';
import { FormikTextarea } from '@/components/forms/FormikTextarea';
import type { DynamicFieldConfig } from '@/components/forms/types';
import { resolveFieldCondition, resolveFieldOptions } from '@/components/forms/utils';
import { useFormikFieldState } from '@/components/forms/useFormikFieldState';
import { cn } from '@/lib/utils';

export type DynamicFieldProps = {
  config: DynamicFieldConfig;
  className?: string;
};

export function DynamicField({ config, className }: DynamicFieldProps) {
  const { values, setFieldValue } = useFormikContext<Record<string, unknown>>();
  const { field, error, meta, helpers } = useFormikFieldState(config.name);

  const isHidden = resolveFieldCondition(config.hidden, values);
  if (isHidden) {
    return null;
  }

  const isDisabled = resolveFieldCondition(config.disabled, values);
  const options = resolveFieldOptions(config.options, values);
  const commonProps = {
    name: config.name,
    label: config.label,
    hint: config.hint,
    required: config.required,
    disabled: isDisabled,
    placeholder: config.placeholder,
  };

  const renderField = () => {
    switch (config.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'tel':
      case 'url':
        return <FormikInput {...commonProps} type={config.type} />;

      case 'number':
        return (
          <FormikInput
            {...commonProps}
            type="number"
            min={config.min}
            max={config.max}
            step={config.step}
          />
        );

      case 'textarea':
        return <FormikTextarea {...commonProps} rows={config.rows} />;

      case 'select':
        return <FormikSelect {...commonProps} options={options} placeholder={config.placeholder} />;

      case 'searchable-select':
        return (
          <FormikSearchableSelect
            {...commonProps}
            options={options}
            placeholder={config.placeholder}
            onCreateNew={config.onCreateNew}
            createNewLabel={
              typeof config.createNewLabel === 'function'
                ? config.createNewLabel
                : config.createNewLabel
                  ? () => String(config.createNewLabel)
                  : undefined
            }
          />
        );

      case 'multi-select':
        return (
          <FormikMultiSelect {...commonProps} options={options} placeholder={config.placeholder} />
        );

      case 'checkbox':
        return <FormikCheckbox {...commonProps} />;

      case 'switch':
        return <FormikSwitch {...commonProps} />;

      case 'date':
        return <FormikDatePicker {...commonProps} />;

      case 'date-range': {
        const rangeValue =
          field.value && typeof field.value === 'object'
            ? (field.value as DateRange)
            : { from: '', to: '' };

        return (
          <DateRangePicker
            label={config.label}
            hint={config.hint}
            error={error}
            required={config.required}
            disabled={isDisabled}
            value={rangeValue}
            onChange={(next) => {
              void helpers.setValue(next);
              void helpers.setTouched(true);
            }}
          />
        );
      }

      case 'hidden':
        return (
          <input
            type="hidden"
            name={field.name}
            value={typeof field.value === 'string' || typeof field.value === 'number' ? field.value : ''}
          />
        );

      case 'custom':
        return (
          config.render?.({
            name: config.name,
            value: field.value,
            error,
            touched: meta.touched,
            setValue: (value) => {
              void setFieldValue(config.name, value);
            },
            values,
          }) ?? null
        );

      default:
        return <FormikInput {...commonProps} type="text" />;
    }
  };

  return <div className={cn(className)}>{renderField()}</div>;
}
