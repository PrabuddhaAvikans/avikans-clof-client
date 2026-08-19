import { buildCostingFromSalesOrder } from "@/services/mock/costingFactory";
import { initialSalesOrders } from "@/services/mock/data/sales-orders";
import type { CostingRequest } from "@/types/costing";

export const initialSalesOrderCostingRequests: CostingRequest[] =
  initialSalesOrders.map((order) => {
    const awaitingCosting = order.status === "draft" || order.status === "pending_review";
    return buildCostingFromSalesOrder(order, {
      coatingStatus: awaitingCosting ? "pending" : "submitted",
      status: awaitingCosting ? "pending" : "approved",
      coatingUnitCost: awaitingCosting ? 0 : 1850,
    });
  });
