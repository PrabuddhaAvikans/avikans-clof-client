import type { PermissionModule } from "@/app/config/permissions";

export const PERMISSION_MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: "Dashboard",
  products: "Products",
  categories: "Categories",
  inventory: "Inventory",
  customers: "Customers",
  quotations: "Quotations",
  sales_orders: "Sales Orders",
  finance: "Finance",
  manufacturing: "Manufacturing",
  delivery: "Delivery",
  users: "Users",
  roles: "Roles",
  settings: "Settings",
  audit_logs: "Audit Logs",
  reports: "Reports",
  period_close: "Period Close",
};
