import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type { QuotationService } from "@/services/interfaces/quotationService";
import {
  computeLineTotal,
  computeQuotationTotals,
} from "@/features/sales/schemas/quotationSchema";
import {
  deepCloneCustomization,
  lockCustomization,
  approveCustomization,
} from "@/lib/quotationCustomization";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialCustomers } from "@/services/mock/data/customers";
import { initialQuotations } from "@/services/mock/data/quotations";
import { mockProductService } from "@/services/mock/mockProductService";
import { mockSalesOrderService } from "@/services/mock/mockSalesOrderService";
import type { Quotation, QuotationContactEntry, QuotationLineItem } from "@/types/quotation";
import {
  applyQuotationSaveMode,
  createQuotationRevision,
  ensureQuotationRevisions,
} from "@/lib/quotationRevisions";

let quotations = cloneData(initialQuotations).map((quotation) => ({
  ...quotation,
  revisions: ensureQuotationRevisions(quotation),
}));

function buildLineItems(
  items: Omit<QuotationLineItem, "id" | "lineTotal">[],
): QuotationLineItem[] {
  return items.map((item) => ({
    ...item,
    id: generateId("qli"),
    lineTotal: computeLineTotal(item),
    customization: item.customization
      ? deepCloneCustomization(item.customization)
      : undefined,
  }));
}

function computeTotals(lineItems: QuotationLineItem[], discountAmount = 0) {
  const totals = computeQuotationTotals(lineItems, discountAmount);
  return {
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
  };
}

function nextQuotationNumber(): string {
  const year = new Date().getFullYear();
  const count = quotations.length + 1;
  return `QT-${year}-${String(count).padStart(4, "0")}`;
}

function findLineOrThrow(quotation: Quotation, lineItemId: string): QuotationLineItem {
  const line = quotation.lineItems.find((item) => item.id === lineItemId);
  if (!line) notFoundError("QuotationLineItem", lineItemId);
  return line;
}

export const mockQuotationService: QuotationService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      quotations,
      filters,
      ["quotationNumber", "customerName", "customerEmail"],
      (item) => {
        if (filters.status && item.status !== filters.status) return false;
        if (filters.customerId && item.customerId !== filters.customerId) return false;
        if (filters.priority && item.priority !== filters.priority) return false;
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    const quotation = quotations.find((q) => q.id === id);
    if (!quotation) notFoundError("Quotation", id);
    return quotation;
  },

  async create(data) {
    await delay();
    const customer = initialCustomers.find((c) => c.id === data.customerId);
    if (!customer) notFoundError("Customer", data.customerId);

    const billingActive =
      customer.billingAddresses?.[customer.activeBillingAddressIndex] ?? customer.billingAddresses[0];
    const shippingActive = customer.deliverySameAsBilling
      ? undefined
      : customer.shippingAddresses?.[customer.activeShippingAddressIndex ?? 0];

    const lineItems = buildLineItems(data.lineItems);
    const totals = computeTotals(lineItems, data.discountAmount ?? 0);
    const timestamp = nowIso();
    const saveMode = data.saveMode ?? "draft";
    const isDraft = saveMode === "draft";
    const actor = {
      id: "usr-001",
      name: "Prabuddha Jayawardhana",
    };

    const quotation: Quotation = {
      id: generateId("quo"),
      quotationNumber: nextQuotationNumber(),
      customerId: customer.id,
      customerName: customer.name,
      customerEmail: customer.email,
      status: isDraft ? "draft" : "ready_to_send",
      priority: data.priority,
      lineItems,
      ...totals,
      currency: "LKR",
      validUntil: data.validUntil,
      paymentStatus: "unpaid",
      billingAddress: billingActive,
      shippingAddress: shippingActive,
      notes: data.notes,
      termsAndConditions: data.termsAndConditions,
      contactHistory: [
        {
          id: generateId("qch"),
          type: "comment",
          summary: isDraft ? "Quotation draft created" : "Quotation saved",
          contactedBy: actor.id,
          contactedByName: actor.name,
          contactedAt: timestamp,
        },
      ],
      revisions: [
        createQuotationRevision({
          versionNumber: 1,
          isDraft,
          totalAmount: totals.totalAmount,
          currency: "LKR",
          notes: isDraft ? "Initial draft" : "Initial version",
          createdAt: timestamp,
          createdBy: actor.id,
          createdByName: actor.name,
        }),
      ],
      createdBy: actor.id,
      createdByName: actor.name,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    quotations.push(quotation);
    return quotation;
  },

  async update(id, data) {
    await delay();
    const index = quotations.findIndex((q) => q.id === id);
    if (index === -1) notFoundError("Quotation", id);

    const existing = quotations[index];
    const { saveMode: requestedSaveMode, ...rest } = data;
    const lineItems = rest.lineItems
      ? buildLineItems(rest.lineItems)
      : existing.lineItems;
    const totals = computeTotals(lineItems, rest.discountAmount ?? existing.discountAmount);
    const timestamp = nowIso();
    const actor = {
      at: timestamp,
      id: "usr-001",
      name: "Prabuddha Jayawardhana",
    };
    const revisions = requestedSaveMode
      ? applyQuotationSaveMode(
          ensureQuotationRevisions(existing),
          requestedSaveMode,
          { totalAmount: totals.totalAmount, currency: existing.currency },
          actor,
        )
      : ensureQuotationRevisions(existing);
    const nextStatus =
      requestedSaveMode === "save" && existing.status === "draft"
        ? "ready_to_send"
        : (rest.status ?? existing.status);

    quotations[index] = {
      ...existing,
      ...rest,
      lineItems,
      ...totals,
      status: nextStatus,
      revisions,
      updatedAt: timestamp,
    };
    return quotations[index];
  },

  async delete(id) {
    await delay();
    const index = quotations.findIndex((q) => q.id === id);
    if (index === -1) notFoundError("Quotation", id);
    if (quotations[index].status !== "draft" && quotations[index].status !== "ready_to_send") {
      throw {
        code: "INVALID_STATE",
        message: "Only draft or ready-to-send quotations can be deleted.",
      };
    }
    quotations.splice(index, 1);
  },

  async send(id) {
    await delay();
    const index = quotations.findIndex((q) => q.id === id);
    if (index === -1) notFoundError("Quotation", id);

    const pendingCustom = quotations[index].lineItems.find(
      (line) =>
        line.isCustomized &&
        line.customization &&
        (line.customization.status === "draft" ||
          line.customization.status === "pending_approval"),
    );
    if (pendingCustom) {
      throw {
        code: "INVALID_STATE",
        message:
          "Customized lines must be estimated and approved before sending the quotation.",
      };
    }

    quotations[index] = {
      ...quotations[index],
      status: "sent",
      sentAt: nowIso(),
      updatedAt: nowIso(),
      contactHistory: [
        {
          id: generateId("qch"),
          type: "email",
          summary: "Quotation sent to customer",
          detail: `Email sent to ${quotations[index].customerEmail}`,
          contactedBy: "usr-001",
          contactedByName: "Prabuddha Jayawardhana",
          contactedAt: nowIso(),
          outcome: "Delivered",
        },
        ...quotations[index].contactHistory,
      ],
    };
    return quotations[index];
  },

  async addContactEntry(id, data) {
    await delay();
    const index = quotations.findIndex((q) => q.id === id);
    if (index === -1) notFoundError("Quotation", id);

    const quotation = quotations[index];
    const locked =
      quotation.status === "accepted" ||
      quotation.status === "converted" ||
      quotation.status === "rejected";
    if (locked) {
      throw {
        code: "INVALID_STATE",
        message: "Contact history can only be logged until the quotation is approved.",
      };
    }

    const entry: QuotationContactEntry = {
      id: generateId("qch"),
      type: data.type,
      summary: data.summary,
      detail: data.detail,
      outcome: data.outcome,
      contactedBy: "usr-001",
      contactedByName: "Prabuddha Jayawardhana",
      contactedAt: nowIso(),
    };

    quotations[index] = {
      ...quotation,
      contactHistory: [entry, ...quotation.contactHistory],
      updatedAt: nowIso(),
    };
    return quotations[index];
  },

  async convertToSalesOrder(id) {
    await delay();
    const quotation = quotations.find((q) => q.id === id);
    if (!quotation) notFoundError("Quotation", id);
    if (quotation.status !== "accepted" && quotation.status !== "sent") {
      throw {
        code: "INVALID_STATE",
        message: "Quotation must be accepted or sent before conversion.",
      };
    }

    // Freeze customization snapshots so SO does not re-read master product values.
    const frozenLines = quotation.lineItems.map((item) => ({
      ...item,
      customization: item.customization
        ? lockCustomization(deepCloneCustomization(item.customization))
        : undefined,
    }));

    const salesOrder = await mockSalesOrderService.create({
      customerId: quotation.customerId,
      quotationId: quotation.id,
      lineItems: frozenLines.map((item) => ({
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
          ? deepCloneCustomization(item.customization)
          : undefined,
      })),
      priority: quotation.priority,
      discountAmount: quotation.discountAmount,
    });

    const qIndex = quotations.findIndex((q) => q.id === id);
    quotations[qIndex] = {
      ...quotations[qIndex],
      lineItems: frozenLines,
      status: "converted",
      salesOrderId: salesOrder.id,
      updatedAt: nowIso(),
    };

    return salesOrder;
  },

  async approveLineCustomization(quotationId, lineItemId, notes) {
    await delay();
    const index = quotations.findIndex((q) => q.id === quotationId);
    if (index === -1) notFoundError("Quotation", quotationId);

    const quotation = quotations[index];
    const line = findLineOrThrow(quotation, lineItemId);
    if (!line.customization) {
      throw {
        code: "INVALID_STATE",
        message: "Line item has no customization to approve.",
      };
    }

    const approved = approveCustomization(line.customization, notes);
    quotations[index] = {
      ...quotation,
      lineItems: quotation.lineItems.map((item) =>
        item.id === lineItemId
          ? { ...item, customization: approved, isCustomized: true }
          : item,
      ),
      updatedAt: nowIso(),
    };
    return quotations[index];
  },

  async promoteCustomizationToProductVersion(quotationId, lineItemId, revisionNotes) {
    await delay();
    const index = quotations.findIndex((q) => q.id === quotationId);
    if (index === -1) notFoundError("Quotation", quotationId);

    const quotation = quotations[index];
    const line = findLineOrThrow(quotation, lineItemId);
    if (!line.customization || !line.isCustomized) {
      throw {
        code: "INVALID_STATE",
        message: "Only customized quotation lines can be promoted to a product version.",
      };
    }

    const customization = line.customization;
    const sourceVersionId = customization.base.productVersionId;

    // Explicit reuse action: create a new draft master version from the base, then apply customization.
    let product = await mockProductService.reviseVersion(
      line.productId,
      sourceVersionId,
      revisionNotes ??
        `Promoted from quotation ${quotation.quotationNumber} customization`,
    );

    const newVersion = product.versions[product.versions.length - 1];
    product = await mockProductService.updateVersion(line.productId, newVersion.id, {
      specifications: customization.customizedSpecifications,
      bom: customization.customizedBom.map((item) => ({
        inventoryItemId: item.inventoryItemId,
        inventoryItemName: item.inventoryItemName,
        sku: item.sku,
        quantity: item.quantity,
        unit: item.unit,
        unitCost: item.unitCost,
        wastePercent: item.wastePercent,
        isRequired: item.isRequired,
        notes: item.notes,
        sequence: item.sequence,
        alternatives: item.alternatives.map(({ id: _id, ...alt }) => alt),
      })),
      operations: customization.customizedOperations.map((op) => ({
        name: op.name,
        sequence: op.sequence,
        description: op.description,
        workstation: op.workstation,
        estimatedHours: op.estimatedHours,
        labourCostRate: op.labourCostRate,
        machineName: op.machineName,
        machineCost: op.machineCost,
        isRequired: op.isRequired,
        isEnabled: op.isEnabled,
        notes: op.notes,
      })),
      costBreakdown: customization.estimation.costBreakdown,
      basePrice: customization.estimation.sellingPrice,
      costPrice: customization.estimation.costPrice,
      revisionNotes:
        revisionNotes ??
        `Created from quotation ${quotation.quotationNumber} customer customization`,
    });

    const promotedVersion = product.versions[product.versions.length - 1];
    const timestamp = nowIso();
    const updatedCustomization = {
      ...deepCloneCustomization(customization),
      promotedProductVersionId: promotedVersion.id,
      updatedAt: timestamp,
      history: [
        {
          id: generateId("qchx"),
          at: timestamp,
          by: "usr-001",
          byName: "Prabuddha Jayawardhana",
          action: "promoted_to_version",
          detail: `Created ${promotedVersion.label} on master product (explicit reuse)`,
        },
        ...customization.history,
      ],
    };

    quotations[index] = {
      ...quotation,
      lineItems: quotation.lineItems.map((item) =>
        item.id === lineItemId
          ? { ...item, customization: updatedCustomization }
          : item,
      ),
      updatedAt: timestamp,
    };

    return { quotation: quotations[index], product };
  },
};
