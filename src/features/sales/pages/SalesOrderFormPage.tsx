import { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import {
  FormikForm,
  FormikInput,
  FormikSelect,
  FormikTextarea,
} from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CustomerPickerField } from "@/features/shared/components/CustomerPickerField";
import { ProductSelectorModal } from "@/features/shared/components/ProductSelectorModal";
import { QuotationConfigureProductModal } from "@/features/sales/components/QuotationConfigureProductModal";
import { QuotationCustomizeModal } from "@/features/sales/components/QuotationCustomizeModal";
import { QuotationLineItemsTable } from "@/features/sales/components/QuotationLineItemsTable";
import { SalesFormSection } from "@/features/sales/components/SalesFormSection";
import { SalesOrderFormPreview } from "@/features/sales/components/SalesOrderFormPreview";
import {
  salesOrderFormSchema,
  type SalesOrderFormValues,
} from "@/features/sales/schemas/salesOrderSchema";
import type { QuotationLineItemFormValues } from "@/features/sales/schemas/quotationSchema";
import {
  useCreateSalesOrder,
  useSalesOrder,
  useUpdateSalesOrder,
} from "@/features/sales/hooks/useSalesOrders";
import { useQuotation } from "@/features/sales/hooks/useQuotations";
import { COUNTRY_OPTIONS, DEFAULT_COUNTRY } from "@/lib/countries";
import { getCurrentVersion, getVersionById } from "@/lib/productVersion";
import {
  orderNeedsManufacturing,
  productNeedsManufacturing,
} from "@/lib/productManufacturing";
import { productService } from "@/services";
import type { Customer } from "@/types/customer";
import type { Product } from "@/types/product";
import type { QuotationProductCustomization } from "@/types/quotation";
import { Priority, type PriorityValue } from "@/types/status";

const PRIORITY_OPTIONS = Object.keys(Priority).map((value) => ({
  value,
  label: Priority[value as PriorityValue].label,
}));

const EMPTY_ADDRESS = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: DEFAULT_COUNTRY,
};

function ManufacturingFromLinesSync() {
  const { values, setFieldValue } = useFormikContext<SalesOrderFormValues>();
  const needsManufacturing = orderNeedsManufacturing(values.lineItems);

  useEffect(() => {
    if (values.requiresManufacturing === needsManufacturing) return;
    void setFieldValue("requiresManufacturing", needsManufacturing, false);
  }, [needsManufacturing, setFieldValue, values.requiresManufacturing]);

  return null;
}

function applyCustomerAddress(customer: Customer) {
  const billingActive =
    customer.billingAddresses?.[customer.activeBillingAddressIndex] ??
    customer.billingAddresses?.[0];
  const deliveryActive = customer.deliverySameAsBilling
    ? billingActive
    : customer.shippingAddresses?.[customer.activeShippingAddressIndex ?? 0] ??
      billingActive;

  return {
    ...deliveryActive,
    country: deliveryActive?.country || DEFAULT_COUNTRY,
  };
}

type FormLineSource = {
  productId: string;
  productSku: string;
  productName: string;
  description?: string;
  productVersionId?: string;
  productVersionLabel?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  isCustomized?: boolean;
  customization?: SalesOrderFormValues["lineItems"][number]["customization"];
  requiresManufacturing?: boolean;
};

function toFormLineItem(item: FormLineSource): SalesOrderFormValues["lineItems"][number] {
  return {
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
    requiresManufacturing: item.requiresManufacturing,
  };
}

function withLineFulfillment(
  line: QuotationLineItemFormValues,
  product: Product | null,
): SalesOrderFormValues["lineItems"][number] {
  const version = product
    ? (line.productVersionId
        ? getVersionById(product, line.productVersionId)
        : undefined) ??
      (product.versions.length ? getCurrentVersion(product) : undefined)
    : undefined;

  return {
    ...line,
    requiresManufacturing:
      Boolean(line.isCustomized) ||
      (product ? productNeedsManufacturing(product, version) : true),
  };
}

function manufacturingHint(lineItems: SalesOrderFormValues["lineItems"]) {
  if (lineItems.length === 0) {
    return "Follows the products you add";
  }
  if (orderNeedsManufacturing(lineItems)) {
    return "At least one product needs production";
  }
  return "All products can ship as existing stock";
}

export function SalesOrderFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const customerIdParam = searchParams.get("customerId");
  const quotationIdParam = searchParams.get("quotationId");

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
        lineItems: order.lineItems.map(toFormLineItem),
        discountAmount: order.discountAmount,
        notes: order.notes ?? "",
        requiresManufacturing: orderNeedsManufacturing(order.lineItems),
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
        lineItems: fromQuotation.lineItems.map(toFormLineItem),
        discountAmount: fromQuotation.discountAmount,
        notes: fromQuotation.notes ?? "",
        requiresManufacturing: orderNeedsManufacturing(fromQuotation.lineItems),
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
      requiresManufacturing: false,
      deliveryAddress: { ...EMPTY_ADDRESS },
    };
  }, [order, fromQuotation, customerIdParam, quotationIdParam]);

  const busy = createOrder.isPending || updateOrder.isPending;

  const handleSubmit = async (values: SalesOrderFormValues) => {
    const payload = {
      customerId: values.customerId,
      quotationId: values.quotationId,
      quotationNumber: fromQuotation?.quotationNumber ?? order?.quotationNumber,
      lineItems: values.lineItems,
      priority: values.priority,
      requestedDeliveryDate: values.requestedDeliveryDate,
      notes: values.notes,
      discountAmount: values.discountAmount,
    };

    if (isEdit && id) {
      await updateOrder.mutateAsync({ id, data: payload });
      toast.success(
        values.quotationId
          ? "Sales order saved. Quotation BOM estimation is ready for costing approval."
          : "Sales order saved. Product BOM estimation is ready for costing approval.",
      );
      navigate(ROUTES.costing.forOrder(id));
    } else {
      const created = await createOrder.mutateAsync(payload);
      toast.success(
        created.quotationNumber
          ? `Sales order created from ${created.quotationNumber}. BOM estimation sent for costing approval.`
          : "Direct sales order created. Product BOM estimation sent for costing approval.",
      );
      navigate(ROUTES.costing.forOrder(created.id));
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
          {(formik) => {
            const appendOrReplaceLine = (line: QuotationLineItemFormValues) => {
              const nextLine = withLineFulfillment(line, selectedProduct);
              if (editingLineIndex !== null) {
                const next = [...formik.values.lineItems];
                next[editingLineIndex] = {
                  ...next[editingLineIndex],
                  ...nextLine,
                };
                void formik.setFieldValue("lineItems", next);
                setEditingLineIndex(null);
                return;
              }
              void formik.setFieldValue("lineItems", [...formik.values.lineItems, nextLine]);
            };

            const openCustomizeForLine = async (index: number) => {
              const line = formik.values.lineItems[index];
              if (!line) return;
              try {
                const product = await productService.getById(line.productId);
                setSelectedProduct(product);
                setConfigureVersionId(line.productVersionId || product.currentVersionId);
                setConfigureQuantity(line.quantity);
                setConfigureUnitPrice(line.unitPrice);
                setExistingCustomization(
                  (line.customization as QuotationProductCustomization | undefined) ?? null,
                );
                setEditingLineIndex(index);
                setCustomizeOpen(true);
              } catch {
                toast.error("This product is no longer in the catalog.");
              }
            };

            return (
            <>
              <ManufacturingFromLinesSync />
              <PageHeader
                title={isEdit ? "Edit Sales Order" : "Add / Configure Sales Order"}
                description={
                  fromQuotation
                    ? `From quotation ${fromQuotation.quotationNumber}. Quoted products carry into costing.`
                    : "Select a customer, add products, then send the order for costing."
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
                        Back
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
                      Save and send to costing
                    </Button>
                  </div>
                }
              />

              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-12">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:col-span-9">
                    <SalesFormSection title="Order Details">
                      <div className="space-y-3">
                        <CustomerPickerField
                          variant="profile"
                          onSelect={(customer: Customer) => {
                            void formik.setFieldValue(
                              "deliveryAddress",
                              applyCustomerAddress(customer),
                            );
                          }}
                        />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <FormikInput
                            name="requestedDeliveryDate"
                            label="Requested Delivery"
                            type="date"
                          />
                          <FormikSelect
                            name="priority"
                            label="Priority"
                            options={PRIORITY_OPTIONS}
                            required
                            hint="Used for delivery when this order is shipped."
                          />
                          <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <span className="text-xs font-medium leading-none text-foreground">
                              Manufacturing
                            </span>
                            <div className="flex min-h-9 items-center gap-2 rounded-md border border-input bg-card px-3 py-1.5 shadow-xs">
                              <StatusBadge
                                variant={
                                  orderNeedsManufacturing(formik.values.lineItems)
                                    ? "warning"
                                    : "success"
                                }
                                size="sm"
                              >
                                {orderNeedsManufacturing(formik.values.lineItems)
                                  ? "Required"
                                  : "Not required"}
                              </StatusBadge>
                              <span className="text-[11px] text-muted-foreground">
                                {manufacturingHint(formik.values.lineItems)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SalesFormSection>
                    <div className="space-y-3">
                      <SalesFormSection title="Delivery Address" description="Ship-to location for this order.">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <FormikInput
                            name="deliveryAddress.line1"
                            label="Address Line 1"
                            required
                            className="sm:col-span-2"
                          />
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
                      <SalesFormSection title="Notes">
                        <FormikTextarea name="notes" label="Internal Notes" rows={5} />
                      </SalesFormSection>
                    </div>
                  </div>
                  <div className="xl:col-span-3 xl:sticky xl:top-[72px] xl:self-start">
                    <SalesOrderFormPreview />
                  </div>
                </div>
                <QuotationLineItemsTable
                  title="Line Items"
                  description="Add as standard or customize specs, BOM, and operations for this order without changing the master product."
                  emptyHint="Add products to set quantities, prices, and whether they ship as existing stock or need manufacturing. Use Customize for customer-specific configurations."
                  showFulfillment
                  onAddProduct={() => setProductModalOpen(true)}
                  onCustomizeLine={(index) => {
                    void openCustomizeForLine(index);
                  }}
                />
              </div>

              <ProductSelectorModal
                open={productModalOpen}
                onClose={() => setProductModalOpen(false)}
                customerId={formik.values.customerId}
                customerName={formik.values.customerName}
                showManufacturing
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
                documentLabel="sales order"
                onClose={() => {
                  setConfigureOpen(false);
                  setSelectedProduct(null);
                }}
                onAddStandard={(line) => {
                  appendOrReplaceLine(line);
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
                documentLabel="sales order"
                existingCustomization={existingCustomization}
                onClose={() => {
                  setCustomizeOpen(false);
                  setExistingCustomization(null);
                  if (editingLineIndex === null) {
                    setSelectedProduct(null);
                  }
                }}
                onSave={(line) => {
                  appendOrReplaceLine(line);
                  setCustomizeOpen(false);
                  setExistingCustomization(null);
                  setSelectedProduct(null);
                }}
              />
            </>
            );
          }}
        </FormikForm>
      </PageContent>
    </PageContainer>
  );
}
