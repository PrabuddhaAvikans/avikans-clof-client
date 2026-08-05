import { useMemo, useState } from "react";
import { FieldArray, useFormikContext } from "formik";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import {
  FormikForm,
  FormikCheckbox,
  FormikInput,
  FormikSelect,
  FormikTextarea,
} from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { CustomerSelectorModal } from "@/features/shared/components/CustomerSelectorModal";
import { ProductSelectorModal } from "@/features/shared/components/ProductSelectorModal";
import { SalesFormSection } from "@/features/sales/components/SalesFormSection";
import { SalesOrderFormPreview } from "@/features/sales/components/SalesOrderFormPreview";
import { computeQuotationTotals } from "@/features/sales/schemas/quotationSchema";
import {
  salesOrderFormSchema,
  type SalesOrderFormValues,
} from "@/features/sales/schemas/salesOrderSchema";
import {
  useCreateSalesOrder,
  useSalesOrder,
  useUpdateSalesOrder,
} from "@/features/sales/hooks/useSalesOrders";
import { useQuotation } from "@/features/sales/hooks/useQuotations";
import { formatCurrency } from "@/lib/format";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/countries";
import { Priority } from "@/types/status";
import type { Customer } from "@/types/customer";
import type { Product } from "@/types/product";

const PRIORITY_OPTIONS = Object.entries(Priority).map(([value, def]) => ({
  value,
  label: def.label,
}));

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "lines", label: "Line Items" },
  { id: "delivery", label: "Delivery" },
  { id: "notes", label: "Notes" },
] as const;

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: DEFAULT_COUNTRY,
};

function CustomerPicker({ onOpen }: { onOpen: () => void }) {
  const { values, errors } = useFormikContext<SalesOrderFormValues>();
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
  const { values, errors } = useFormikContext<SalesOrderFormValues>();
  const totals = computeQuotationTotals(values.lineItems, values.discountAmount ?? 0);

  return (
    <SalesFormSection
      title="Line Items"
      description="Products and quantities for this sales order."
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
            <table className="w-full min-w-[560px] text-[12px]">
              <thead>
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2">Product</th>
                  <th className="py-1.5 pr-2">Qty</th>
                  <th className="py-1.5 pr-2">Unit Price</th>
                  <th className="py-1.5 pr-2">Disc %</th>
                  <th className="py-1.5 pr-2">Tax %</th>
                  <th className="py-1.5 pr-2">Total</th>
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
                          <p className="font-medium">{item.productName}</p>
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
                        <td className="py-1.5 pr-2 tabular-nums">{formatCurrency(lineTotal, "LKR")}</td>
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
      <div className="mt-3 flex justify-end border-t border-border pt-2 text-[12px] font-semibold">
        <span className="mr-6 text-muted-foreground">Order Total</span>
        <span className="tabular-nums">{formatCurrency(totals.totalAmount, "LKR")}</span>
      </div>
    </SalesFormSection>
  );
}

function DeliverySection() {
  return (
    <SalesFormSection title="Delivery Address" description="Ship-to location for this order.">
      <div className="grid gap-2 sm:grid-cols-2">
        <FormikInput name="deliveryAddress.line1" label="Address Line 1" required className="sm:col-span-2" />
        <FormikInput name="deliveryAddress.line2" label="Address Line 2" className="sm:col-span-2" />
        <FormikInput name="deliveryAddress.city" label="City" required />
        <FormikInput name="deliveryAddress.state" label="State / Province" required />
        <FormikInput name="deliveryAddress.postalCode" label="Postal Code" required />
        <FormikSelect
          name="deliveryAddress.country"
          label="Country"
          options={[...COUNTRY_OPTIONS]}
          required
        />
      </div>
    </SalesFormSection>
  );
}

export function SalesOrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerIdParam = searchParams.get("customerId");
  const quotationIdParam = searchParams.get("quotationId");

  const [tab, setTab] = useState("overview");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);

  const { data: order, isLoading, error } = useSalesOrder(id ?? "");
  const { data: fromQuotation } = useQuotation(quotationIdParam ?? "");
  const createOrder = useCreateSalesOrder();
  const updateOrder = useUpdateSalesOrder();

  const initialValues = useMemo<SalesOrderFormValues>(() => {
    if (order) {
      return {
        customerId: order.customerId,
        customerName: order.customerName,
        quotationId: order.quotationId,
        priority: order.priority,
        requestedDeliveryDate: order.requestedDeliveryDate?.slice(0, 10),
        lineItems: order.lineItems.map((item) => ({
          productId: item.productId,
          productSku: item.productSku,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
        })),
        discountAmount: order.discountAmount,
        notes: order.notes ?? "",
        requiresManufacturing: order.manufacturingJobIds.length > 0,
        deliveryAddress: {
          ...(order.shippingAddress ?? order.billingAddress),
          country:
            (order.shippingAddress ?? order.billingAddress)?.country || DEFAULT_COUNTRY,
        },
      };
    }
    if (fromQuotation) {
      return {
        customerId: fromQuotation.customerId,
        customerName: fromQuotation.customerName,
        quotationId: fromQuotation.id,
        priority: fromQuotation.priority,
        lineItems: fromQuotation.lineItems.map((item) => ({
          productId: item.productId,
          productSku: item.productSku,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent,
          taxPercent: item.taxPercent,
        })),
        discountAmount: fromQuotation.discountAmount,
        notes: fromQuotation.notes ?? "",
        requiresManufacturing: true,
        deliveryAddress: {
          ...(fromQuotation.shippingAddress ?? fromQuotation.billingAddress),
          country:
            (fromQuotation.shippingAddress ?? fromQuotation.billingAddress)?.country ||
            DEFAULT_COUNTRY,
        },
      };
    }
    return {
      customerId: customerIdParam ?? "",
      customerName: "",
      quotationId: quotationIdParam ?? undefined,
      priority: "medium",
      lineItems: [],
      discountAmount: 0,
      notes: "",
      requiresManufacturing: true,
      deliveryAddress: { ...EMPTY_ADDRESS },
    };
  }, [order, fromQuotation, customerIdParam, quotationIdParam]);

  const busy = createOrder.isPending || updateOrder.isPending;

  const handleSubmit = async (values: SalesOrderFormValues) => {
    const payload = {
      customerId: values.customerId,
      quotationId: values.quotationId,
      lineItems: values.lineItems,
      priority: values.priority,
      requestedDeliveryDate: values.requestedDeliveryDate,
      notes: values.notes,
      discountAmount: values.discountAmount,
    };

    if (isEdit && id) {
      await updateOrder.mutateAsync({ id, data: payload });
      navigate(ROUTES.salesOrders.review(id));
    } else {
      const created = await createOrder.mutateAsync(payload);
      navigate(ROUTES.salesOrders.review(created.id));
    }
  };

  return (
    <PageContainer maxWidth="full" className="!px-2 !py-2 sm:!px-3 lg:!px-4">
      <PageContent
        isLoading={(isEdit && isLoading) || Boolean(quotationIdParam && !fromQuotation && !order)}
        error={error ? "Order not found." : null}
      >
        <FormikForm<SalesOrderFormValues>
          initialValues={initialValues}
          validationSchema={salesOrderFormSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {(formik) => (
            <>
              <PageHeader
                title={isEdit ? "Edit Sales Order" : "Add / Configure Sales Order"}
                description={
                  fromQuotation
                    ? `From quotation ${fromQuotation.quotationNumber}`
                    : "Create a sales order with lines, delivery, and manufacturing flags."
                }
                className="mb-2"
                breadcrumbs={[
                  { label: "Sales", href: ROUTES.salesOrders.list },
                  { label: "Sales Orders", href: ROUTES.salesOrders.list },
                  { label: isEdit ? "Edit Sales Order" : "Add / Configure Sales Order" },
                ]}
                actions={
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link to={ROUTES.salesOrders.list}>
                      <Button type="button" variant="outline" size="sm" leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}>
                        Back to Sales Orders
                      </Button>
                    </Link>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      leftIcon={<Save className="h-3.5 w-3.5" />}
                      loading={busy}
                    >
                      Save Draft
                    </Button>
                    <Button type="submit" variant="primary" size="sm" loading={busy}>
                      Continue to Review
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
                        <SalesFormSection title="Order Details">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                              <CustomerPicker onOpen={() => setCustomerModalOpen(true)} />
                            </div>
                            <FormikSelect name="priority" label="Priority" options={PRIORITY_OPTIONS} required />
                            <FormikInput name="requestedDeliveryDate" label="Requested Delivery" type="date" />
                            <div className="sm:col-span-2">
                              <FormikCheckbox name="requiresManufacturing" label="Requires Manufacturing" />
                            </div>
                            <FormikInput name="discountAmount" label="Header Discount" type="number" min={0} step={0.01} />
                          </div>
                        </SalesFormSection>
                        <LineItemsSection onAddProduct={() => setProductModalOpen(true)} />
                      </div>
                      <div className="space-y-3">
                        <DeliverySection />
                        <SalesFormSection title="Notes">
                          <FormikTextarea name="notes" label="Internal Notes" rows={5} />
                        </SalesFormSection>
                      </div>
                    </div>
                    <div className="xl:col-span-3 xl:sticky xl:top-[72px] xl:self-start">
                      <SalesOrderFormPreview />
                    </div>
                  </div>
                </TabPanel>

                <TabPanel value="lines" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                      <LineItemsSection onAddProduct={() => setProductModalOpen(true)} />
                    </div>
                    <SalesOrderFormPreview />
                  </div>
                </TabPanel>

                <TabPanel value="delivery" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="space-y-3 lg:col-span-2">
                      <SalesFormSection title="Schedule">
                        <FormikInput name="requestedDeliveryDate" label="Requested Delivery Date" type="date" />
                      </SalesFormSection>
                      <DeliverySection />
                    </div>
                    <SalesOrderFormPreview />
                  </div>
                </TabPanel>

                <TabPanel value="notes" className="pt-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <SalesFormSection title="Notes" className="lg:col-span-2">
                      <FormikTextarea name="notes" label="Internal Notes" rows={8} />
                    </SalesFormSection>
                    <SalesOrderFormPreview />
                  </div>
                </TabPanel>
              </Tabs>

              <CustomerSelectorModal
                open={customerModalOpen}
                onClose={() => setCustomerModalOpen(false)}
                onSelect={(customer: Customer) => {
                  void formik.setFieldValue("customerId", customer.id);
                  void formik.setFieldValue("customerName", customer.name);
                  const address = customer.shippingAddress ?? customer.billingAddress;
                  void formik.setFieldValue("deliveryAddress", {
                    ...address,
                    country: address.country || DEFAULT_COUNTRY,
                  });
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
    </PageContainer>
  );
}
