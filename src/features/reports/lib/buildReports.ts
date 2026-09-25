import { getReportDefinition } from "@/features/reports/catalog";
import type { AuditLogEntry } from "@/types/audit";
import type { CostingRequest } from "@/types/costing";
import type { CreditNote } from "@/types/credit-note";
import type { Customer } from "@/types/customer";
import type { Delivery } from "@/types/delivery";
import type { InventoryItem, StockMovement } from "@/types/inventory";
import type { Invoice } from "@/types/invoice";
import type { ManufacturingJob } from "@/types/manufacturing";
import type { Product } from "@/types/product";
import type { Quotation } from "@/types/quotation";
import type { ReprocessingBatch } from "@/types/reprocessing";
import type { ReportDataset, ReportId, ReportKpi, ReportRow } from "@/types/report";
import type { SalesOrder } from "@/types/sales-order";
import { kpi, overdueDays, percent, round2, sumBy } from "@/features/reports/lib/reportHelpers";
import {
  buildShipChecks,
  coverCompletedJobs,
  emptyCoverage,
  SHIP_DISPOSITION_LABEL,
  shipDisposition,
} from "@/features/manufacturing/lib/readyToShip";

export type ReportSources = {
  quotations: Quotation[];
  salesOrders: SalesOrder[];
  jobs: ManufacturingJob[];
  inventory: InventoryItem[];
  movements: StockMovement[];
  customers: Customer[];
  products: Product[];
  deliveries: Delivery[];
  costing: CostingRequest[];
  reprocessing: ReprocessingBatch[];
  invoices: Invoice[];
  creditNotes: CreditNote[];
  auditLogs: AuditLogEntry[];
};

type Built = { kpis: ReportKpi[]; rows: ReportRow[] };
type Builder = (sources: ReportSources) => Built;

const OPEN_ORDER_STATUSES = new Set([
  "draft",
  "pending_review",
  "confirmed",
  "submitted",
  "in_manufacturing",
  "ready_for_delivery",
  "partially_delivered",
]);

const CLOSED_JOB_STATUSES = new Set(["completed", "cancelled"]);

const EXCEPTION_DELIVERY_STATUSES = new Set([
  "failed",
  "returned",
  "cancelled",
  "partially_delivered",
]);

function currentVersion(product: Product) {
  return product.versions.find((version) => version.id === product.currentVersionId) ?? product.versions[0];
}

const builders: Record<ReportId, Builder> = {
  "quotation-register": ({ quotations }) => ({
    kpis: [
      kpi("count", "Quotations", quotations.length),
      kpi("value", "Total value", sumBy(quotations, (item) => item.totalAmount), "currency"),
      kpi("converted", "Converted", quotations.filter((item) => item.status === "converted" || item.salesOrderId).length),
      kpi("open", "Open", quotations.filter((item) => !["converted", "rejected", "expired"].includes(item.status)).length),
    ],
    rows: quotations.map((item) => ({
      id: item.id,
      quotationNumber: item.quotationNumber,
      customerName: item.customerName,
      status: item.status,
      lineCount: item.lineItems.length,
      totalAmount: item.totalAmount,
      paymentStatus: item.paymentStatus,
      validUntil: item.validUntil,
      salesOrderId: item.salesOrderId ?? "",
      createdByName: item.createdByName,
      createdAt: item.createdAt,
    })),
  }),

  "sales-order-register": ({ salesOrders }) => ({
    kpis: [
      kpi("count", "Orders", salesOrders.length),
      kpi("value", "Order value", sumBy(salesOrders, (item) => item.totalAmount), "currency"),
      kpi("open", "Open", salesOrders.filter((item) => OPEN_ORDER_STATUSES.has(item.status)).length),
      kpi("unpaid", "Unpaid / partial", salesOrders.filter((item) => item.paymentStatus !== "paid").length),
    ],
    rows: salesOrders.map((item) => ({
      id: item.id,
      orderNumber: item.orderNumber,
      customerName: item.customerName,
      status: item.status,
      priority: item.priority,
      quotationNumber: item.quotationNumber ?? "",
      totalAmount: item.totalAmount,
      paymentStatus: item.paymentStatus,
      jobCount: item.manufacturingJobIds.length,
      requestedDeliveryDate: item.requestedDeliveryDate ?? "",
      assignedToName: item.assignedToName ?? "",
      createdAt: item.createdAt,
    })),
  }),

  "costing-register": ({ costing }) => ({
    kpis: [
      kpi("count", "Requests", costing.length),
      kpi("pending", "Pending / in review", costing.filter((item) => item.status === "pending" || item.status === "in_review").length),
      kpi("highRisk", "High risk", costing.filter((item) => item.riskFlag === "high").length),
      kpi("estimate", "Total estimate", sumBy(costing, (item) => item.totalEstimate), "currency"),
    ],
    rows: costing.map((item) => ({
      id: item.id,
      requestNumber: item.requestNumber,
      customerName: item.customerName,
      projectName: item.projectName,
      status: item.status,
      riskFlag: item.riskFlag,
      coatingStatus: item.coatingStatus,
      totalEstimate: item.totalEstimate,
      proposedPrice: item.proposedPrice,
      marginPercent: item.marginPercent,
      targetMargin: item.targetMargin,
      salesOrderNumber: item.salesOrderNumber ?? "",
      slaRemaining: item.slaRemaining,
      requestedDate: item.requestedDate,
    })),
  }),

  "estimation-materials": ({ costing }) => {
    const rows: ReportRow[] = costing.flatMap((request) =>
      request.estimationMaterials.map((material) => ({
        id: `${request.id}-${material.id}`,
        requestNumber: request.requestNumber,
        customerName: request.customerName,
        sku: material.sku,
        inventoryItemName: material.inventoryItemName,
        sourceProductName: material.sourceProductName ?? "",
        quantity: material.quantity,
        wastePercent: material.wastePercent,
        requiredQuantity: material.requiredQuantity,
        unit: material.unit,
        unitCost: material.unitCost,
        totalCost: material.totalCost,
      })),
    );
    return {
      kpis: [
        kpi("lines", "Material lines", rows.length),
        kpi("cost", "Material cost", sumBy(rows, (row) => Number(row.totalCost)), "currency"),
      ],
      rows,
    };
  },

  "production-jobs": ({ jobs }) => ({
    kpis: [
      kpi("count", "Jobs", jobs.length),
      kpi("inProgress", "In progress", jobs.filter((job) => job.status === "in_progress").length),
      kpi("delayed", "Delayed", jobs.filter((job) => !CLOSED_JOB_STATUSES.has(job.status) && overdueDays(job.plannedEndDate) > 0).length),
      kpi("actual", "Actual cost", sumBy(jobs, (job) => job.actualCost), "currency"),
    ],
    rows: jobs.map((job) => ({
      id: job.id,
      jobNumber: job.jobNumber,
      salesOrderNumber: job.salesOrderNumber,
      customerName: job.customerName,
      productSku: job.productSku,
      productName: job.productName,
      quantity: job.quantity,
      status: job.status,
      priority: job.priority,
      progressPercent: job.progressPercent,
      estimatedCost: job.estimatedCost,
      actualCost: job.actualCost,
      plannedStartDate: job.plannedStartDate,
      plannedEndDate: job.plannedEndDate,
      assignedToName: job.assignedToName ?? "",
    })),
  }),

  "quality-inspections": ({ jobs }) => {
    const rows: ReportRow[] = jobs
      .filter((job) => job.qualityInspection)
      .map((job) => {
        const inspection = job.qualityInspection!;
        const passed = inspection.checklistItems.filter((item) => item.passed === true).length;
        return {
          id: inspection.id,
          jobNumber: job.jobNumber,
          inspectionNumber: inspection.inspectionNumber,
          productName: job.productName,
          customerName: job.customerName,
          status: inspection.status,
          inspectorName: inspection.inspectorName,
          checklistTotal: inspection.checklistItems.length,
          checklistPassed: passed,
          passRate: percent(passed, inspection.checklistItems.length),
          inspectedAt: inspection.inspectedAt ?? "",
          notes: inspection.notes ?? "",
        };
      });
    return {
      kpis: [
        kpi("count", "Inspections", rows.length),
        kpi("passed", "Passed", rows.filter((row) => row.status === "passed").length),
        kpi("failed", "Failed / rework", rows.filter((row) => row.status === "failed" || row.status === "rework").length),
      ],
      rows,
    };
  },

  "ready-to-ship": ({ jobs, deliveries, salesOrders }) => {
    const ordersById = new Map(salesOrders.map((order) => [order.id, order]));
    const coverage = coverCompletedJobs(
      jobs.map((job) => ({
        id: job.id,
        salesOrderNumber: job.salesOrderNumber,
        productSku: job.productSku,
        quantity: job.quantity,
        status: job.status,
        completedAt: job.actualEndDate,
      })),
      deliveries,
    );
    const rows: ReportRow[] = jobs
      .filter((job) => job.status === "completed")
      .map((job) => {
        const cover = coverage.get(job.id) ?? emptyCoverage(job.quantity);
        const checks = buildShipChecks(job, ordersById.get(job.salesOrderId));
        const disposition = shipDisposition(
          cover,
          checks.every((check) => check.passed),
        );
        return {
          id: job.id,
          jobNumber: job.jobNumber,
          salesOrderNumber: job.salesOrderNumber,
          customerName: job.customerName,
          productName: job.productName,
          quantity: job.quantity,
          remainingQuantity: cover.remainingQuantity,
          shippedQuantity: cover.shippedQuantity,
          shipStatus: SHIP_DISPOSITION_LABEL[disposition],
          actualEndDate: job.actualEndDate ?? "",
          actualCost: job.actualCost,
        };
      });
    return {
      kpis: [
        kpi("ready", "Ready to ship", rows.filter((row) => row.shipStatus === SHIP_DISPOSITION_LABEL.ready).length),
        kpi("shipped", "Shipped", rows.filter((row) => row.shipStatus === SHIP_DISPOSITION_LABEL.shipped).length),
        kpi("qty", "Qty still to ship", sumBy(rows, (row) => Number(row.remainingQuantity))),
      ],
      rows,
    };
  },

  "stock-valuation": ({ inventory }) => {
    const rows = inventory.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      itemType: item.itemType,
      warehouse: item.warehouse,
      location: item.location,
      quantityOnHand: item.quantityOnHand,
      quantityReserved: item.quantityReserved,
      quantityAvailable: item.quantityAvailable,
      unit: item.unit,
      costPrice: item.costPrice,
      stockValue: round2(item.quantityOnHand * item.costPrice),
      stockStatus: item.stockStatus,
    }));
    return {
      kpis: [
        kpi("items", "Items", rows.length),
        kpi("value", "Stock value", sumBy(rows, (row) => Number(row.stockValue)), "currency"),
        kpi("low", "Low / out", inventory.filter((item) => item.stockStatus === "low_stock" || item.stockStatus === "out_of_stock").length),
      ],
      rows,
    };
  },

  "stock-movements": ({ movements }) => ({
    kpis: [
      kpi("count", "Movements", movements.length),
      kpi("issues", "Issues", movements.filter((item) => item.type === "issue").length),
      kpi("receipts", "Receipts", movements.filter((item) => item.type === "receipt").length),
    ],
    rows: movements.map((item) => ({
      id: item.id,
      inventoryItemSku: item.inventoryItemSku,
      inventoryItemName: item.inventoryItemName,
      type: item.type,
      quantity: item.quantity,
      unit: item.unit,
      referenceType: item.referenceType ?? "",
      referenceId: item.referenceId ?? "",
      performedByName: item.performedByName,
      performedAt: item.performedAt,
      notes: item.notes ?? "",
    })),
  }),

  "reprocessing-batches": ({ reprocessing }) => ({
    kpis: [
      kpi("count", "Batches", reprocessing.length),
      kpi("active", "In progress", reprocessing.filter((item) => item.status === "in_progress").length),
      kpi("cost", "Processing cost", sumBy(reprocessing, (item) => item.totalProcessingCost), "currency"),
    ],
    rows: reprocessing.map((item) => ({
      id: item.id,
      batchNumber: item.batchNumber,
      status: item.status,
      inputScrapSku: item.inputScrapSku,
      inputScrapName: item.inputScrapName,
      inputQuantity: item.inputQuantity,
      inputUnitCost: item.inputUnitCost,
      totalProcessingCost: item.totalProcessingCost,
      recoveredQuantity: item.recoveredQuantity ?? 0,
      processLossQuantity: item.processLossQuantity ?? 0,
      createdByName: item.createdByName,
      createdAt: item.createdAt,
    })),
  }),

  "low-stock": ({ inventory }) => {
    const low = inventory.filter(
      (item) =>
        item.stockStatus === "low_stock" ||
        item.stockStatus === "out_of_stock" ||
        item.quantityAvailable <= item.reorderLevel,
    );
    return {
      kpis: [
        kpi("count", "Low-stock items", low.length),
        kpi("out", "Out of stock", low.filter((item) => item.stockStatus === "out_of_stock").length),
      ],
      rows: low.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        warehouse: item.warehouse,
        quantityAvailable: item.quantityAvailable,
        minStock: item.minStock,
        reorderLevel: item.reorderLevel,
        reorderQuantity: item.reorderQuantity,
        stockStatus: item.stockStatus,
        supplier: item.supplier ?? "",
      })),
    };
  },

  "invoice-register": ({ invoices }) => ({
    kpis: [
      kpi("count", "Invoices", invoices.length),
      kpi("total", "Invoiced", sumBy(invoices, (item) => item.totalAmount), "currency"),
      kpi("outstanding", "Outstanding", sumBy(invoices, (item) => item.outstandingAmount), "currency"),
      kpi("paid", "Collected", sumBy(invoices, (item) => item.amountPaid), "currency"),
    ],
    rows: invoices.map((item) => ({
      id: item.id,
      invoiceNumber: item.invoiceNumber,
      customerName: item.customerName,
      salesOrderNumber: item.salesOrderNumber ?? "",
      status: item.status,
      issueDate: item.issueDate,
      dueDate: item.dueDate,
      totalAmount: item.totalAmount,
      amountPaid: item.amountPaid,
      amountCredited: item.amountCredited,
      outstandingAmount: item.outstandingAmount,
    })),
  }),

  "credit-notes": ({ creditNotes }) => ({
    kpis: [
      kpi("count", "Credit notes", creditNotes.length),
      kpi("total", "Total credited", sumBy(creditNotes, (item) => item.totalAmount), "currency"),
      kpi("remaining", "Unapplied", sumBy(creditNotes, (item) => item.remainingAmount), "currency"),
    ],
    rows: creditNotes.map((item) => ({
      id: item.id,
      creditNoteNumber: item.creditNoteNumber,
      customerName: item.customerName,
      invoiceNumber: item.invoiceNumber ?? "",
      status: item.status,
      reason: item.reason,
      totalAmount: item.totalAmount,
      appliedAmount: item.appliedAmount,
      remainingAmount: item.remainingAmount,
      issueDate: item.issueDate ?? "",
    })),
  }),

  "delivery-register": ({ deliveries }) => ({
    kpis: [
      kpi("count", "Deliveries", deliveries.length),
      kpi("inTransit", "In transit", deliveries.filter((item) => item.status === "in_transit" || item.status === "dispatched").length),
      kpi("delivered", "Delivered", deliveries.filter((item) => item.status === "delivered").length),
      kpi("exceptions", "Exceptions", deliveries.filter((item) => EXCEPTION_DELIVERY_STATUSES.has(item.status)).length),
    ],
    rows: deliveries.map((item) => ({
      id: item.id,
      deliveryNumber: item.deliveryNumber,
      salesOrderNumber: item.salesOrderNumber,
      customerName: item.customerName,
      status: item.status,
      priority: item.priority,
      scheduledDate: item.scheduledDate,
      dispatchedAt: item.dispatchedAt ?? "",
      deliveredAt: item.deliveredAt ?? "",
      carrier: item.carrier ?? "",
      driverName: item.driverName ?? "",
      hasProof: item.proofOfDelivery ? "Yes" : "No",
    })),
  }),

  "customer-directory": ({ customers }) => ({
    kpis: [
      kpi("count", "Customers", customers.length),
      kpi("active", "Active", customers.filter((item) => item.status === "active").length),
      kpi("revenue", "Recorded revenue", sumBy(customers, (item) => item.totalRevenue), "currency"),
    ],
    rows: customers.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      type: item.type,
      status: item.status,
      email: item.email,
      phone: item.phone,
      paymentTermsDays: item.paymentTermsDays,
      creditLimit: item.creditLimit ?? 0,
      totalOrders: item.totalOrders,
      totalRevenue: item.totalRevenue,
      createdAt: item.createdAt,
    })),
  }),

  "product-catalog": ({ products }) => {
    const rows = products.map((product) => {
      const version = currentVersion(product);
      const cost = version?.costPrice ?? product.costPrice;
      const price = version?.basePrice ?? product.basePrice;
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        productType: product.productType,
        categoryName: product.categoryName,
        brandName: product.brandName,
        status: product.status,
        versionLabel: version?.label ?? "",
        costPrice: cost,
        basePrice: price,
        marginPercent: percent(price - cost, price),
        leadTimeDays: version?.leadTimeDays ?? product.leadTimeDays,
      };
    });
    return {
      kpis: [
        kpi("count", "Products", rows.length),
        kpi("active", "Active", products.filter((item) => item.status === "active").length),
      ],
      rows,
    };
  },

  "audit-activity": ({ auditLogs }) => ({
    kpis: [
      kpi("count", "Events", auditLogs.length),
      kpi("critical", "Critical", auditLogs.filter((item) => item.severity === "critical").length),
      kpi("warning", "Warnings", auditLogs.filter((item) => item.severity === "warning").length),
    ],
    rows: auditLogs.map((item) => ({
      id: item.id,
      timestamp: item.timestamp,
      userName: item.userName,
      action: item.action,
      entity: item.entity,
      entityLabel: item.entityLabel ?? item.entityId,
      details: item.details,
      severity: item.severity,
    })),
  }),
};

export function buildReportDataset(reportId: ReportId, sources: ReportSources): ReportDataset {
  const definition = getReportDefinition(reportId);
  if (!definition) {
    throw new Error(`Unknown report: ${reportId}`);
  }
  const built = builders[reportId](sources);
  return {
    reportId,
    title: definition.title,
    generatedAt: new Date().toISOString(),
    columns: definition.columns,
    kpis: built.kpis,
    rows: built.rows,
  };
}
