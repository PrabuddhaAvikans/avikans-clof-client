import { differenceInCalendarDays, parseISO } from "date-fns";
import { computeTotalCost } from "@/types/product";
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
import { calculateJobLaborBreakdown } from "@/lib/manufacturingTasks";
import { getReportDefinition } from "@/features/reports/catalog";
import {
  agingBucket,
  daysPastDue,
  groupedRows,
  kpi,
  overdueDays,
  percent,
  round2,
  sumBy,
} from "@/features/reports/lib/reportHelpers";

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
      priority: item.priority,
      lineCount: item.lineItems.length,
      totalAmount: item.totalAmount,
      paymentStatus: item.paymentStatus,
      validUntil: item.validUntil,
      salesOrderId: item.salesOrderId ?? "",
      createdByName: item.createdByName,
      createdAt: item.createdAt,
    })),
  }),

  "quotation-conversion": ({ quotations }) => {
    const converted = quotations.filter((item) => item.status === "converted" || Boolean(item.salesOrderId));
    const rows = groupedRows(
      quotations,
      (item) => item.status,
      (status, group) => ({
        id: status,
        status,
        count: group.length,
        totalAmount: sumBy(group, (item) => item.totalAmount),
        sharePercent: percent(group.length, quotations.length),
      }),
    );
    return {
      kpis: [
        kpi("count", "Quotations", quotations.length),
        kpi("converted", "Converted", converted.length),
        kpi("rate", "Conversion rate", percent(converted.length, quotations.length), "percent"),
        kpi("convertedValue", "Converted value", sumBy(converted, (item) => item.totalAmount), "currency"),
      ],
      rows: rows.sort((a, b) => Number(b.count) - Number(a.count)),
    };
  },

  "quotation-follow-up": ({ quotations }) => {
    const rows: ReportRow[] = quotations.flatMap((quotation) =>
      quotation.contactHistory.map((entry) => ({
        id: entry.id,
        quotationNumber: quotation.quotationNumber,
        customerName: quotation.customerName,
        type: entry.type,
        summary: entry.summary,
        outcome: entry.outcome ?? "",
        contactedByName: entry.contactedByName,
        contactedAt: entry.contactedAt,
      })),
    );
    return {
      kpis: [
        kpi("contacts", "Contact events", rows.length),
        kpi("quotations", "Quotations with follow-up", quotations.filter((item) => item.contactHistory.length > 0).length),
      ],
      rows,
    };
  },

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

  "sales-order-fulfillment": ({ salesOrders }) => {
    const rows: ReportRow[] = salesOrders.flatMap((order) =>
      order.lineItems.map((line) => {
        const open = Math.max(0, line.quantity - line.quantityDelivered);
        return {
          id: `${order.id}-${line.id}`,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          productSku: line.productSku,
          productName: line.productName,
          quantity: line.quantity,
          quantityInManufacturing: line.quantityInManufacturing,
          quantityDelivered: line.quantityDelivered,
          quantityOpen: open,
          fulfillmentPercent: percent(line.quantityDelivered, line.quantity),
        };
      }),
    );
    return {
      kpis: [
        kpi("lines", "Order lines", rows.length),
        kpi("ordered", "Qty ordered", sumBy(rows, (row) => Number(row.quantity)), "number"),
        kpi("delivered", "Qty delivered", sumBy(rows, (row) => Number(row.quantityDelivered)), "number"),
        kpi("open", "Qty open", sumBy(rows, (row) => Number(row.quantityOpen)), "number"),
      ],
      rows,
    };
  },

  "sales-by-customer": ({ salesOrders }) => {
    const rows = groupedRows(
      salesOrders,
      (item) => item.customerId,
      (_key, group) => ({
        id: group[0].customerId,
        customerName: group[0].customerName,
        orderCount: group.length,
        totalAmount: sumBy(group, (item) => item.totalAmount),
        unpaidAmount: sumBy(
          group.filter((item) => item.paymentStatus !== "paid"),
          (item) => item.totalAmount,
        ),
        openOrders: group.filter((item) => OPEN_ORDER_STATUSES.has(item.status)).length,
      }),
    ).sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));
    return {
      kpis: [
        kpi("customers", "Customers", rows.length),
        kpi("value", "Order value", sumBy(salesOrders, (item) => item.totalAmount), "currency"),
      ],
      rows,
    };
  },

  "sales-by-product": ({ salesOrders }) => {
    const lines = salesOrders.flatMap((order) =>
      order.lineItems.map((line) => ({ ...line, orderId: order.id })),
    );
    const rows = groupedRows(
      lines,
      (line) => line.productId,
      (_key, group) => ({
        id: group[0].productId,
        productSku: group[0].productSku,
        productName: group[0].productName,
        orderCount: new Set(group.map((line) => line.orderId)).size,
        quantity: sumBy(group, (line) => line.quantity),
        quantityDelivered: sumBy(group, (line) => line.quantityDelivered),
        lineTotal: sumBy(group, (line) => line.lineTotal),
      }),
    ).sort((a, b) => Number(b.lineTotal) - Number(a.lineTotal));
    return {
      kpis: [
        kpi("products", "Products", rows.length),
        kpi("qty", "Qty ordered", sumBy(rows, (row) => Number(row.quantity))),
        kpi("revenue", "Revenue", sumBy(rows, (row) => Number(row.lineTotal)), "currency"),
      ],
      rows,
    };
  },

  "open-sales-orders": ({ salesOrders }) => {
    const open = salesOrders.filter((item) => OPEN_ORDER_STATUSES.has(item.status));
    return {
      kpis: [
        kpi("count", "Open orders", open.length),
        kpi("value", "Open value", sumBy(open, (item) => item.totalAmount), "currency"),
        kpi("urgent", "High / urgent", open.filter((item) => item.priority === "high" || item.priority === "urgent").length),
      ],
      rows: open.map((item) => ({
        id: item.id,
        orderNumber: item.orderNumber,
        customerName: item.customerName,
        status: item.status,
        priority: item.priority,
        totalAmount: item.totalAmount,
        paymentStatus: item.paymentStatus,
        requestedDeliveryDate: item.requestedDeliveryDate ?? "",
        jobCount: item.manufacturingJobIds.length,
        createdAt: item.createdAt,
      })),
    };
  },

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

  "costing-margin": ({ costing }) => {
    const rows = costing.map((item) => ({
      id: item.id,
      requestNumber: item.requestNumber,
      customerName: item.customerName,
      status: item.status,
      riskFlag: item.riskFlag,
      totalEstimate: item.totalEstimate,
      proposedPrice: item.proposedPrice,
      marginAmount: round2(item.proposedPrice - item.totalEstimate),
      marginPercent: item.marginPercent,
      targetMargin: item.targetMargin,
      marginGap: round2(item.marginPercent - item.targetMargin),
    }));
    return {
      kpis: [
        kpi("avgMargin", "Avg margin", rows.length ? round2(sumBy(rows, (row) => Number(row.marginPercent)) / rows.length) : 0, "percent"),
        kpi("belowTarget", "Below target", rows.filter((row) => Number(row.marginGap) < 0).length),
        kpi("highRisk", "High risk", costing.filter((item) => item.riskFlag === "high").length),
      ],
      rows,
    };
  },

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

  "coating-costs": ({ costing }) => {
    const rows: ReportRow[] = costing.flatMap((request) =>
      request.coatingItems.map((item) => ({
        id: `${request.id}-${item.id}`,
        requestNumber: request.requestNumber,
        productName: item.productName,
        productSku: item.productSku ?? "",
        finish: item.finish,
        process: item.process,
        quantity: item.quantity,
        unitCost: item.unitCost,
        lineTotal: item.lineTotal,
        coatingStatus: request.coatingStatus,
      })),
    );
    return {
      kpis: [
        kpi("lines", "Coating lines", rows.length),
        kpi("cost", "Coating cost", sumBy(rows, (row) => Number(row.lineTotal)), "currency"),
      ],
      rows,
    };
  },

  "customization-approvals": ({ quotations }) => {
    const rows: ReportRow[] = quotations.flatMap((quotation) =>
      quotation.lineItems
        .filter((line) => line.customization)
        .map((line) => {
          const customization = line.customization!;
          return {
            id: customization.id,
            quotationNumber: quotation.quotationNumber,
            customerName: quotation.customerName,
            productSku: line.productSku,
            productName: line.productName,
            status: customization.status,
            costPrice: customization.estimation.costPrice,
            sellingPrice: customization.estimation.sellingPrice,
            expectedProfit: customization.estimation.expectedProfit,
            marginPercent: customization.estimation.marginPercent,
            approvalStatus: customization.approval.status,
            decidedByName: customization.approval.decidedByName ?? "",
            updatedAt: customization.updatedAt,
          };
        }),
    );
    return {
      kpis: [
        kpi("count", "Customizations", rows.length),
        kpi("pending", "Pending approval", rows.filter((row) => row.approvalStatus === "pending_approval").length),
        kpi("approved", "Approved", rows.filter((row) => row.approvalStatus === "approved").length),
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

  "production-wip": ({ jobs }) => {
    const wip = jobs.filter((job) => !CLOSED_JOB_STATUSES.has(job.status));
    const rows = wip.map((job) => {
      const current = job.tasks.find((task) => task.status === "in_progress") ?? job.tasks.find((task) => task.status === "ready");
      return {
        id: job.id,
        jobNumber: job.jobNumber,
        customerName: job.customerName,
        productName: job.productName,
        status: job.status,
        priority: job.priority,
        progressPercent: job.progressPercent,
        currentTask: current?.name ?? "",
        plannedEndDate: job.plannedEndDate,
        overdueDays: overdueDays(job.plannedEndDate),
        assignedToName: job.assignedToName ?? "",
      };
    });
    return {
      kpis: [
        kpi("wip", "WIP jobs", wip.length),
        kpi("hold", "On hold", wip.filter((job) => job.status === "on_hold").length),
        kpi("delayed", "Delayed", rows.filter((row) => Number(row.overdueDays) > 0).length),
      ],
      rows,
    };
  },

  "production-cost-variance": ({ jobs }) => {
    const rows = jobs.map((job) => {
      const labor = calculateJobLaborBreakdown(job);
      const variance = round2(job.actualCost - job.estimatedCost);
      return {
        id: job.id,
        jobNumber: job.jobNumber,
        productName: job.productName,
        status: job.status,
        estimatedCost: job.estimatedCost,
        actualCost: job.actualCost,
        laborCost: labor.laborCost,
        variance,
        variancePercent: percent(variance, job.estimatedCost),
      };
    });
    return {
      kpis: [
        kpi("estimated", "Estimated", sumBy(jobs, (job) => job.estimatedCost), "currency"),
        kpi("actual", "Actual", sumBy(jobs, (job) => job.actualCost), "currency"),
        kpi("variance", "Variance", sumBy(rows, (row) => Number(row.variance)), "currency"),
      ],
      rows,
    };
  },

  "labor-hours-cost": ({ jobs }) => {
    const rows = jobs.map((job) => {
      const labor = calculateJobLaborBreakdown(job);
      return {
        id: job.id,
        jobNumber: job.jobNumber,
        productName: job.productName,
        customerName: job.customerName,
        status: job.status,
        actualHours: labor.actualHours,
        regularHours: labor.regularHours,
        overtimeHours: labor.overtimeHours,
        regularCost: labor.regularCost,
        overtimeCost: labor.overtimeCost,
        laborCost: labor.laborCost,
      };
    });
    return {
      kpis: [
        kpi("hours", "Actual hours", sumBy(rows, (row) => Number(row.actualHours))),
        kpi("ot", "OT hours", sumBy(rows, (row) => Number(row.overtimeHours))),
        kpi("cost", "Labor cost", sumBy(rows, (row) => Number(row.laborCost)), "currency"),
        kpi("otCost", "OT cost", sumBy(rows, (row) => Number(row.overtimeCost)), "currency"),
      ],
      rows,
    };
  },

  "task-performance": ({ jobs }) => {
    const rows: ReportRow[] = jobs.flatMap((job) =>
      job.tasks.map((task) => ({
        id: task.id,
        jobNumber: job.jobNumber,
        taskNumber: task.taskNumber,
        name: task.name,
        workstation: task.workstation ?? "",
        status: task.status,
        estimatedHours: task.estimatedHours,
        actualHours: task.actualHours ?? 0,
        overtimeHours: task.overtimeHours ?? 0,
        plannedQuantity: task.plannedQuantity,
        completedQuantity: task.completedQuantity,
        rejectedQuantity: task.rejectedQuantity,
        wasteQuantity: task.wasteQuantity,
        operatorName: task.operatorName ?? task.assignedToName ?? "",
      })),
    );
    return {
      kpis: [
        kpi("tasks", "Tasks", rows.length),
        kpi("completed", "Completed", rows.filter((row) => row.status === "completed").length),
        kpi("rejected", "Rejected qty", sumBy(rows, (row) => Number(row.rejectedQuantity))),
        kpi("waste", "Waste qty", sumBy(rows, (row) => Number(row.wasteQuantity))),
      ],
      rows,
    };
  },

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

  "rework-register": ({ jobs }) => {
    const rows: ReportRow[] = jobs.flatMap((job) =>
      job.reworks.map((rework) => ({
        id: rework.id,
        jobNumber: job.jobNumber,
        reworkNumber: rework.reworkNumber,
        productName: job.productName,
        reason: rework.reason,
        quantity: rework.quantity,
        additionalTimeHours: rework.additionalTimeHours ?? 0,
        additionalCost: rework.additionalCost ?? 0,
        result: rework.result ?? "pending",
        createdAt: rework.createdAt,
        completedAt: rework.completedAt ?? "",
      })),
    );
    return {
      kpis: [
        kpi("count", "Reworks", rows.length),
        kpi("qty", "Rework qty", sumBy(rows, (row) => Number(row.quantity))),
        kpi("cost", "Extra cost", sumBy(rows, (row) => Number(row.additionalCost)), "currency"),
      ],
      rows,
    };
  },

  "scrap-waste": ({ jobs }) => {
    const withOutcome = jobs.filter((job) => job.materialOutcome);
    const rows = withOutcome.map((job) => {
      const outcome = job.materialOutcome!;
      const accounted =
        outcome.finishedMaterialQuantity +
        outcome.reusableScrapQuantity +
        outcome.recoverableQuantity +
        outcome.permanentWasteQuantity;
      return {
        id: job.id,
        jobNumber: job.jobNumber,
        productName: job.productName,
        plannedQuantity: job.quantity,
        finishedMaterialQuantity: outcome.finishedMaterialQuantity,
        reusableScrapQuantity: outcome.reusableScrapQuantity,
        recoverableQuantity: outcome.recoverableQuantity,
        permanentWasteQuantity: outcome.permanentWasteQuantity,
        yieldPercent: percent(outcome.finishedMaterialQuantity, job.quantity || accounted),
        postedAt: outcome.postedAt,
      };
    });
    return {
      kpis: [
        kpi("jobs", "Jobs posted", rows.length),
        kpi("finished", "Finished qty", sumBy(rows, (row) => Number(row.finishedMaterialQuantity))),
        kpi("waste", "Permanent waste", sumBy(rows, (row) => Number(row.permanentWasteQuantity))),
        kpi("scrap", "Reusable scrap", sumBy(rows, (row) => Number(row.reusableScrapQuantity))),
      ],
      rows,
    };
  },

  "material-requirements": ({ jobs }) => {
    const rows: ReportRow[] = jobs.flatMap((job) =>
      job.materialRequirements.map((requirement) => ({
        id: `${job.id}-${requirement.id}`,
        jobNumber: job.jobNumber,
        productName: job.productName,
        inventoryItemSku: requirement.inventoryItemSku,
        inventoryItemName: requirement.inventoryItemName,
        requiredQuantity: requirement.requiredQuantity,
        reservedQuantity: requirement.reservedQuantity,
        issuedQuantity: requirement.issuedQuantity,
        shortfall: round2(Math.max(0, requirement.requiredQuantity - requirement.issuedQuantity)),
        unit: requirement.unit,
        status: requirement.status,
        issuedUnitCost: requirement.issuedUnitCost ?? 0,
      })),
    );
    return {
      kpis: [
        kpi("lines", "Requirement lines", rows.length),
        kpi("short", "Lines with shortfall", rows.filter((row) => Number(row.shortfall) > 0).length),
        kpi("issued", "Qty issued", sumBy(rows, (row) => Number(row.issuedQuantity))),
      ],
      rows,
    };
  },

  "ready-to-ship": ({ jobs }) => {
    const ready = jobs.filter((job) => job.status === "completed");
    return {
      kpis: [
        kpi("count", "Ready jobs", ready.length),
        kpi("qty", "Qty", sumBy(ready, (job) => job.quantity)),
      ],
      rows: ready.map((job) => ({
        id: job.id,
        jobNumber: job.jobNumber,
        salesOrderNumber: job.salesOrderNumber,
        customerName: job.customerName,
        productName: job.productName,
        quantity: job.quantity,
        actualEndDate: job.actualEndDate ?? "",
        actualCost: job.actualCost,
      })),
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

  "stock-reservation": ({ inventory }) => {
    const reserved = inventory.filter((item) => item.quantityReserved > 0);
    const rows = reserved.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      warehouse: item.warehouse,
      quantityOnHand: item.quantityOnHand,
      quantityReserved: item.quantityReserved,
      quantityAvailable: item.quantityAvailable,
      reservedPercent: percent(item.quantityReserved, item.quantityOnHand),
      stockStatus: item.stockStatus,
    }));
    return {
      kpis: [
        kpi("items", "Reserved items", rows.length),
        kpi("qty", "Qty reserved", sumBy(rows, (row) => Number(row.quantityReserved))),
      ],
      rows,
    };
  },

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

  "reprocessing-yield": ({ reprocessing }) => {
    const completed = reprocessing.filter((item) => item.status === "completed");
    const rows = completed.map((item) => ({
      id: item.id,
      batchNumber: item.batchNumber,
      inputScrapName: item.inputScrapName,
      inputQuantity: item.inputQuantity,
      recoveredQuantity: item.recoveredQuantity ?? 0,
      processLossQuantity: item.processLossQuantity ?? 0,
      yieldPercent: percent(item.recoveredQuantity ?? 0, item.inputQuantity),
      totalProcessingCost: item.totalProcessingCost,
      recoveredUnitCost: item.recoveredUnitCost ?? 0,
    }));
    return {
      kpis: [
        kpi("batches", "Completed batches", rows.length),
        kpi("yield", "Avg yield", rows.length ? round2(sumBy(rows, (row) => Number(row.yieldPercent)) / rows.length) : 0, "percent"),
        kpi("recovered", "Recovered qty", sumBy(rows, (row) => Number(row.recoveredQuantity))),
      ],
      rows,
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

  "receivables-aging": ({ invoices }) => {
    const open = invoices.filter((item) => item.outstandingAmount > 0 && item.status !== "void");
    const rows = open.map((item) => {
      const days = daysPastDue(item.dueDate);
      return {
        id: item.id,
        invoiceNumber: item.invoiceNumber,
        customerName: item.customerName,
        dueDate: item.dueDate,
        daysPastDue: days,
        agingBucket: agingBucket(days),
        outstandingAmount: item.outstandingAmount,
        status: item.status,
      };
    });
    return {
      kpis: [
        kpi("open", "Open invoices", rows.length),
        kpi("outstanding", "Outstanding", sumBy(rows, (row) => Number(row.outstandingAmount)), "currency"),
        kpi("overdue", "Past due", rows.filter((row) => Number(row.daysPastDue) > 0).length),
        kpi("overdueValue", "Past-due value", sumBy(rows.filter((row) => Number(row.daysPastDue) > 0), (row) => Number(row.outstandingAmount)), "currency"),
      ],
      rows,
    };
  },

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

  "on-time-delivery": ({ deliveries }) => {
    const delivered = deliveries.filter((item) => item.deliveredAt);
    const rows = delivered.map((item) => {
      const scheduled = parseISO(item.scheduledDate);
      const actual = parseISO(item.deliveredAt!);
      const variance = differenceInCalendarDays(actual, scheduled);
      return {
        id: item.id,
        deliveryNumber: item.deliveryNumber,
        customerName: item.customerName,
        scheduledDate: item.scheduledDate,
        deliveredAt: item.deliveredAt,
        varianceDays: variance,
        onTime: variance <= 0 ? "Yes" : "No",
        status: item.status,
      };
    });
    const onTime = rows.filter((row) => row.onTime === "Yes");
    return {
      kpis: [
        kpi("delivered", "Delivered", rows.length),
        kpi("onTime", "On time", onTime.length),
        kpi("rate", "On-time rate", percent(onTime.length, rows.length), "percent"),
      ],
      rows,
    };
  },

  "delivery-exceptions": ({ deliveries }) => {
    const exceptions = deliveries.filter((item) => EXCEPTION_DELIVERY_STATUSES.has(item.status));
    return {
      kpis: [
        kpi("count", "Exceptions", exceptions.length),
        kpi("failed", "Failed", exceptions.filter((item) => item.status === "failed").length),
        kpi("returned", "Returned", exceptions.filter((item) => item.status === "returned").length),
      ],
      rows: exceptions.map((item) => ({
        id: item.id,
        deliveryNumber: item.deliveryNumber,
        customerName: item.customerName,
        salesOrderNumber: item.salesOrderNumber,
        status: item.status,
        scheduledDate: item.scheduledDate,
        driverName: item.driverName ?? "",
        notes: item.notes ?? "",
      })),
    };
  },

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

  "customer-revenue": ({ customers }) => {
    const rows = [...customers]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        totalOrders: item.totalOrders,
        totalRevenue: item.totalRevenue,
        creditLimit: item.creditLimit ?? 0,
        status: item.status,
      }));
    return {
      kpis: [
        kpi("customers", "Customers", rows.length),
        kpi("revenue", "Revenue", sumBy(rows, (row) => Number(row.totalRevenue)), "currency"),
      ],
      rows,
    };
  },

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

  "product-standard-cost": ({ products }) => {
    const rows = products.map((product) => {
      const version = currentVersion(product);
      const breakdown = version?.costBreakdown;
      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        versionLabel: version?.label ?? "",
        materialCost: breakdown?.materialCost ?? 0,
        labourCost: breakdown?.labourCost ?? 0,
        machineCost: breakdown?.machineCost ?? 0,
        coatingFinishingCost: breakdown?.coatingFinishingCost ?? 0,
        overheadCost: breakdown?.overheadCost ?? 0,
        otherCost: breakdown?.otherCost ?? 0,
        costPrice: breakdown ? computeTotalCost(breakdown) : product.costPrice,
        basePrice: version?.basePrice ?? product.basePrice,
      };
    });
    return {
      kpis: [
        kpi("products", "Products", rows.length),
        kpi("material", "Material cost", sumBy(rows, (row) => Number(row.materialCost)), "currency"),
        kpi("labor", "Labor cost", sumBy(rows, (row) => Number(row.labourCost)), "currency"),
        kpi("total", "Standard cost", sumBy(rows, (row) => Number(row.costPrice)), "currency"),
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
