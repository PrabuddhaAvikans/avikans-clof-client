import type { Permission } from "@/app/config/permissions";
import { ROUTES } from "@/app/config/routes";

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  permission?: Permission;
  children?: NavItem[];
}

export const NAVIGATION: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    path: ROUTES.dashboard,
    icon: "LayoutDashboard",
    permission: "dashboard:view",
  },
  {
    id: "reports",
    label: "Reports",
    path: ROUTES.reports.hub,
    icon: "BarChart3",
    permission: "reports:view",
  },
  {
    id: "sales",
    label: "Sales",
    path: ROUTES.quotations.list,
    icon: "ShoppingCart",
    children: [
      {
        id: "sales-quotations",
        label: "Quotations",
        path: ROUTES.quotations.list,
        icon: "FileText",
        permission: "quotations:view",
      },
      {
        id: "sales-orders",
        label: "Sales Orders",
        path: ROUTES.salesOrders.list,
        icon: "ClipboardList",
        permission: "sales_orders:view",
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    path: ROUTES.costing.workspace,
    icon: "ClipboardCheck",
    children: [
      {
        id: "ops-estimation",
        label: "Product Estimation",
        path: ROUTES.estimation.workspace,
        icon: "Layers",
        permission: "quotations:view",
      },
      {
        id: "ops-costing",
        label: "Costing & Approval",
        path: ROUTES.costing.workspace,
        icon: "Calculator",
        permission: "quotations:view",
      },
    ],
  },
   {
    id: "manufacturing",
    label: "Production",
    path: ROUTES.manufacturing.jobs,
    icon: "Factory",
    children: [
      {
        id: "manufacturing-jobs",
        label: "Production Jobs",
        path: ROUTES.manufacturing.jobs,
        icon: "Cog",
        permission: "manufacturing:view",
      },
      {
        id: "manufacturing-quality",
        label: "Quality Check",
        path: ROUTES.manufacturing.quality,
        icon: "ShieldCheck",
        permission: "manufacturing:view",
      },
      {
        id: "manufacturing-ready-to-ship",
        label: "Ready to Ship",
        path: ROUTES.manufacturing.readyToShip,
        icon: "PackageCheck",
        permission: "manufacturing:view",
      },
    ],
  },
  {
    id: "customers",
    label: "Customers",
    path: ROUTES.customers.list,
    icon: "Users",
    children: [
      {
        id: "customers-list",
        label: "Customer List",
        path: ROUTES.customers.list,
        icon: "Users",
        permission: "customers:view",
      },
    ],
  },
  {
    id: "products",
    label: "Products",
    path: ROUTES.products.list,
    icon: "Package",
    children: [
      {
        id: "products-list",
        label: "Product List",
        path: ROUTES.products.list,
        icon: "Package",
        permission: "products:view",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    path: ROUTES.inventory.list,
    icon: "Warehouse",
    children: [
      {
        id: "inventory-items",
        label: "Inventory Items",
        path: ROUTES.inventory.list,
        icon: "Boxes",
        permission: "inventory:view",
      },
      {
        id: "inventory-movements",
        label: "Stock Movements",
        path: ROUTES.inventory.movements,
        icon: "ArrowLeftRight",
        permission: "inventory:view",
      },
      {
        id: "inventory-reprocessing",
        label: "Reprocessing",
        path: ROUTES.reprocessing.list,
        icon: "Flame",
        permission: "manufacturing:view",
      },
      {
        id: "inventory-low-stock",
        label: "Low-Stock Items",
        path: ROUTES.inventory.lowStock,
        icon: "AlertTriangle",
        permission: "inventory:view",
      },
    ],
  },
  {
    id: "period-close",
    label: "Period Close",
    path: ROUTES.periodClose.day,
    icon: "CalendarCheck",
    children: [
      {
        id: "period-close-day",
        label: "Day Close",
        path: ROUTES.periodClose.day,
        icon: "Calendar",
        permission: "period_close:view",
      },
      {
        id: "period-close-month",
        label: "Monthly Close",
        path: ROUTES.periodClose.month,
        icon: "CalendarRange",
        permission: "period_close:view",
      },
    ],
  },
  {
    id: "configuration",
    label: "Configuration",
    path: ROUTES.configuration.hub,
    icon: "SlidersHorizontal",
    children: [
      {
        id: "config-units",
        label: "Units of Measure",
        path: ROUTES.configuration.units,
        icon: "Ruler",
        permission: "inventory:view",
      },
      {
        id: "config-warehouses",
        label: "Warehouses",
        path: ROUTES.configuration.warehouses,
        icon: "Building2",
        permission: "inventory:view",
      },
      {
        id: "config-categories",
        label: "Categories",
        path: ROUTES.configuration.categories,
        icon: "FolderTree",
        permission: "categories:view",
      },
      {
        id: "config-brands",
        label: "Brands",
        path: ROUTES.configuration.brands,
        icon: "Tag",
        permission: "products:view",
      },
      {
        id: "config-workflows",
        label: "Workflows",
        path: ROUTES.configuration.workflows,
        icon: "Workflow",
        permission: "settings:view",
      },
      {
        id: "config-settings",
        label: "System Settings",
        path: ROUTES.configuration.settings,
        icon: "Settings",
        permission: "settings:view",
      },
    ],
  },
  {
    id: "admin",
    label: "Administration",
    path: ROUTES.admin.users,
    icon: "UserCog",
    children: [
      {
        id: "admin-users",
        label: "Users",
        path: ROUTES.admin.users,
        icon: "Users",
        permission: "users:view",
      },
      {
        id: "admin-roles",
        label: "Roles",
        path: ROUTES.admin.roles,
        icon: "Shield",
        permission: "roles:view",
      },
      {
        id: "admin-role-groups",
        label: "Role Groups",
        path: ROUTES.admin.roleGroups,
        icon: "UsersRound",
        permission: "roles:view",
      },
      {
        id: "admin-permissions",
        label: "Permissions",
        path: ROUTES.admin.permissions,
        icon: "KeyRound",
        permission: "roles:view",
      },
      {
        id: "admin-audit-logs",
        label: "Audit Logs",
        path: ROUTES.admin.auditLogs,
        icon: "ScrollText",
        permission: "audit_logs:view",
      },
    ],
  },
];
