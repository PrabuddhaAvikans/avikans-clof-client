import { getReportDefinition } from "@/features/reports/catalog";
import { buildReportDataset, type ReportSources } from "@/features/reports/lib/buildReports";
import { initialCreditNotes } from "@/features/finance/mock/mockCreditNotes";
import { initialInvoices } from "@/features/finance/mock/mockInvoices";
import { delay } from "@/services/http";
import type { ReportService } from "@/services/interfaces/reportService";
import type { ReportSourceKey, ReportId } from "@/types/report";
import { mockAuditService } from "@/services/mock/mockAuditService";
import { mockCostingService } from "@/services/mock/mockCostingService";
import { mockCustomerService } from "@/services/mock/mockCustomerService";
import { mockDeliveryService } from "@/services/mock/mockDeliveryService";
import { mockInventoryService } from "@/services/mock/mockInventoryService";
import { mockManufacturingService } from "@/services/mock/mockManufacturingService";
import { mockProductService } from "@/services/mock/mockProductService";
import { mockQuotationService } from "@/services/mock/mockQuotationService";
import { mockReprocessingService } from "@/services/mock/mockReprocessingService";
import { mockSalesOrderService } from "@/services/mock/mockSalesOrderService";

const ALL = { page: 1, pageSize: 1000 } as const;

const emptySources = (): ReportSources => ({
  quotations: [],
  salesOrders: [],
  jobs: [],
  inventory: [],
  movements: [],
  customers: [],
  products: [],
  deliveries: [],
  costing: [],
  reprocessing: [],
  invoices: [],
  creditNotes: [],
  auditLogs: [],
});

async function loadSource(key: ReportSourceKey, sources: ReportSources): Promise<void> {
  switch (key) {
    case "quotations":
      sources.quotations = (await mockQuotationService.list(ALL)).items;
      return;
    case "salesOrders":
      sources.salesOrders = (await mockSalesOrderService.list(ALL)).items;
      return;
    case "jobs":
      sources.jobs = (await mockManufacturingService.list(ALL)).items;
      return;
    case "inventory":
      sources.inventory = (await mockInventoryService.list(ALL)).items;
      return;
    case "movements":
      sources.movements = (await mockInventoryService.listMovements(ALL)).items;
      return;
    case "customers":
      sources.customers = (await mockCustomerService.list(ALL)).items;
      return;
    case "products":
      sources.products = (await mockProductService.list(ALL)).items;
      return;
    case "deliveries":
      sources.deliveries = (await mockDeliveryService.list(ALL)).items;
      return;
    case "costing":
      sources.costing = (await mockCostingService.list(ALL)).items;
      return;
    case "reprocessing":
      sources.reprocessing = (await mockReprocessingService.list(ALL)).items;
      return;
    case "invoices":
      sources.invoices = initialInvoices;
      return;
    case "creditNotes":
      sources.creditNotes = initialCreditNotes;
      return;
    case "auditLogs":
      sources.auditLogs = (await mockAuditService.list(ALL)).items;
      return;
  }
}

export const mockReportService: ReportService = {
  async getReport(reportId: ReportId) {
    const definition = getReportDefinition(reportId);
    if (!definition) {
      throw {
        code: "NOT_FOUND",
        message: `Report '${reportId}' was not found.`,
        traceId: crypto.randomUUID(),
      };
    }

    const sources = emptySources();
    await Promise.all(definition.sources.map((source) => loadSource(source, sources)));
    await delay(80);
    return buildReportDataset(reportId, sources);
  },
};
