import { useEffect } from "react";
import { useFormikContext } from "formik";
import { Modal } from "@/components/ui/Modal";
import { FormikForm, DynamicForm, FormActions } from "@/components/forms";
import { customerFormSections } from "@/features/customers/forms/customerFormFields";
import {
  customerFormSchema,
  type CustomerFormValues,
} from "@/features/customers/schemas/customerSchema";
import { useCreateCustomer } from "@/features/customers/hooks/useCustomers";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import type { CustomerFormData } from "@/services";
import type { Customer } from "@/types/customer";

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: DEFAULT_COUNTRY,
};

function ContactSyncEffect() {
  const { values, setFieldValue } = useFormikContext<CustomerFormValues>();

  useEffect(() => {
    if (!values.contactSameAsName) return;
    void setFieldValue("contactPerson.name", values.name);
    void setFieldValue("contactPerson.email", values.email);
    void setFieldValue("contactPerson.phone", values.phone);
  }, [
    values.contactSameAsName,
    values.name,
    values.email,
    values.phone,
    setFieldValue,
  ]);

  return null;
}

function toFormData(values: CustomerFormValues): CustomerFormData {
  const shippingAddress = values.deliverySameAsBilling
    ? values.billingAddress
    : values.shippingAddress ?? values.billingAddress;

  const contactPerson = values.contactSameAsName
    ? {
        name: values.name,
        title: values.contactPerson.title,
        email: values.email,
        phone: values.phone,
        isPrimary: true,
      }
    : values.contactPerson;

  // Preserve selected country from the form.
  return {
    code: values.code,
    name: values.name,
    type: values.type,
    email: values.email,
    phone: values.phone,
    billingAddress: values.billingAddress,
    shippingAddress: shippingAddress ?? undefined,
    contactPersons: [contactPerson],
    taxId: values.taxId || undefined,
    creditLimit: values.creditLimit,
    paymentTermsDays: values.paymentTermsDays,
    notes: values.notes,
    status: values.status,
  };
}

export type RegisterCustomerModalProps = {
  open: boolean;
  onClose: () => void;
  onRegistered: (customer: Customer) => void;
};

const defaultValues: CustomerFormValues = {
  code: "",
  name: "",
  type: "corporate",
  email: "",
  phone: "",
  contactSameAsName: true,
  contactPerson: {
    name: "",
    title: "",
    email: "",
    phone: "",
    isPrimary: true,
  },
  billingAddress: { ...EMPTY_ADDRESS },
  deliverySameAsBilling: true,
  shippingAddress: { ...EMPTY_ADDRESS },
  taxId: "",
  creditLimit: 0,
  paymentTermsDays: 30,
  notes: "",
  status: "active",
};

export function RegisterCustomerModal({
  open,
  onClose,
  onRegistered,
}: RegisterCustomerModalProps) {
  const createCustomer = useCreateCustomer();

  const handleSubmit = async (values: CustomerFormValues) => {
    const payload = toFormData(values);
    const created = await createCustomer.mutateAsync(payload);
    onRegistered(created);
  };

  return (
    <Modal open={open} onClose={onClose} title="Register Customer" size="lg">
      <div className="space-y-4">
        <p className="text-[12px] text-muted-foreground">
          Create a new customer without leaving the current flow.
        </p>

        <FormikForm<CustomerFormValues>
          initialValues={defaultValues}
          validationSchema={customerFormSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {(formik) => (
            <>
              <ContactSyncEffect />
              <div className="max-h-[70vh] overflow-auto pr-1">
                <DynamicForm sections={customerFormSections} />
              </div>

              <FormActions
                cancelLabel="Cancel"
                onCancel={() => {
                  formik.resetForm();
                  onClose();
                }}
                submitLabel="Create Customer"
                secondaryActions={null}
                className="bg-card"
              />
            </>
          )}
        </FormikForm>
      </div>
    </Modal>
  );
}

