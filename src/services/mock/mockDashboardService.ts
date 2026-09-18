import { buildDashboardSummary } from "@/features/dashboard/lib/buildDashboardSummary";
import type { DashboardService } from "@/services/interfaces/dashboardService";
import { mockAuditService } from "@/services/mock/mockAuditService";
import { mockCostingService } from "@/services/mock/mockCostingService";
import { mockCustomerService } from "@/services/mock/mockCustomerService";
import { mockDeliveryService } from "@/services/mock/mockDeliveryService";
import { mockInventoryService } from "@/services/mock/mockInventoryService";
import { mockNotificationService } from "@/services/mock/mockNotificationService";
import { mockProductService } from "@/services/mock/mockProductService";
import { mockProductionTrackingService } from "@/services/mock/mockProductionTrackingService";
import { mockQuotationService } from "@/services/mock/mockQuotationService";
import { mockReprocessingService } from "@/services/mock/mockReprocessingService";
import { mockSalesOrderService } from "@/services/mock/mockSalesOrderService";

const ALL = { page: 1, pageSize: 1000 } as const;

export const mockDashboardService: DashboardService = {
  async getSummary() {
    const [
      quotations,
      salesOrders,
      production,
      inventory,
      lowStock,
      customers,
      products,
      deliveries,
      costing,
      reprocessing,
      notifications,
      auditLogs,
    ] = await Promise.all([
      mockQuotationService.list(ALL),
      mockSalesOrderService.list(ALL),
      mockProductionTrackingService.getSnapshot(),
      mockInventoryService.list(ALL),
      mockInventoryService.getLowStock(),
      mockCustomerService.list(ALL),
      mockProductService.list(ALL),
      mockDeliveryService.list(ALL),
      mockCostingService.list(ALL),
      mockReprocessingService.list(ALL),
      mockNotificationService.list({ page: 1, pageSize: 12 }),
      mockAuditService.list({ page: 1, pageSize: 30, sortBy: "timestamp", sortDirection: "desc" }),
    ]);

    return buildDashboardSummary({
      quotations: quotations.items,
      salesOrders: salesOrders.items,
      production,
      inventory: inventory.items,
      lowStock,
      customers: customers.items,
      products: products.items,
      deliveries: deliveries.items,
      costing: costing.items,
      reprocessing: reprocessing.items,
      notifications: notifications.items,
      auditLogs: auditLogs.items,
    });
  },
};
