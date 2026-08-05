import { useMemo, useState } from "react";
import { FieldArray, useFormikContext } from "formik";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  Plus,
  Save,
  Send,
  Trash2,
  UserPlus,
} from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { FormikForm, FormikInput, FormikSelect, FormikTextarea } from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { CustomerSelectorModal } from "@/features/shared/components/CustomerSelectorModal";
import { ProductSelectorModal } from "@/features/shared/components/ProductSelectorModal";
import { QuotationFormPreview } from "@/features/sales/components/QuotationFormPreview";
import { SalesFormSection } from "@/features/sales/components/SalesFormSection";
import { SendQuotationModal } from "@/features/sales/components/SendQuotationModal";
import {
  computeQuotationTotals,
  quotationFormSchema,
  type QuotationFormValues,
} from "@/features/sales/schemas/quotationSchema";
import {
  useCreateQuotation,
  useQuotation,
  useUpdateQuotation,
} from "@/features/sales/hooks/useQuotations";
import { formatCurrency } from "@/lib/format";
import { Priority } from "@/types/status";
import type { Customer } from "@/types/customer";
import type { Product } from "@/types/product";
import type { Quotation } from "@/types/quotation";

const PRIORITY_OPTIONS = Object.entries(Priority).map(([value, def]) => ({
  value,
  label: def.label,
}));

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "lines", label: "Line Items" },
  { id: "pricing", label: "Pricing & Terms" },
  { id: "notes", label: "Notes" },
] as const;

const defaultValues: QuotationFormValues = {
  customerId: "",
  customerName: "",
  quoteDate: new Date().toISOString().slice(0, 10),
  validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  priority: "medium",
  lineItems: [],
  discountAmount: 0,
  notes: "",
  termsAndConditions: "Payment due within 30 days. Prices valid until the date specified.",
};

function CustomerPicker({ onOpen }: { onOpen: () => void }) {
  const { values, errors } = useFormikContext<QuotationFormValues>();
  return (
    <div className="flex items-end gap-1.5">
      <Input
        label="Customer"
        value={values.customerName ?? ""}
        readOnly
        error={typeof errors.customerId === "string" ? errors.customerId : undefined}
        className="flex-1"
        required
      />
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={onOpen} aria-label="Select customer">
        <UserPlus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function LineItemsSection({ onAddProduct }: { onAddProduct: () => void }) {
  const { values, errors } = useFormikContext<QuotationFormValues>();

  return (
    <SalesFormSection
      title="Product Line Items"
      description="Add products, quantities, discounts, and tax."
      action={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-blue-600"
          leftIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={onAddProduct}
        >
          Add Product
        </Button>
      }
    >
      {typeof errors.lineItems === "string" && (
        <p className="mb-2 text-[12px] text-red-600">{errors.lineItems}</p>
      )}
      <FieldArray name="lineItems">
        {({ remove }) => (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2">Product</th>
                  <th className="py-1.5 pr-2">Qty</th>
                  <th className="py-1.5 pr-2">Unit Price</th>
                  <th className="py-1.5 pr-2">Disc %</th>
                  <th className="py-1.5 pr-2">Tax %</th>
                  <th className="py-1.5 pr-2">Line Total</th>
                  <th className="py-1.5" />
                </tr>
              </thead>
              <tbody>
                {values.lineItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      No products added yet.
                    </td>
                  </tr>
                ) : (
                  values.lineItems.map((item, index) => {
                    const lineTotal =
                      item.quantity *
                      item.unitPrice *
                      (1 - item.discountPercent / 100) *
                      (1 + item.taxPercent / 100);
                    return (
                      <tr key={`${item.productId}-${index}`} className="border-b border-border last:border-0">
                        <td className="py-1.5 pr-2">
                          <p className="font-medium text-foreground">{item.productName}</p>
                          <p className="text-[10px] text-muted-foreground">{item.productSku}</p>
                        </td>
                        <td className="py-1.5 pr-2">
                          <FormikInput name={`lineItems.${index}.quantity`} type="number" className="w-20" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <FormikInput name={`lineItems.${index}.unitPrice`} type="number" step="0.01" className="w-28" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <FormikInput name={`lineItems.${index}.discountPercent`} type="number" className="w-16" />
                        </td>
                        <td className="py-1.5 pr-2">
                          <FormikInput name={`lineItems.${index}.taxPercent`} type="number" className="w-16" />
                        </td>
                        <td className="py-1.5 pr-2 tabular-nums">
                          {formatCurrency(lineTotal, "LKR")}
                        </td>
                        <td className="py-1.5">
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => remove(index)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </FieldArray>
    </SalesFormSection>
  );
}

function TotalsCard() {
  const { values } = useFormikContext<QuotationFormValues>();
  const totals = computeQuotationTotals(values.lineItems, values.discountAmount ?? 0);
  return (
    <SalesFormSection title="Totals Summary">
      <dl className="space-y-1.5 text-[12px]">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatCurrency(totals.subtotal, "LKR")}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Discount</dt>
          <dd className="tabular-nums text-red-600">-{formatCurrency(totals.discountAmount, "LKR")}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Tax</dt>
          <dd className="tabular-nums">{formatCurrency(totals.taxAmount, "LKR")}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 text-sm font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatCurrency(totals.totalAmount, "LKR")}</dd>
        </div>
      </dl>
    </SalesFormSection>
  );
}

export function EstimateFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get("customerId");

  const [tab, setTab] = useState("overview");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [pendingSendQuotation, setPendingSendQuotation] = useState<Quotation | null>(null);
  const [pendingAction, setPendingAction] = useState<"draft" | "preview" | "send">("draft");

  const { data: quotation, isLoading, error } = useQuotation(id ?? "");
  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();

  const initialValues = useMemo<QuotationFormValues>(() => {
    if (quotation) {
      return {
        customerId: quotation.customerId,
        customerName: quotation.customerName,
        quoteDate: quotation.createdAt.slice(0, 10),
        validUntil: quotation.validUntil.slice(0, 10),
        priority: quotation.priority,
        lineItems: quotation.lineItems.map((item) => ({
          productId: item.productId,
          productSku: item.productSku,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
        })),
        discountAmount: quotation.discountAmount,
        notes: quotation.notes ?? "",
        termsAndConditions: quotation.termsAndConditions ?? "",
      };
    }
    return {
      ...defaultValues,
      customerId: preselectedCustomerId ?? "",
    };
  }, [quotation, preselectedCustomerId]);

  const busy = createQuotation.isPending || updateQuotation.isPending;

  const handleSubmit = async (values: QuotationFormValues) => {
    const payload = {
      customerId: values.customerId,
      lineItems: values.lineItems,
      validUntil: values.validUntil,
      priority: values.priority,
      notes: values.notes,
      termsAndConditions: values.termsAndConditions,
      discountAmount: values.discountAmount,
    };

    if (isEdit && id) {
      const updated = await updateQuotation.mutateAsync({ id, data: payload });
      if (pendingAction === "send") {
        setPendingSendQuotation(updated);
        setSendModalOpen(true);
        return;
      }
      navigate(
        pendingAction === "preview"
          ? ROUTES.quotations.preview(id)
          : ROUTES.quotations.detail(id),
      );
    } else {
      const created = await createQuotation.mutateAsync(payload);
      if (pendingAction === "send") {
        setPendingSendQuotation(created);
        setSendModalOpen(true);
        return;
      }
      navigate(
        pendingAction === "preview"
          ? ROUTES.quotations.preview(created.id)
          : ROUTES.quotations.edit(created.id),
      );
    }
  };

  return (
    <PageContainer maxWidth="full" className="!px-2 !py-2 sm:!px-3 lg:!px-4">
      <PageContent isLoading={isEdit && isLoading} error={error ? "Quotation not found." : null}>
        <FormikForm<QuotationFormValues>
          initialValues={initialValues}
          validationSchema={quotationFormSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {(formik) => (
            <>
              <PageHeader
                title={isEdit ? "Edit Quotation" : "Add / Configure Quotation"}
                description="Create a quotation with products, pricing, and commercial terms."
                className="mb-2"
                breadcrumbs={[
                  { label: "Sales", href: ROUTES.quotations.list },
                  { label: "Quotations", href: ROUTES.quotations.list },
                  { label: isEdit ? "Edit Quotation" : "Add / Configure Quotation" },
                ]}
                actions={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link to={ROUTES.quotations.list}>
                      <Button type="button" variant="outline" size="sm" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
                        Back to Quotations
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      leftIcon={<Save className="h-3.5 w-3.5" />}
                      loading={busy && pendingAction === "draft"}
                      onClick={() => setPendingAction("draft")}
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="h-3.5 w-3.5" />}
                      loading={busy && pendingAction === "preview"}
                      onClick={() => setPendingAction("preview")}
                    >
                      Preview
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      leftIcon={<Send className="h-3.5 w-3.5" />}
                      onClick={() => setPendingAction("send")}
                    >
                      Send Quotation
                    </Button>
                  </div>
                }
              />

              <Tabs value={tab} onChange={setTab}>
                <TabList className="gap-0 overflow-x-auto">
                  {TABS.map((item) => (
                    <Tab key={item.id} value={item.id} className="whitespace-nowrap rounded-none px-3 py-2 text-[12px]">
                      {item.label}
                    </Tab>
                  ))}
                </TabList>

                <TabPanel value="overview" className="pt-3">
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:col-span-9">
                      <div className="space-y-3">
                        <SalesFormSection title="Quotation Details">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <CustomerPicker onOpen={() => setCustomerModalOpen(true)} />
                            </div>
                            <FormikInput name="quoteDate" label="Quote Date" type="date" required />
                            <FormikInput name="validUntil" label="Valid Until" type="date" required />
                            <FormikSelect name="priority" label="Priority" options={PRIORITY_OPTIONS} required />
                          </div>
                        </SalesFormSection>
                        <LineItemsSection onAddProduct={() => setProductModalOpen(true)} />
                      </div>
                      <div className="space-y-3">
                        <SalesFormSection title="Commercial Terms">
                          <FormikInput name="discountAmount" label="Header Discount" type="number" min={0} step={0.01} />
                          <div className="mt-2">
                            <FormikTextarea name="termsAndConditions" label="Terms & Conditions" rows={5} />
                          </div>
                        </SalesFormSection>
                        <TotalsCard />
                      </div>
                    </div>
                    <div className="xl:col-span-3 xl:sticky xl:top-[72px] xl:self-start">
                      <QuotationFormPreview />
                    </div>
                  </div>
                </TabPanel>

                <TabPanel value="lines" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <LineItemsSection onAddProduct={() => setProductModalOpen(true)} />
                    </div>
                    <QuotationFormPreview />
                  </div>
                </TabPanel>

                <TabPanel value="pricing" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="space-y-3 lg:col-span-2">
                      <SalesFormSection title="Pricing & Terms">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <FormikInput name="discountAmount" label="Header Discount" type="number" min={0} step={0.01} />
                        </div>
                        <div className="mt-2">
                          <FormikTextarea name="termsAndConditions" label="Terms & Conditions" rows={6} />
                        </div>
                      </SalesFormSection>
                      <TotalsCard />
                    </div>
                    <QuotationFormPreview />
                  </div>
                </TabPanel>

                <TabPanel value="notes" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <SalesFormSection title="Internal Notes" className="lg:col-span-2">
                      <FormikTextarea name="notes" label="Notes" rows={8} />
                    </SalesFormSection>
                    <QuotationFormPreview />
                  </div>
                </TabPanel>
              </Tabs>

              <CustomerSelectorModal
                open={customerModalOpen}
                onClose={() => setCustomerModalOpen(false)}
                onSelect={(customer: Customer) => {
                  void formik.setFieldValue("customerId", customer.id);
                  void formik.setFieldValue("customerName", customer.name);
                  setCustomerModalOpen(false);
                }}
              />
              <ProductSelectorModal
                open={productModalOpen}
                onClose={() => setProductModalOpen(false)}
                onSelect={(product: Product) => {
                  void formik.setFieldValue("lineItems", [
                    ...formik.values.lineItems,
                    {
                      productId: product.id,
                      productSku: product.sku,
                      productName: product.name,
                      description: product.description,
                      quantity: 1,
                      unitPrice: product.basePrice,
                      discountPercent: 0,
                      taxPercent: 18,
                    },
                  ]);
                  setProductModalOpen(false);
                }}
              />
            </>
          )}
        </FormikForm>
      </PageContent>

      {pendingSendQuotation && (
        <SendQuotationModal
          open={sendModalOpen}
          onClose={() => {
            setSendModalOpen(false);
            setPendingSendQuotation(null);
          }}
          quotation={pendingSendQuotation}
          onSent={() => navigate(ROUTES.quotations.detail(pendingSendQuotation.id))}
        />
      )}
    </PageContainer>
  );
}
