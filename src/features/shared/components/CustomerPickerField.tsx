import { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { Users } from "lucide-react";
import { useFormikFieldState } from "@/components/forms/useFormikFieldState";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { CustomerSelectorModal } from "@/features/shared/components/CustomerSelectorModal";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types/customer";

const EMPTY_CUSTOMERS: Customer[] = [];

type CustomerPickerValues = {
  customerId?: string;
  customerName?: string;
};

export type CustomerPickerFieldProps = {
  label?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  variant?: "select" | "profile";
  onSelect?: (customer: Customer) => void;
};

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function CustomerPickerField({
  label = "Customer",
  required = true,
  disabled,
  hint,
  variant = "select",
  onSelect,
}: CustomerPickerFieldProps) {
  const { values, setFieldValue, setFieldTouched } = useFormikContext<CustomerPickerValues>();
  const { error } = useFormikFieldState("customerId");
  const [browseOpen, setBrowseOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const customerId = typeof values.customerId === "string" ? values.customerId : "";
  const customerName = values.customerName?.trim() ?? "";

  const { data } = useCustomers({
    page: 1,
    pageSize: 100,
    status: "active",
  });

  const customers = data?.items ?? EMPTY_CUSTOMERS;

  const options = useMemo(() => {
    const list = customers.map((customer) => ({
      value: customer.id,
      label: customer.code ? `${customer.name} · ${customer.code}` : customer.name,
    }));

    if (customerId && !list.some((option) => option.value === customerId)) {
      list.unshift({
        value: customerId,
        label: customerName || "Selected customer",
      });
    }

    return list;
  }, [customers, customerId, customerName]);

  useEffect(() => {
    if (!customers.length) return;

    if (customerId) {
      const selected = customers.find((customer) => customer.id === customerId);
      if (selected && selected.name !== values.customerName) {
        void setFieldValue("customerName", selected.name, false);
      }
      return;
    }

    if (!customerName) return;

    const matched = customers.find(
      (customer) => customer.name.toLowerCase() === customerName.toLowerCase(),
    );
    if (matched) {
      void setFieldValue("customerId", matched.id, true);
      void setFieldTouched("customerId", true, false);
    }
  }, [customers, customerId, customerName, setFieldTouched, setFieldValue, values.customerName]);

  const applyCustomer = (customer: Customer) => {
    const id = String(customer.id ?? "");
    if (!id) return;

    void setFieldValue("customerId", id, true);
    void setFieldValue("customerName", customer.name, false);
    void setFieldTouched("customerId", true, false);
    onSelect?.(customer);
    setBrowseOpen(false);
    setEditing(false);
  };

  const handleChange = (value: string) => {
    if (!value) {
      void setFieldValue("customerId", "", true);
      void setFieldValue("customerName", "", false);
      void setFieldTouched("customerId", true, false);
      setEditing(true);
      return;
    }

    const selected = customers.find((customer) => customer.id === value);
    if (selected) {
      applyCustomer(selected);
      return;
    }

    void setFieldValue("customerId", value, true);
    void setFieldTouched("customerId", true, false);
  };

  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const profileName = selectedCustomer?.name || customerName;
  const showProfile = variant === "profile" && Boolean(customerId && profileName) && !editing;

  const searchControl = (
    <div className={cn("flex min-w-0", variant === "profile" && "overflow-hidden rounded-md")}>
      <div
        className={cn(
          "min-w-0 flex-1",
          error && "[&_button]:border-destructive",
          variant === "profile" &&
            "[&_button]:rounded-none [&_button]:rounded-l-md [&_button]:shadow-none",
        )}
      >
        <SearchableSelect
          id="customerId"
          options={options}
          value={customerId}
          disabled={disabled}
          clearable
          placeholder="Search by name or customer number"
          searchPlaceholder="Search customers..."
          onChange={handleChange}
          onCreateNew={() => setBrowseOpen(true)}
          createNewLabel={(query) => `Register or browse for “${query}”`}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        className={cn(
          "h-9 shrink-0",
          variant === "profile" && "rounded-l-none border-l-0 shadow-none",
        )}
        leftIcon={<Users className="h-4 w-4" />}
        onClick={() => setBrowseOpen(true)}
      >
        Browse
      </Button>
    </div>
  );

  return (
    <>
      <FormField
        id="customerId"
        label={label}
        required={required}
        error={error}
        hint={!error ? hint : undefined}
      >
        {showProfile ? (
          <div
            className={cn(
              "flex items-center gap-3 rounded-md border border-input bg-card px-3 py-2 shadow-xs",
              error && "border-destructive",
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tracking-wide text-foreground">
              {initialsFor(profileName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground" title={profileName}>
                {profileName}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {[selectedCustomer?.code, selectedCustomer?.email].filter(Boolean).join(" · ") ||
                  "Selected customer"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              className="h-8 shrink-0"
              onClick={() => setEditing(true)}
            >
              Change
            </Button>
          </div>
        ) : (
          searchControl
        )}
      </FormField>

      <CustomerSelectorModal
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        onSelect={applyCustomer}
      />
    </>
  );
}
