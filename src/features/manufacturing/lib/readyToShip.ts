import { isQcPassed, requiredTasks } from "@/lib/manufacturingTasks";
import { formatDate } from "@/lib/format";
import type { ManufacturingJob } from "@/types/manufacturing";
import type { SalesOrder } from "@/types/sales-order";
import { SalesOrderStatus } from "@/types/status";

const IGNORED_DELIVERY_STATUSES = new Set(["cancelled", "failed", "returned"]);
const SHIPPED_DELIVERY_STATUSES = new Set(["delivered", "partially_delivered"]);

export type ShipDisposition = "ready" | "on_delivery" | "shipped" | "blocked";

export const SHIP_DISPOSITION_LABEL: Record<ShipDisposition, string> = {
  ready: "Can ship",
  on_delivery: "Delivery booked",
  shipped: "Delivered",
  blocked: "Not ready",
};

export type ShipCandidate = {
  id: string;
  salesOrderNumber: string;
  productSku: string;
  quantity: number;
  status: string;
  completedAt?: string;
};

export type ShipDelivery = {
  id: string;
  deliveryNumber: string;
  salesOrderNumber: string;
  status: string;
  items: Array<{
    productSku: string;
    quantityOrdered: number;
    quantityDelivered: number;
  }>;
};

export type LinkedDelivery = {
  id: string;
  deliveryNumber: string;
  status: string;
  quantity: number;
  kind: "shipped" | "reserved";
};

export type ShipCoverage = {
  shippedQuantity: number;
  reservedQuantity: number;
  remainingQuantity: number;
  deliveries: LinkedDelivery[];
};

export type ShipCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

function lineKey(salesOrderNumber: string, productSku: string) {
  return `${salesOrderNumber}::${productSku}`;
}

function deliveryLineQuantity(status: string, quantityOrdered: number, quantityDelivered: number) {
  if (IGNORED_DELIVERY_STATUSES.has(status)) return { shipped: 0, reserved: 0 };
  if (SHIPPED_DELIVERY_STATUSES.has(status)) {
    const shipped = quantityDelivered > 0 ? quantityDelivered : quantityOrdered;
    return { shipped, reserved: 0 };
  }
  return { shipped: 0, reserved: quantityOrdered };
}

/**
 * Splits delivered and open delivery quantities across completed jobs
 * for the same sales order and product, oldest completion first.
 */
export function coverCompletedJobs(
  jobs: ShipCandidate[],
  deliveries: ShipDelivery[],
): Map<string, ShipCoverage> {
  const completed = jobs
    .filter((job) => job.status === "completed")
    .slice()
    .sort((a, b) => {
      const aTime = a.completedAt ?? "";
      const bTime = b.completedAt ?? "";
      if (aTime !== bTime) return aTime < bTime ? -1 : 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

  const pools = new Map<
    string,
    { shipped: number; reserved: number; deliveries: LinkedDelivery[] }
  >();

  for (const delivery of deliveries) {
    for (const item of delivery.items) {
      const key = lineKey(delivery.salesOrderNumber, item.productSku);
      const amounts = deliveryLineQuantity(
        delivery.status,
        item.quantityOrdered,
        item.quantityDelivered,
      );
      if (amounts.shipped === 0 && amounts.reserved === 0) continue;
      const pool = pools.get(key) ?? { shipped: 0, reserved: 0, deliveries: [] };
      pool.shipped += amounts.shipped;
      pool.reserved += amounts.reserved;
      pool.deliveries.push({
        id: delivery.id,
        deliveryNumber: delivery.deliveryNumber,
        status: delivery.status,
        quantity: amounts.shipped || amounts.reserved,
        kind: amounts.shipped > 0 ? "shipped" : "reserved",
      });
      pools.set(key, pool);
    }
  }

  const coverage = new Map<string, ShipCoverage>();
  for (const job of completed) {
    const key = lineKey(job.salesOrderNumber, job.productSku);
    const pool = pools.get(key) ?? { shipped: 0, reserved: 0, deliveries: [] };
    const shippedQuantity = Math.min(job.quantity, pool.shipped);
    pool.shipped -= shippedQuantity;
    const reservedQuantity = Math.min(job.quantity - shippedQuantity, pool.reserved);
    pool.reserved -= reservedQuantity;
    coverage.set(job.id, {
      shippedQuantity,
      reservedQuantity,
      remainingQuantity: Math.max(0, job.quantity - shippedQuantity - reservedQuantity),
      deliveries: pool.deliveries,
    });
  }

  return coverage;
}

export function buildShipChecks(
  job: ManufacturingJob,
  order: SalesOrder | undefined,
): ShipCheck[] {
  const required = requiredTasks(job.tasks);
  const openTasks = required.filter((task) => task.status !== "completed");
  const openRework = job.tasks.filter(
    (task) =>
      task.isRework &&
      task.status !== "completed" &&
      task.status !== "cancelled" &&
      task.status !== "skipped",
  );
  const shortMaterials = job.materialRequirements.filter(
    (item) => item.requiredQuantity > 0 && item.issuedQuantity < item.requiredQuantity,
  );
  const qcPassed = isQcPassed(job);
  const inspection = job.qualityInspection;

  return [
    {
      id: "production",
      label: "Making is finished",
      passed: job.status === "completed",
      detail:
        job.status === "completed"
          ? job.actualEndDate
            ? `Finished on ${formatDate(job.actualEndDate)}.`
            : "This job is finished."
          : "This job is still being made.",
    },
    {
      id: "tasks",
      label: "All steps are done",
      passed: required.length > 0 && openTasks.length === 0,
      detail:
        required.length === 0
          ? "This job has no steps to finish."
          : openTasks.length === 0
            ? "Every step is done."
            : `Still to finish: ${openTasks.map((task) => task.name).join(", ")}.`,
    },
    {
      id: "rework",
      label: "Nothing to fix",
      passed: openRework.length === 0,
      detail:
        openRework.length === 0
          ? "Nothing was sent back to be fixed."
          : `Still being fixed: ${openRework.map((task) => task.name).join(", ")}.`,
    },
    {
      id: "quality",
      label: "Quality passed",
      passed: qcPassed,
      detail: qcPassed
        ? inspection
          ? `Quality passed (${inspection.inspectionNumber}).`
          : "Quality passed."
        : "Quality has not passed yet.",
    },
    {
      id: "materials",
      label: "Materials are ready",
      passed: shortMaterials.length === 0,
      detail:
        shortMaterials.length === 0
          ? "Materials for this job are issued."
          : `Still short: ${shortMaterials
              .map(
                (item) =>
                  `${item.inventoryItemName} (${item.issuedQuantity} of ${item.requiredQuantity} ${item.unit})`,
              )
              .join(", ")}.`,
    },
    {
      id: "order",
      label: "Order can be delivered",
      passed: Boolean(order) && order?.status !== "cancelled",
      detail: !order
        ? "The sales order could not be found."
        : order.status === "cancelled"
          ? "This sales order was cancelled."
          : `Sales order is ${SalesOrderStatus[order.status]?.label ?? order.status}.`,
    },
  ];
}

export function shipDisposition(
  coverage: ShipCoverage,
  checksPassed: boolean,
): ShipDisposition {
  if (!checksPassed) return "blocked";
  if (coverage.remainingQuantity > 0) return "ready";
  if (coverage.reservedQuantity > 0) return "on_delivery";
  return "shipped";
}

export function emptyCoverage(quantity: number): ShipCoverage {
  return {
    shippedQuantity: 0,
    reservedQuantity: 0,
    remainingQuantity: quantity,
    deliveries: [],
  };
}
