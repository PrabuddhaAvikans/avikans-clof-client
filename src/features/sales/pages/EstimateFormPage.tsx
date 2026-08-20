import { useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  Save,
  Send,
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
import { QuotationConfigureProductModal } from "@/features/sales/components/QuotationConfigureProductModal";
import { QuotationCustomizeModal } from "@/features/sales/components/QuotationCustomizeModal";
import { QuotationFormPreview } from "@/features/sales/components/QuotationFormPreview";
import { QuotationLineItemsTable } from "@/features/sales/components/QuotationLineItemsTable";
import { QuotationTotalsSummary } from "@/features/sales/components/QuotationTotalsSummary";
import { SalesFormSection } from "@/features/sales/components/SalesFormSection";
import { SendQuotationModal } from "@/features/sales/components/SendQuotationModal";
import {
  computeQuotationTotals,
  quotationFormSchema,
  type QuotationFormValues,
  type QuotationLineItemFormValues,
} from "@/features/sales/schemas/quotationSchema";
import {
  useCreateQuotation,
  useQuotation,
  useUpdateQuotation,
} from "@/features/sales/hooks/useQuotations";
import { productService } from "@/services";
import type { Customer } from "@/types/customer";
import type { Product } from "@/types/product";
import type { Quotation, QuotationProductCustomization } from "@/types/quotation";
import { Priority } from "@/types/status";

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

function TotalsCard() {
  const { values } = useFormikContext<QuotationFormValues>();
  const totals = computeQuotationTotals(values.lineItems, values.discountAmount ?? 0);
  return (
    <SalesFormSection title="Order Summary">
      <QuotationTotalsSummary totals={totals} compact />
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
  const [configureOpen, setConfigureOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [configureVersionId, setConfigureVersionId] = useState("");
  const [configureQuantity, setConfigureQuantity] = useState(1);
  const [configureUnitPrice, setConfigureUnitPrice] = useState(0);
  const [editingLineIndex, setEditingLineIndex] = useState<number | null>(null);
  const [existingCustomization, setExistingCustomization] =
    useState<QuotationProductCustomization | null>(null);
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
          productVersionId: item.productVersionId,
          productVersionLabel: item.productVersionLabel,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
          isCustomized: item.isCustomized,
          customization: item.customization,
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

  const appendOrReplaceLine = (
    formik: { values: QuotationFormValues; setFieldValue: (field: string, value: unknown) => unknown },
    line: QuotationLineItemFormValues,
  ) => {
    if (editingLineIndex !== null) {
      const next = [...formik.values.lineItems];
      next[editingLineIndex] = {
        ...next[editingLineIndex],
        ...line,
      };
      void formik.setFieldValue("lineItems", next);
      setEditingLineIndex(null);
      return;
    }
    void formik.setFieldValue("lineItems", [...formik.values.lineItems, line]);
  };

  const openCustomizeForLine = async (
    formik: { values: QuotationFormValues },
    index: number,
  ) => {
    const line = formik.values.lineItems[index];
    if (!line) return;
    try {
      const product = await productService.getById(line.productId);
      setSelectedProduct(product);
      setConfigureVersionId(
        line.productVersionId || product.currentVersionId,
      );
      setConfigureQuantity(line.quantity);
      setConfigureUnitPrice(line.unitPrice);
      setExistingCustomization(
        (line.customization as QuotationProductCustomization | undefined) ?? null,
      );
      setEditingLineIndex(index);
      setCustomizeOpen(true);
    } catch {
      // Product may have been removed from catalog — ignore
    }
  };

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
                        <QuotationLineItemsTable
                          onAddProduct={() => setProductModalOpen(true)}
                          onCustomizeLine={(index) => {
                            void openCustomizeForLine(formik, index);
                          }}
                        />
                      </div>
                      <div className="space-y-3">
                        <SalesFormSection title="Commercial Terms">
                          <FormikInput
                            name="discountAmount"
                            label="Additional Discount (LKR)"
                            type="number"
                            min={0}
                            step={0.01}
                            hint="Applied to the whole quotation after line discounts. Tax is recalculated accordingly."
                          />
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
                      <QuotationLineItemsTable
                        onAddProduct={() => setProductModalOpen(true)}
                        onCustomizeLine={(index) => {
                          void openCustomizeForLine(formik, index);
                        }}
                      />
                    </div>
                    <QuotationFormPreview />
                  </div>
                </TabPanel>

                <TabPanel value="pricing" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="space-y-3 lg:col-span-2">
                      <SalesFormSection title="Pricing & Commercial Terms">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <FormikInput
                            name="discountAmount"
                            label="Additional Discount (LKR)"
                            type="number"
                            min={0}
                            step={0.01}
                            hint="Applied to the whole quotation after line discounts."
                          />
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
                  setSelectedProduct(product);
                  setEditingLineIndex(null);
                  setExistingCustomization(null);
                  setProductModalOpen(false);
                  setConfigureOpen(true);
                }}
              />
              <QuotationConfigureProductModal
                open={configureOpen}
                product={selectedProduct}
                onClose={() => {
                  setConfigureOpen(false);
                  setSelectedProduct(null);
                }}
                onAddStandard={(line) => {
                  appendOrReplaceLine(formik, line);
                  setConfigureOpen(false);
                  setSelectedProduct(null);
                }}
                onCustomize={({ product, versionId, quantity, unitPrice }) => {
                  setSelectedProduct(product);
                  setConfigureVersionId(versionId);
                  setConfigureQuantity(quantity);
                  setConfigureUnitPrice(unitPrice);
                  setExistingCustomization(null);
                  setConfigureOpen(false);
                  setCustomizeOpen(true);
                }}
              />
              <QuotationCustomizeModal
                open={customizeOpen}
                product={selectedProduct}
                versionId={configureVersionId}
                quantity={configureQuantity}
                unitPrice={configureUnitPrice}
                existingCustomization={existingCustomization}
                onClose={() => {
                  setCustomizeOpen(false);
                  setExistingCustomization(null);
                  if (editingLineIndex === null) {
                    setSelectedProduct(null);
                  }
                }}
                onSave={(line) => {
                  appendOrReplaceLine(formik, line);
                  setCustomizeOpen(false);
                  setExistingCustomization(null);
                  setSelectedProduct(null);
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
