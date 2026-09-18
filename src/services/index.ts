export { mockAuthService as authService } from "@/services/mock/mockAuthService";
export { mockProductService as productService } from "@/services/mock/mockProductService";
export { mockCategoryService as categoryService } from "@/services/mock/mockCategoryService";
export { mockBrandService as brandService } from "@/services/mock/mockBrandService";
export { mockInventoryService as inventoryService } from "@/services/mock/mockInventoryService";
export { mockCustomerService as customerService } from "@/services/mock/mockCustomerService";
export { mockQuotationService as quotationService } from "@/services/mock/mockQuotationService";
export { mockSalesOrderService as salesOrderService } from "@/services/mock/mockSalesOrderService";
export { mockManufacturingService as manufacturingService } from "@/services/mock/mockManufacturingService";
export { mockDeliveryService as deliveryService } from "@/services/mock/mockDeliveryService";
export { mockUserService as userService, mockRoleService as roleService } from "@/services/mock/mockUserService";
export { mockAuditService as auditService } from "@/services/mock/mockAuditService";
export { mockNotificationService as notificationService } from "@/services/mock/mockNotificationService";
export { mockDashboardService as dashboardService } from "@/services/mock/mockDashboardService";
export { mockReportService as reportService } from "@/services/mock/mockReportService";
export { mockCostingService as costingService } from "@/services/mock/mockCostingService";
export { mockProductionTrackingService as productionTrackingService } from "@/services/mock/mockProductionTrackingService";
export { mockReprocessingService as reprocessingService } from "@/services/mock/mockReprocessingService";

export type { AuthService, LoginCredentials } from "@/services/interfaces/authService";
export type { ProductService, ProductListFilters } from "@/services/interfaces/productService";
export type { CategoryService, CategoryListFilters, CategoryFormData } from "@/services/interfaces/categoryService";
export type { BrandService, BrandListFilters, BrandFormData } from "@/services/interfaces/brandService";
export type { InventoryService, InventoryListFilters, InventoryFormData, StockMovementFilters } from "@/services/interfaces/inventoryService";
export type { CustomerService, CustomerListFilters, CustomerFormData } from "@/services/interfaces/customerService";
export type { QuotationService, QuotationListFilters, QuotationFormData, QuotationContactInput } from "@/services/interfaces/quotationService";
export type { SalesOrderService, SalesOrderListFilters, SalesOrderFormData } from "@/services/interfaces/salesOrderService";
export type { ManufacturingService, ManufacturingListFilters, ManufacturingJobFormData } from "@/services/interfaces/manufacturingService";
export type { DeliveryService, DeliveryListFilters, DeliveryFormData } from "@/services/interfaces/deliveryService";
export type { UserService, UserListFilters, UserFormData, RoleService, RoleListFilters, RoleFormData, RoleGroupFormData } from "@/services/interfaces/userService";
export type { AuditService, AuditLogListFilters } from "@/services/interfaces/auditService";
export type { NotificationService, NotificationListFilters } from "@/services/interfaces/notificationService";
export type { DashboardService } from "@/services/interfaces/dashboardService";
export type { ReportService } from "@/services/interfaces/reportService";
export type { CostingService, CostingListFilters, CoatingSubmitData } from "@/services/interfaces/costingService";
export type {
  ProductionTrackingService,
  ProductionTrackingFilters,
} from "@/services/interfaces/productionTrackingService";
export type {
  ReprocessingService,
  ReprocessingListFilters,
} from "@/services/interfaces/reprocessingService";
