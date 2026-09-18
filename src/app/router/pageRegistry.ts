import type { ComponentType } from "react";
import {
  AuditLogsPage,
  PermissionsPage,
  RoleGroupsPage,
  RolesPage,
  SystemSettingsPage,
  UserFormPage,
  UsersPage,
} from "@/features/admin/pages/AdminPages";
import {
  CustomerActivityPage,
  CustomerDetailPage,
  CustomerFormPage,
  CustomerGroupsPage,
  CustomerListPage,
} from "@/features/customers/pages/CustomerPages";
import { DashboardPage } from "@/features/dashboard/pages/DashboardPage";
import { ReportsHubPage, ReportViewerPage } from "@/features/reports/pages/ReportsPages";
import {
  DeliveryCalendarPage,
  DeliveryDetailPage,
  DeliveryFormPage,
  DeliveryListPage,
  DispatchPage,
  ProofOfDeliveryPage,
} from "@/features/delivery/pages/DeliveryPages";
import {
  InventoryDetailPage,
  InventoryFormPage,
  InventoryListPage,
  LowStockPage,
  StockMovementsPage,
  StockOverviewPage,
  UnitsOfMeasurePage,
} from "@/features/inventory/pages/InventoryPages";
import {
  ReprocessingBatchDetailPage,
  ReprocessingBatchesPage,
} from "@/features/reprocessing/pages/ReprocessingPages";
import {
  ManufacturingJobDetailPage,
  ManufacturingJobFormPage,
  ManufacturingJobsPage,
  MaterialRequirementsPage,
  QualityInspectionPage,
  ReadyToShipPage,
  WorkOrdersPage,
} from "@/features/manufacturing/pages/ManufacturingPages";
import {
  BrandsPage,
  CategoriesPage,
  PriceListsPage,
  ProductAttributesPage,
  ProductDetailPage,
  ProductFormPage,
  ProductListPage,
} from "@/features/products/pages/ProductPages";
import {
  EstimateFormPage,
  QuotationPreviewPage,
  QuotationWorkspacePage,
  SalesOrderDetailPage,
  SalesOrderFormPage,
  SalesOrderWorkspacePage,
  SalesOrderReviewPage,
  InvoicesPage,
  PaymentsPage,
} from "@/features/sales/pages/SalesPages";
import { FinanceInvoicesPage, FinanceCreditNotesPage } from "@/features/finance/pages/FinancePages";
import { CostingApprovalWorkspacePage } from "@/features/costing/pages/CostingApprovalWorkspacePage";
import { EstimationWorkspacePage } from "@/features/costing/pages/EstimationWorkspacePage";
import { NotFoundPage } from "@/features/shared/pages/NotFoundPage";

export const PAGE_REGISTRY = {
  DashboardPage,
  ReportsHubPage,
  ReportViewerPage,
  QuotationWorkspacePage,
  EstimateFormPage,
  QuotationPreviewPage,
  CostingApprovalWorkspacePage,
  EstimationWorkspacePage,
  SalesOrderWorkspacePage,
  SalesOrderFormPage,
  SalesOrderReviewPage,
  SalesOrderDetailPage,
  PaymentsPage,
  InvoicesPage,
  FinanceInvoicesPage,
  FinanceCreditNotesPage,
  CustomerListPage,
  CustomerFormPage,
  CustomerGroupsPage,
  CustomerActivityPage,
  CustomerDetailPage,
  ProductListPage,
  ProductFormPage,
  CategoriesPage,
  BrandsPage,
  ProductAttributesPage,
  PriceListsPage,
  ProductDetailPage,
  InventoryListPage,
  InventoryDetailPage,
  InventoryFormPage,
  StockOverviewPage,
  StockMovementsPage,
  LowStockPage,
  UnitsOfMeasurePage,
  ReprocessingBatchesPage,
  ReprocessingBatchDetailPage,
  ReadyToShipPage,
  ManufacturingJobFormPage,
  ManufacturingJobDetailPage,
  ManufacturingJobsPage,
  WorkOrdersPage,
  MaterialRequirementsPage,
  QualityInspectionPage,
  DeliveryListPage,
  DeliveryFormPage,
  DeliveryCalendarPage,
  DispatchPage,
  ProofOfDeliveryPage,
  DeliveryDetailPage,
  UserFormPage,
  UsersPage,
  RolesPage,
  RoleGroupsPage,
  PermissionsPage,
  SystemSettingsPage,
  AuditLogsPage,
  NotFoundPage,
} as const satisfies Record<string, ComponentType>;

export type PageKey = keyof typeof PAGE_REGISTRY;
