import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { FormikForm, FormikInput } from "@/components/forms";
import { useFormikFieldState } from "@/components/forms/useFormikFieldState";
import { Button, FormField, Modal, SearchableSelect } from "@/components/ui";
import * as yup from "yup";

const lookupSchema = yup.object({
  name: yup.string().trim().required("Name is required").max(80, "Use 80 characters or fewer"),
});

type LookupFormValues = yup.InferType<typeof lookupSchema>;

export type CreatableLookupFieldProps = {
  name: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  options: { value: string; label: string }[];
  placeholder?: string;
  addLabel?: string;
  onCreate: (name: string) => string;
};

export function CreatableLookupField({
  name,
  label,
  required,
  disabled,
  options,
  placeholder = "Select...",
  addLabel = "Add",
  onCreate,
}: CreatableLookupFieldProps) {
  const { field, error, helpers } = useFormikFieldState(name);
  const [open, setOpen] = useState(false);
  const [defaultName, setDefaultName] = useState("");
  const current = typeof field.value === "string" ? field.value : "";

  const mergedOptions = useMemo(() => {
    if (current && !options.some((option) => option.value === current)) {
      return [...options, { value: current, label: current }];
    }
    return options;
  }, [current, options]);

  const selectValue = (value: string) => {
    void helpers.setValue(value);
    void helpers.setTouched(true);
  };

  return (
    <>
      <FormField id={name} label={label} error={error} required={required}>
        <div className="flex items-start gap-2">
          <SearchableSelect
            id={name}
            className="min-w-0 flex-1"
            options={mergedOptions}
            value={current}
            disabled={disabled}
            placeholder={placeholder}
            searchPlaceholder={`Search ${label.toLowerCase()}...`}
            onCreateNew={(query) => {
              setDefaultName(query);
              setOpen(true);
            }}
            createNewLabel={(query) => `Add "${query}"`}
            onChange={selectValue}
            clearable={!required}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            leftIcon={<Plus className="h-4 w-4" />}
            className="shrink-0"
            onClick={() => {
              setDefaultName("");
              setOpen(true);
            }}
          >
            Add
          </Button>
        </div>
      </FormField>

      <Modal open={open} onClose={() => setOpen(false)} title={`${addLabel} ${label}`} size="sm" footer={null}>
        {open && (
          <FormikForm<LookupFormValues>
            initialValues={{ name: defaultName }}
            validationSchema={lookupSchema}
            enableReinitialize
            onSubmit={(values) => {
              const created = onCreate(values.name);
              selectValue(created);
              setOpen(false);
            }}
            className="space-y-4"
          >
            {(formik) => (
              <>
                <FormikInput name="name" label="Name" required placeholder={`New ${label.toLowerCase()}`} />
                <div className="flex justify-end gap-2 border-t border-border pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={formik.isSubmitting}>
                    Add
                  </Button>
                </div>
              </>
            )}
          </FormikForm>
        )}
      </Modal>
    </>
  );
}
