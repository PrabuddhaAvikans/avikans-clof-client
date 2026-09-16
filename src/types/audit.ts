export const AUDIT_SEVERITIES = ["info", "warning", "critical"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];

export const AUDIT_ACTIONS = [
  "created",
  "updated",
  "deleted",
  "approved",
  "rejected",
  "assigned",
  "exported",
  "login",
  "logout",
  "failed_login",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITIES = [
  "User",
  "Role",
  "RoleGroup",
  "Quotation",
  "SalesOrder",
  "Product",
  "Customer",
  "InventoryItem",
  "ManufacturingJob",
  "Delivery",
  "Settings",
  "Session",
] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

export interface AuditChange {
  field: string;
  from?: string;
  to?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId: string;
  entityLabel?: string;
  details: string;
  severity: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  changes?: AuditChange[];
}

export interface AuditLogSummary {
  total: number;
  info: number;
  warning: number;
  critical: number;
  today: number;
}
