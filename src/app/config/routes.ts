export const ROUTES = {
  home: "/",
  login: "/login",
  dashboard: "/dashboard",

  products: {
    list: "/products",
    new: "/products/new",
    detail: (id: string) => `/products/${id}` as const,
    edit: (id: string) => `/products/${id}/edit` as const,
    categories: "/products/categories",
    brands: "/products/brands",
    attributes: "/products/attributes",
    priceLists: "/products/price-lists",
  },

  inventory: {
    list: "/inventory",
    new: "/inventory/new",
    detail: (id: string) => `/inventory/${id}` as const,
    edit: (id: string) => `/inventory/${id}/edit` as const,
    movements: "/inventory/movements",
    lowStock: "/inventory/low-stock",
    stock: "/inventory/stock",
    units: "/inventory/units",
  },

  reprocessing: {
    list: "/inventory/reprocessing",
    detail: (id: string) => `/inventory/reprocessing/${id}` as const,
  },

  customers: {
    list: "/customers",
    new: "/customers/new",
    detail: (id: string) => `/customers/${id}` as const,
    edit: (id: string) => `/customers/${id}/edit` as const,
    groups: "/customers/groups",
    activity: "/customers/activity",
  },

  estimates: {
    list: "/quotations",
    new: "/quotations/new",
    detail: (id: string) => `/quotations/${id}` as const,
    edit: (id: string) => `/quotations/${id}/edit` as const,
    preview: (id: string) => `/quotations/${id}/preview` as const,
  },

  costing: {
    workspace: "/costing/approval",
    forOrder: (salesOrderId: string) =>
      `/costing/approval?salesOrderId=${encodeURIComponent(salesOrderId)}` as const,
  },

  estimation: {
    workspace: "/operations/estimation",
    forOrder: (salesOrderId: string) =>
      `/operations/estimation?salesOrderId=${encodeURIComponent(salesOrderId)}` as const,
  },

  quotations: {
    list: "/quotations",
    new: "/quotations/new",
    detail: (id: string) => `/quotations/${id}` as const,
    edit: (id: string) => `/quotations/${id}/edit` as const,
    preview: (id: string) => `/quotations/${id}/preview` as const,
    send: (id: string) => `/quotations/${id}/send` as const,
  },

  salesOrders: {
    list: "/sales-orders",
    new: "/sales-orders/new",
    detail: (id: string) => `/sales-orders/${id}` as const,
    edit: (id: string) => `/sales-orders/${id}/edit` as const,
    review: (id: string) => `/sales-orders/${id}/review` as const,
  },

  finance: {
    invoices: "/finance/invoices",
    invoiceDetail: (id: string) => `/finance/invoices/${id}` as const,
    creditNotes: "/finance/credit-notes",
    creditNoteDetail: (id: string) => `/finance/credit-notes/${id}` as const,
  },

  manufacturing: {
    jobs: "/manufacturing/jobs",
    jobsNew: "/manufacturing/jobs/new",
    jobDetail: (id: string) => `/manufacturing/jobs/${id}` as const,
    tracking: "/manufacturing/tracking",
    board: "/manufacturing/board",
    quality: "/manufacturing/quality",
    readyToShip: "/manufacturing/ready-to-ship",
    materialRequirements: "/manufacturing/material-requirements",
    workOrders: "/manufacturing/work-orders",
  },

  deliveries: {
    list: "/deliveries",
    new: "/deliveries/new",
    detail: (id: string) => `/deliveries/${id}` as const,
    dispatch: (id: string) => `/deliveries/${id}/dispatch` as const,
    proof: (id: string) => `/deliveries/${id}/proof` as const,
    calendar: "/deliveries/calendar",
    schedule: "/deliveries/schedule",
  },

  admin: {
    users: "/admin/users",
    usersNew: "/admin/users/new",
    userEdit: (id: string) => `/admin/users/${id}/edit` as const,
    roles: "/admin/roles",
    roleGroups: "/admin/role-groups",
    permissions: "/admin/permissions",
    settings: "/admin/settings",
    auditLogs: "/admin/audit-logs",
  },

  // Legacy aliases kept for gradual migration
  sales: {
    root: "/quotations",
    estimates: "/quotations",
    quotations: "/quotations",
    orders: "/sales-orders",
    payments: "/sales-orders",
    invoices: "/sales-orders",
  },
  delivery: {
    root: "/deliveries",
    list: "/deliveries",
    schedule: "/deliveries/schedule",
    dispatch: "/deliveries",
    proof: "/deliveries",
    detail: (id: string) => `/deliveries/${id}` as const,
  },
} as const;

export type AppRoute = typeof ROUTES;
