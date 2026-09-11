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
      {
        id: "customers-create",
        label: "Create Customer",
        path: ROUTES.customers.new,
        icon: "UserPlus",
        permission: "customers:create",
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
      {
        id: "products-categories",
        label: "Categories",
        path: ROUTES.products.categories,
        icon: "FolderTree",
        permission: "categories:view",
      },
      {
        id: "products-brands",
        label: "Brands",
        path: ROUTES.products.brands,
        icon: "Tag",
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
        id: "manufacturing-tracking",
        label: "Production Tracking",
        path: ROUTES.manufacturing.tracking,
        icon: "Kanban",
        permission: "manufacturing:view",
      },
      {
        id: "manufacturing-board",
        label: "Production Board",
        path: ROUTES.manufacturing.board,
        icon: "ListOrdered",
        permission: "manufacturing:view",
      },
      {
        id: "manufacturing-quality",
        label: "Quality Check",
        path: ROUTES.manufacturing.quality,
        icon: "ShieldCheck",
        permission: "manufacturing:view",
      },
      // {
      //   id: "manufacturing-material-requirements",
      //   label: "Material Requirements",
      //   path: ROUTES.manufacturing.materialRequirements,
      //   icon: "PackageSearch",
      //   permission: "manufacturing:view",
      // },
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
    ],
  },
];
