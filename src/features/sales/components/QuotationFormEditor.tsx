import { useState } from "react";
import { useFormikContext } from "formik";
import { UserPlus } from "lucide-react";
import { FormikInput, FormikSelect, FormikTextarea } from "@/components/forms";
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
import {
  computeQuotationTotals,
  type QuotationFormValues,
  type QuotationLineItemFormValues,
} from "@/features/sales/schemas/quotationSchema";
import { productService } from "@/services";
import type { Customer } from "@/types/customer";
import type { Product } from "@/types/product";
import type { QuotationProductCustomization } from "@/types/quotation";
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-9"
        onClick={onOpen}
        aria-label="Select customer"
      >
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

export type QuotationFormEditorProps = {
  /** page = full layout with sticky preview; modal = denser layout for Duplicate modal */
  variant?: "page" | "modal";
  /** Hide preview quick-action stubs (e.g. inside Duplicate modal). */
  showQuickActions?: boolean;
};

export function QuotationFormEditor({
  variant = "page",
  showQuickActions = true,
}: QuotationFormEditorProps) {
  const formik = useFormikContext<QuotationFormValues>();
  const isModal = variant === "modal";

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

  const appendOrReplaceLine = (line: QuotationLineItemFormValues) => {
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
      // Product may have been removed from catalog - ignore
    }
  };

  const preview = (
    <QuotationFormPreview showQuickActions={showQuickActions && !isModal} />
  );

  return (
    <>
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
          <div
            className={
              isModal
                ? "grid grid-cols-1 gap-3 lg:grid-cols-3"
                : "grid grid-cols-1 gap-3 xl:grid-cols-12"
            }
          >
            <div
              className={
                isModal
                  ? "grid grid-cols-1 gap-3 md:grid-cols-2 lg:col-span-2"
                  : "grid grid-cols-1 gap-3 md:grid-cols-2 xl:col-span-9"
              }
            >
              <div className="space-y-3">
                <SalesFormSection title="Quotation Details">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <CustomerPicker onOpen={() => setCustomerModalOpen(true)} />
                    </div>
                    <FormikInput name="quoteDate" label="Quote Date" type="date" required />
                    <FormikInput name="validUntil" label="Valid Until" type="date" required />
                    <FormikSelect
                      name="priority"
                      label="Priority"
                      options={PRIORITY_OPTIONS}
                      required
                    />
                  </div>
                </SalesFormSection>
                <QuotationLineItemsTable
                  onAddProduct={() => setProductModalOpen(true)}
                  onCustomizeLine={(index) => {
                    void openCustomizeForLine(index);
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
                    <FormikTextarea
                      name="termsAndConditions"
                      label="Terms & Conditions"
                      rows={isModal ? 4 : 5}
                    />
                  </div>
                </SalesFormSection>
                <TotalsCard />
              </div>
            </div>
            <div
              className={
                isModal
                  ? "lg:col-span-1"
                  : "xl:col-span-3 xl:sticky xl:top-[72px] xl:self-start"
              }
            >
              {preview}
            </div>
          </div>
        </TabPanel>

        <TabPanel value="lines" className="pt-3">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <QuotationLineItemsTable
                onAddProduct={() => setProductModalOpen(true)}
                onCustomizeLine={(index) => {
                  void openCustomizeForLine(index);
                }}
              />
            </div>
            {preview}
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
            {preview}
          </div>
        </TabPanel>

        <TabPanel value="notes" className="pt-3">
          <div className="grid gap-3 lg:grid-cols-3">
            <SalesFormSection title="Internal Notes" className="lg:col-span-2">
              <FormikTextarea name="notes" label="Notes" rows={8} />
            </SalesFormSection>
            {preview}
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
        customerId={formik.values.customerId}
        customerName={formik.values.customerName}
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
}
