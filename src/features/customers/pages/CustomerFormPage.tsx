import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useFormikContext, type FormikProps, type FormikTouched } from "formik";
import { CustomerAddressManager } from "@/features/customers/components/CustomerAddressManager";
import {
  isAddressDraft,
  resolveActiveSavedIndex,
} from "@/features/customers/utils/customerAddressUtils";
import { ArrowLeft, Save } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { toast } from "@/components/feedback/toast";
import {
  FormikForm,
  FormikCheckbox,
  FormikInput,
  FormikSelect,
  FormikTextarea,
} from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { CustomerFormPreview } from "@/features/customers/components/CustomerFormPreview";
import {
  customerFormSchema,
  type CustomerFormValues,
} from "@/features/customers/schemas/customerSchema";
import {
  useCreateCustomer,
  useCustomer,
  useCustomers,
  useUpdateCustomer,
} from "@/features/customers/hooks/useCustomers";
import { CUSTOMER_TYPE_OPTIONS } from "@/features/shared/components/CustomerSelectorModal";
import { suggestCustomerCode } from "@/lib/customerCode";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { cn } from "@/lib/utils";
import type { CustomerFormData } from "@/services";

type CustomerSaveAction = "draft" | "close" | "estimate";

function firstFormError(errors: unknown): string | null {
  if (!errors) return null;
  if (typeof errors === "string") return errors;
  if (Array.isArray(errors)) {
    for (const item of errors) {
      const found = firstFormError(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof errors === "object") {
    for (const value of Object.values(errors as Record<string, unknown>)) {
      const found = firstFormError(value);
      if (found) return found;
    }
  }
  return null;
}

function withoutDraftAddresses(values: CustomerFormValues): CustomerFormValues {
  const billingAddresses = values.billingAddresses.filter((address) => !isAddressDraft(address));
  const shippingAddresses = (values.shippingAddresses ?? []).filter(
    (address) => !isAddressDraft(address),
  );
  return {
    ...values,
    billingAddresses,
    activeBillingAddressIndex: Math.min(
      values.activeBillingAddressIndex ?? 0,
      Math.max(billingAddresses.length - 1, 0),
    ),
    shippingAddresses,
    activeShippingAddressIndex: Math.min(
      values.activeShippingAddressIndex ?? 0,
      Math.max(shippingAddresses.length - 1, 0),
    ),
  };
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "notes", label: "Notes" },
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

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
  billingAddresses: [],
  activeBillingAddressIndex: 0,
  deliverySameAsBilling: true,
  shippingAddresses: [],
  activeShippingAddressIndex: 0,
  taxId: "",
  creditLimit: 0,
  paymentTermsDays: 30,
  notes: "",
  status: "active",
};

function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-md border border-border bg-card p-3", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function toFormData(values: CustomerFormValues): CustomerFormData {
  const shippingAddresses = values.shippingAddresses;

  const contactPerson = values.contactSameAsName
    ? {
        name: values.name,
        title: values.contactPerson.title,
        email: values.email,
        phone: values.phone,
        isPrimary: true,
      }
    : values.contactPerson;

  const savedBilling = values.billingAddresses.filter((a) => !isAddressDraft(a));
  const billingActiveIndex = resolveActiveSavedIndex(
    values.billingAddresses,
    values.activeBillingAddressIndex ?? 0,
  );
  const savedShipping = (shippingAddresses ?? []).filter((a) => !isAddressDraft(a));
  const shippingActiveIndex = resolveActiveSavedIndex(
    shippingAddresses ?? [],
    values.activeShippingAddressIndex ?? 0,
  );

  return {
    code: values.code,
    name: values.name,
    type: values.type,
    email: values.email,
    phone: values.phone,
    billingAddresses: savedBilling,
    activeBillingAddressIndex: billingActiveIndex,
    deliverySameAsBilling: values.deliverySameAsBilling,
    shippingAddresses: savedShipping.length > 0 ? savedShipping : undefined,
    activeShippingAddressIndex: values.deliverySameAsBilling ? undefined : shippingActiveIndex,
    contactPersons: [contactPerson],
    taxId: values.taxId || undefined,
    creditLimit: values.creditLimit,
    paymentTermsDays: values.paymentTermsDays,
    notes: values.notes,
    status: values.status,
  };
}

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

function CustomerCodeSync({
  existingCodes,
  autoCodeRef,
}: {
  existingCodes: string[];
  autoCodeRef: MutableRefObject<boolean>;
}) {
  const { values, setFieldValue } = useFormikContext<CustomerFormValues>();

  useEffect(() => {
    if (!autoCodeRef.current) return;
    const next = suggestCustomerCode(existingCodes);
    if (values.code === next) return;
    void setFieldValue("code", next, false);
  }, [autoCodeRef, existingCodes, setFieldValue, values.code]);

  return null;
}

function CustomerInfoSection({ isCreate }: { isCreate: boolean }) {
  return (
    <SectionCard title="Customer Info" description="Identity and primary contact details.">
      <div className="grid gap-2 sm:grid-cols-2">
        <FormikInput
          name="code"
          label="Customer Number"
          required
          readOnly={isCreate}
          hint={
            isCreate
              ? "Auto-generated. Assigned when you create the customer."
              : undefined
          }
        />
        <FormikSelect name="type" label="Customer Type" options={CUSTOMER_TYPE_OPTIONS} required />
        <FormikInput name="name" label="Customer Name" required className="sm:col-span-2" />
        <FormikInput name="email" label="Email" type="email" required />
        <FormikInput name="phone" label="Phone" type="tel" required />
        <FormikSelect name="status" label="Status" options={STATUS_OPTIONS} required />
      </div>
    </SectionCard>
  );
}

function ContactPersonSection() {
  const { values } = useFormikContext<CustomerFormValues>();
  const locked = Boolean(values.contactSameAsName);

  return (
    <SectionCard title="Contact Person" description="Primary person for this account.">
      <div className="mb-2">
        <FormikCheckbox name="contactSameAsName" label="Same as customer name" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <FormikInput name="contactPerson.name" label="Contact Name" required disabled={locked} />
        <FormikInput name="contactPerson.title" label="Title" />
        <FormikInput
          name="contactPerson.email"
          label="Contact Email"
          type="email"
          required
          disabled={locked}
        />
        <FormikInput
          name="contactPerson.phone"
          label="Contact Phone"
          type="tel"
          required
          disabled={locked}
        />
      </div>
    </SectionCard>
  );
}


function TaxCreditSection() {
  return (
    <SectionCard title="Tax / Business" description="Credit terms and tax identifiers.">
      <div className="grid gap-2 sm:grid-cols-2">
        <FormikInput name="taxId" label="Tax ID / VAT Number" className="sm:col-span-2" />
        <FormikInput name="creditLimit" label="Credit Limit" type="number" min={0} step={0.01} />
        <FormikInput
          name="paymentTermsDays"
          label="Payment Terms (days)"
          type="number"
          min={0}
          required
        />
      </div>
    </SectionCard>
  );
}

function NotesSection() {
  return (
    <SectionCard title="Notes" description="Internal remarks about this customer.">
      <FormikTextarea name="notes" label="Notes" rows={6} />
    </SectionCard>
  );
}

export function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const createAfterSave = searchParams.get("afterSave");
  const [tab, setTab] = useState("overview");
  const [pendingAction, setPendingAction] = useState<CustomerSaveAction>("close");
  const pendingActionRef = useRef<CustomerSaveAction>(pendingAction);
  const setAction = (action: CustomerSaveAction) => {
    pendingActionRef.current = action;
    setPendingAction(action);
  };

  const { data: customer, isLoading, error } = useCustomer(id ?? "");
  const { data: customersList } = useCustomers({ page: 1, pageSize: 200 });
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const autoCodeRef = useRef(!isEdit);

  const existingCodes = useMemo(
    () => (customersList?.items ?? []).map((entry) => entry.code),
    [customersList?.items],
  );

  const initialValues = useMemo<CustomerFormValues>(() => {
    // Keep create initials stable — CustomerCodeSync fills the number when the list loads.
    // Depending on existingCodes here + enableReinitialize wipes typed fields.
    if (!isEdit) {
      return {
        ...defaultValues,
        code: suggestCustomerCode([]),
      };
    }
    if (!customer) return defaultValues;
    const primary =
      customer.contactPersons.find((c) => c.isPrimary) ?? customer.contactPersons[0];

    const normalizedBillingAddresses =
      customer.billingAddresses.length > 0
        ? customer.billingAddresses.map((addr) => ({
            ...addr,
            country: addr.country || DEFAULT_COUNTRY,
          }))
        : [];

    const activeBillingAddressIndex = Math.min(
      Math.max(customer.activeBillingAddressIndex ?? 0, 0),
      normalizedBillingAddresses.length - 1,
    );

    const normalizedShippingAddresses =
      (customer.shippingAddresses?.length ?? 0) > 0
        ? (customer.shippingAddresses ?? []).map((addr) => ({
            ...addr,
            country: addr.country || DEFAULT_COUNTRY,
          }))
        : [];

    const activeShippingAddressIndex = Math.min(
      Math.max(customer.activeShippingAddressIndex ?? 0, 0),
      Math.max(normalizedShippingAddresses.length - 1, 0),
    );

    const deliverySameAsBilling = customer.deliverySameAsBilling;

    return {
      code: customer.code,
      name: customer.name,
      type: customer.type,
      email: customer.email,
      phone: customer.phone,
      contactSameAsName: primary?.name === customer.name,
      contactPerson: {
        name: primary?.name ?? "",
        title: primary?.title ?? "",
        email: primary?.email ?? customer.email,
        phone: primary?.phone ?? customer.phone,
        isPrimary: true,
      },
      billingAddresses: normalizedBillingAddresses,
      activeBillingAddressIndex,
      deliverySameAsBilling,
      shippingAddresses: normalizedShippingAddresses,
      activeShippingAddressIndex,
      taxId: customer.taxId ?? "",
      creditLimit: customer.creditLimit ?? 0,
      paymentTermsDays: customer.paymentTermsDays,
      notes: customer.notes ?? "",
      status: customer.status,
    };
  }, [customer, isEdit]);

  const busy = createCustomer.isPending || updateCustomer.isPending;

  const handleSubmit = async (values: CustomerFormValues) => {
    const payload = toFormData(withoutDraftAddresses(values));
    const action = pendingActionRef.current;
    pendingActionRef.current = "close";
    setPendingAction("close");

    try {
      if (isEdit && id) {
        await updateCustomer.mutateAsync({ id, data: payload });
        toast.success("Customer saved.");
        if (action === "estimate") {
          navigate(`${ROUTES.quotations.new}?customerId=${id}`);
        } else if (action === "draft") {
          navigate(ROUTES.customers.edit(id));
        } else {
          navigate(ROUTES.customers.detail(id));
        }
        return;
      }

      const created = await createCustomer.mutateAsync(payload);
      toast.success("Customer created.");
      if (action === "estimate" || createAfterSave === "estimate") {
        navigate(`${ROUTES.quotations.new}?customerId=${created.id}`);
      } else if (action === "draft") {
        navigate(ROUTES.customers.edit(created.id));
      } else {
        navigate(ROUTES.customers.detail(created.id));
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err && typeof err.message === "string"
          ? err.message
          : "Failed to save customer";
      toast.error(message);
    }
  };

  const runAction = async (
    formik: FormikProps<CustomerFormValues>,
    action: CustomerSaveAction,
  ) => {
    setAction(action);
    const cleaned = withoutDraftAddresses(formik.values);
    await formik.setValues(cleaned, false);
    const errors = await formik.validateForm(cleaned);
    const message = firstFormError(errors);
    if (message) {
      await formik.setTouched(
        {
          code: true,
          name: true,
          email: true,
          phone: true,
          contactPerson: true,
          billingAddresses: true,
          shippingAddresses: true,
          paymentTermsDays: true,
          status: true,
        } as unknown as FormikTouched<CustomerFormValues>,
        true,
      );
      toast.error(message);
      return;
    }
    await formik.submitForm();
  };

  return (
    <PageContainer maxWidth="full" className="!px-2 !py-2 sm:!px-3 lg:!px-4">
      <PageContent
        isLoading={isEdit && isLoading}
        error={error ? "Customer not found." : null}
      >
        <FormikForm<CustomerFormValues>
          initialValues={initialValues}
          validationSchema={customerFormSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {(formik) => {
            const previewProps = {
              customerId: id,
              createQuotationPending: busy && pendingAction === "estimate",
              onCreateQuotation: () => {
                if (isEdit && id) {
                  navigate(`${ROUTES.quotations.new}?customerId=${id}`);
                  return;
                }
                void runAction(formik, "estimate");
              },
              onManageAddresses: () => {
                setTab("overview");
                window.setTimeout(() => {
                  document
                    .getElementById("customer-addresses")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              },
            };

            return (
              <>
              <ContactSyncEffect />
              {!isEdit ? (
                <CustomerCodeSync existingCodes={existingCodes} autoCodeRef={autoCodeRef} />
              ) : null}

              <PageHeader
                title={isEdit ? "Edit / Configure Customer" : "Add / Configure Customer"}
                description="Manage customer information, contacts, addresses, and credit terms."
                className="mb-2"
                breadcrumbs={[
                  { label: "Customers", href: ROUTES.customers.list },
                  { label: "Customer List", href: ROUTES.customers.list },
                ]}
                actions={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link to={ROUTES.customers.list}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
                      >
                        Back to Customers
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Save className="h-3.5 w-3.5" />}
                      loading={busy && pendingAction === "draft"}
                      onClick={() => void runAction(formik, "draft")}
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Save className="h-3.5 w-3.5" />}
                      loading={busy && pendingAction === "close"}
                      onClick={() => void runAction(formik, "close")}
                    >
                      Save & Close
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      loading={busy && pendingAction === "estimate"}
                      onClick={() => void runAction(formik, "estimate")}
                    >
                      Save & Create Quotation
                    </Button>
                  </div>
                }
              />

              <Tabs value={tab} onChange={setTab}>
                <TabList className="gap-0 overflow-x-auto">
                  {TABS.map((item) => (
                    <Tab
                      key={item.id}
                      value={item.id}
                      className="whitespace-nowrap rounded-none px-3 py-2 text-[12px]"
                    >
                      {item.label}
                    </Tab>
                  ))}
                </TabList>

                <TabPanel value="overview" className="pt-3">
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
                    <div className="space-y-3 xl:col-span-9">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <CustomerInfoSection isCreate={!isEdit} />
                        <ContactPersonSection />
                      </div>
                      <CustomerAddressManager />
                      <TaxCreditSection />
                    </div>
                    <div className="xl:col-span-3 xl:sticky xl:top-[72px] xl:self-start">
                      <CustomerFormPreview {...previewProps} />
                    </div>
                  </div>
                </TabPanel>

                <TabPanel value="contact" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <ContactPersonSection />
                    </div>
                    <CustomerFormPreview {...previewProps} />
                  </div>
                </TabPanel>

                <TabPanel value="addresses" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <CustomerAddressManager />
                    </div>
                    <CustomerFormPreview {...previewProps} />
                  </div>
                </TabPanel>

                <TabPanel value="tax" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <TaxCreditSection />
                    </div>
                    <CustomerFormPreview {...previewProps} />
                  </div>
                </TabPanel>

                <TabPanel value="notes" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <NotesSection />
                    </div>
                    <CustomerFormPreview {...previewProps} />
                  </div>
                </TabPanel>
              </Tabs>
              </>
            );
          }}
        </FormikForm>
      </PageContent>
    </PageContainer>
  );
}

export const CreateCustomerPage = CustomerFormPage;
