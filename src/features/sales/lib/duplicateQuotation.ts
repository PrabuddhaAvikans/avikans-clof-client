import {
  computeQuotationTotals,
  type QuotationFormValues,
  type QuotationLineItemFormValues,
} from "@/features/sales/schemas/quotationSchema";
import { deepCloneCustomization } from "@/lib/quotationCustomization";
import { generateId } from "@/services/http";
import type { QuotationFormData } from "@/services/interfaces/quotationService";
import type {
  Quotation,
  QuotationProductCustomization,
} from "@/types/quotation";

/**
 * Copy quotation-level customization into a fresh draft snapshot.
 * Does not mutate the original; strips lock / promote / approval / audit history.
 */
export function cloneCustomizationForDuplicate(
  customization: QuotationProductCustomization,
): QuotationProductCustomization {
  const cloned = deepCloneCustomization(customization);
  const timestamp = new Date().toISOString();

  return {
    ...cloned,
    id: generateId("qpc"),
    status: "draft",
    isLocked: false,
    promotedProductVersionId: undefined,
    approval: {
      required: cloned.approval.required,
      status: "draft",
    },
    history: [
      {
        id: generateId("qch"),
        at: timestamp,
        by: "system",
        byName: "System",
        action: "copied",
        detail: "Copied into duplicate quotation draft",
      },
    ],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/** Map a source quotation into editable form values for the Duplicate modal. */
export function buildDuplicateQuotationFormValues(
  quotation: Quotation,
): QuotationFormValues {
  const today = new Date().toISOString().slice(0, 10);

  return {
    customerId: quotation.customerId,
    customerName: quotation.customerName,
    quoteDate: today,
    validUntil: quotation.validUntil.slice(0, 10),
    priority: quotation.priority,
    lineItems: quotation.lineItems.map(
      (item): QuotationLineItemFormValues => ({
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
        customization: item.customization
          ? cloneCustomizationForDuplicate(item.customization)
          : undefined,
      }),
    ),
    discountAmount: quotation.discountAmount,
    notes: quotation.notes ?? "",
    termsAndConditions: quotation.termsAndConditions ?? "",
  };
}

/** Build create payload for a new DRAFT quotation (never copies history / status / numbers). */
export function buildDuplicateQuotationCreatePayload(
  values: QuotationFormValues,
): QuotationFormData {
  return {
    customerId: values.customerId,
    lineItems: values.lineItems.map((item) => ({
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
      customization: item.customization as
        | QuotationProductCustomization
        | undefined,
    })),
    validUntil: values.validUntil,
    priority: values.priority,
    notes: values.notes,
    termsAndConditions: values.termsAndConditions,
    discountAmount: values.discountAmount ?? 0,
    saveMode: "draft",
  };
}

export function summarizeDuplicateQuotation(values: QuotationFormValues) {
  const totals = computeQuotationTotals(
    values.lineItems,
    values.discountAmount ?? 0,
  );

  return {
    customerName: values.customerName || "-",
    itemCount: values.lineItems.length,
    totalAmount: totals.totalAmount,
    validUntil: values.validUntil,
  };
}
