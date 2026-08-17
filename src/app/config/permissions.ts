export const PERMISSION_MODULES = {
  dashboard: "dashboard",
  products: "products",
  categories: "categories",
  inventory: "inventory",
  customers: "customers",
  quotations: "quotations",
  sales_orders: "sales_orders",
  finance: "finance",
  manufacturing: "manufacturing",
  delivery: "delivery",
  users: "users",
  roles: "roles",
  settings: "settings",
  audit_logs: "audit_logs",
} as const;

export type PermissionModule =
  (typeof PERMISSION_MODULES)[keyof typeof PERMISSION_MODULES];

export const PERMISSION_ACTIONS = {
  view: "view",
  create: "create",
  edit: "edit",
  delete: "delete",
  approve: "approve",
  send: "send",
  export: "export",
  assign: "assign",
  cancel: "cancel",
} as const;

export type PermissionAction =
  (typeof PERMISSION_ACTIONS)[keyof typeof PERMISSION_ACTIONS];

export type Permission = `${PermissionModule}:${PermissionAction}`;

function buildPermission(
  module: PermissionModule,
  action: PermissionAction,
): Permission {
  return `${module}:${action}`;
}

const MODULE_ACTIONS: Record<PermissionModule, readonly PermissionAction[]> = {
  dashboard: ["view", "export"],
  products: ["view", "create", "edit", "delete", "export"],
  categories: ["view", "create", "edit", "delete"],
  inventory: ["view", "create", "edit", "delete", "export", "assign"],
  customers: ["view", "create", "edit", "delete", "export"],
  quotations: ["view", "create", "edit", "delete", "approve", "send", "export", "cancel"],
  sales_orders: ["view", "create", "edit", "delete", "approve", "export", "assign", "cancel"],
  finance: ["view", "create", "edit", "delete", "approve", "export", "cancel"],
  manufacturing: ["view", "create", "edit", "delete", "approve", "assign", "export", "cancel"],
  delivery: ["view", "create", "edit", "delete", "assign", "export", "cancel"],
  users: ["view", "create", "edit", "delete", "assign"],
  roles: ["view", "create", "edit", "delete", "assign"],
  settings: ["view", "edit"],
  audit_logs: ["view", "export"],
};

export const ALL_PERMISSIONS: Permission[] = (
  Object.entries(MODULE_ACTIONS) as [PermissionModule, readonly PermissionAction[]][]
).flatMap(([module, actions]) =>
  actions.map((action) => buildPermission(module, action)),
);

export const PERMISSIONS_BY_MODULE: Record<PermissionModule, Permission[]> =
  Object.fromEntries(
    (Object.entries(MODULE_ACTIONS) as [PermissionModule, readonly PermissionAction[]][]).map(
      ([module, actions]) => [
        module,
        actions.map((action) => buildPermission(module, action)),
      ],
    ),
  ) as Record<PermissionModule, Permission[]>;
