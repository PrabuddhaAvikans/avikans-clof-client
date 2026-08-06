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
      // {
      //   id: "sales-orders",
      //   label: "Sales Orders",
      //   path: ROUTES.salesOrders.list,
      //   icon: "ClipboardList",
      //   permission: "sales_orders:view",
      // },
      // {
      //   id: "sales-payments",
      //   label: "Payments",
      //   path: "/sales/payments",
      //   icon: "CreditCard",
      //   permission: "sales_orders:view",
      // },
      // {
      //   id: "sales-invoices",
      //   label: "Invoices",
      //   path: "/sales/invoices",
      //   icon: "Receipt",
      //   permission: "sales_orders:view",
      // },
    ],
  },
  // {
  //   id: "operations",
  //   label: "Operations",
  //   path: ROUTES.costing.workspace,
  //   icon: "ClipboardCheck",
  //   children: [
  //     {
  //       id: "ops-coating",
  //       label: "Coating Requests",
  //       path: "/operations/coating",
  //       icon: "Layers",
  //       permission: "quotations:view",
  //     },
  //     {
  //       id: "ops-workshops",
  //       label: "Workshops",
  //       path: "/operations/workshops",
  //       icon: "Wrench",
  //       permission: "quotations:view",
  //     },
  //     {
  //       id: "ops-costing",
  //       label: "Costing & Approval",
  //       path: ROUTES.costing.workspace,
  //       icon: "Calculator",
  //       permission: "quotations:view",
  //     },
  //   ],
  // },
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
      // {
      //   id: "customers-groups",
      //   label: "Customer Groups",
      //   path: ROUTES.customers.groups,
      //   icon: "UsersRound",
      //   permission: "customers:view",
      // },
      // {
      //   id: "customers-activity",
      //   label: "Customer Activity",
      //   path: ROUTES.customers.activity,
      //   icon: "Activity",
      //   permission: "customers:view",
      // },
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
      // {
      //   id: "products-create",
      //   label: "Create Product",
      //   path: ROUTES.products.new,
      //   icon: "Plus",
      //   permission: "products:create",
      // },
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
      // {
      //   id: "products-attributes",
      //   label: "Product Attributes",
      //   path: ROUTES.products.attributes,
      //   icon: "SlidersHorizontal",
      //   permission: "products:view",
      // },
      // {
      //   id: "products-price-lists",
      //   label: "Price Lists",
      //   path: ROUTES.products.priceLists,
      //   icon: "ListOrdered",
      //   permission: "products:view",
      // },
    ],
  },
  // {
  //   id: "inventory",
  //   label: "Inventory",
  //   path: ROUTES.inventory.list,
  //   icon: "Warehouse",
  //   children: [
  //     {
  //       id: "inventory-items",
  //       label: "Inventory Items",
  //       path: ROUTES.inventory.list,
  //       icon: "Boxes",
  //       permission: "inventory:view",
  //     },
  //     {
  //       id: "inventory-movements",
  //       label: "Stock Movements",
  //       path: ROUTES.inventory.movements,
  //       icon: "ArrowLeftRight",
  //       permission: "inventory:view",
  //     },
  //     {
  //       id: "inventory-low-stock",
  //       label: "Low-Stock Items",
  //       path: ROUTES.inventory.lowStock,
  //       icon: "AlertTriangle",
  //       permission: "inventory:view",
  //     }
  //   ],
  // },
  // {
  //   id: "manufacturing",
  //   label: "Production",
  //   path: ROUTES.manufacturing.tracking,
  //   icon: "Factory",
  //   children: [
  //     {
  //       id: "manufacturing-tracking",
  //       label: "Production Tracking",
  //       path: ROUTES.manufacturing.tracking,
  //       icon: "Kanban",
  //       permission: "manufacturing:view",
  //     },
  //     {
  //       id: "manufacturing-quality",
  //       label: "Quality Check",
  //       path: ROUTES.manufacturing.quality,
  //       icon: "ShieldCheck",
  //       permission: "manufacturing:view",
  //     },
  //     {
  //       id: "manufacturing-ready-to-ship",
  //       label: "Ready to Ship",
  //       path: ROUTES.manufacturing.readyToShip,
  //       icon: "PackageSearch",
  //       permission: "manufacturing:view",
  //     },
  //     {
  //       id: "manufacturing-jobs",
  //       label: "Manufacturing Jobs",
  //       path: ROUTES.manufacturing.jobs,
  //       icon: "Cog",
  //       permission: "manufacturing:view",
  //     },
  //     {
  //       id: "manufacturing-work-orders",
  //       label: "Work Orders",
  //       path: ROUTES.manufacturing.workOrders,
  //       icon: "ClipboardCheck",
  //       permission: "manufacturing:view",
  //     },
  //     {
  //       id: "manufacturing-board",
  //       label: "Production Board",
  //       path: ROUTES.manufacturing.board,
  //       icon: "ListOrdered",
  //       permission: "manufacturing:view",
  //     },
  //     {
  //       id: "manufacturing-material-requirements",
  //       label: "Material Requirements",
  //       path: ROUTES.manufacturing.materialRequirements,
  //       icon: "PackageSearch",
  //       permission: "manufacturing:view",
  //     },
  //   ],
  // },
  // {
  //   id: "delivery",
  //   label: "Delivery",
  //   path: ROUTES.deliveries.list,
  //   icon: "Truck",
  //   children: [
  //     {
  //       id: "delivery-list",
  //       label: "Delivery List",
  //       path: ROUTES.deliveries.list,
  //       icon: "Truck",
  //       permission: "delivery:view",
  //     },
  //     {
  //       id: "delivery-schedule",
  //       label: "Delivery Schedule",
  //       path: ROUTES.deliveries.calendar,
  //       icon: "Calendar",
  //       permission: "delivery:view",
  //     },
  //     {
  //       id: "delivery-dispatch",
  //       label: "Dispatch",
  //       path: ROUTES.deliveries.list,
  //       icon: "Send",
  //       permission: "delivery:view",
  //     },
  //     {
  //       id: "delivery-proof",
  //       label: "Proof of Delivery",
  //       path: ROUTES.deliveries.list,
  //       icon: "FileCheck",
  //       permission: "delivery:view",
  //     },
  //   ],
  // },
  // {
  //   id: "administration",
  //   label: "Administration",
  //   path: ROUTES.admin.users,
  //   icon: "Settings",
  //   children: [
  //     {
  //       id: "admin-users",
  //       label: "Users",
  //       path: ROUTES.admin.users,
  //       icon: "UserCog",
  //       permission: "users:view",
  //     },
  //     {
  //       id: "admin-roles",
  //       label: "Roles",
  //       path: ROUTES.admin.roles,
  //       icon: "Shield",
  //       permission: "roles:view",
  //     },
  //     {
  //       id: "admin-role-groups",
  //       label: "Role Groups",
  //       path: ROUTES.admin.roleGroups,
  //       icon: "ShieldHalf",
  //       permission: "roles:view",
  //     },
  //     {
  //       id: "admin-permissions",
  //       label: "Permissions",
  //       path: ROUTES.admin.permissions,
  //       icon: "KeyRound",
  //       permission: "roles:view",
  //     },
  //     {
  //       id: "admin-settings",
  //       label: "System Settings",
  //       path: ROUTES.admin.settings,
  //       icon: "Settings",
  //       permission: "settings:view",
  //     },
  //     {
  //       id: "admin-notifications",
  //       label: "Notification Settings",
  //       path: ROUTES.admin.notifications,
  //       icon: "Bell",
  //       permission: "settings:view",
  //     },
  //     {
  //       id: "admin-audit-logs",
  //       label: "Audit Logs",
  //       path: ROUTES.admin.auditLogs,
  //       icon: "ScrollText",
  //       permission: "audit_logs:view",
  //     },
  //   ],
  // },
];
