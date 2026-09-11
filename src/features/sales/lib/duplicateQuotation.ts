import {
  computeQuotationTotals,
  type QuotationFormValues,
  type QuotationLineItemFormValues,
} from "@/features/sales/schemas/quotationSchema";
import { deepCloneCustomization } from "@/lib/quotationCustomization";
import { generateId } from "@/services/http";
import {
  quotationAttachmentsFromForm,
  quotationAttachmentsToForm,
} from "@/features/sales/lib/quotationAttachments";
import type { QuotationFormData } from "@/services/interfaces/quotationService";
import type { Attachment } from "@/types/common";
import type {
  Quotation,
  QuotationProductCustomization,
} from "@/types/quotation";

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
    attachments: quotationAttachmentsToForm(quotation.attachments).map((item) => ({
      ...item,
      id: generateId("qatt"),
    })),
  };
}

export function buildQuotationFormPayload(
  values: QuotationFormValues,
  options: {
    saveMode?: "draft" | "save";
    existingAttachments?: Attachment[];
  } = {},
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
    attachments: quotationAttachmentsFromForm(
      values.attachments,
      options.existingAttachments,
    ),
    saveMode: options.saveMode ?? "draft",
  };
}

export function buildDuplicateQuotationCreatePayload(
  values: QuotationFormValues,
): QuotationFormData {
  return buildQuotationFormPayload(values, { saveMode: "draft" });
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
