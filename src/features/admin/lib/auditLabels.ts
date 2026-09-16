import { format, isToday, isYesterday, parseISO } from "date-fns";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Cog,
  Factory,
  FileText,
  KeyRound,
  Package,
  Settings,
  Shield,
  Truck,
  UserCog,
  Users,
  UsersRound,
  Warehouse,
} from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import type { StatusBadgeVariant } from "@/components/ui/StatusBadge";
import type { AuditAction, AuditEntity, AuditSeverity } from "@/types/audit";

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  approved: "Approved",
  rejected: "Rejected",
  assigned: "Assigned",
  exported: "Exported",
  login: "Signed in",
  logout: "Signed out",
  failed_login: "Failed login",
};

export const AUDIT_SEVERITY_LABELS: Record<AuditSeverity, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

export const AUDIT_SEVERITY_RAIL: Record<AuditSeverity, string> = {
  info: "bg-info",
  warning: "bg-warning",
  critical: "bg-destructive",
};

const ENTITY_ICONS: Record<AuditEntity, LucideIcon> = {
  User: Users,
  Role: Shield,
  RoleGroup: UsersRound,
  Quotation: FileText,
  SalesOrder: ClipboardList,
  Product: Package,
  Customer: UserCog,
  InventoryItem: Warehouse,
  ManufacturingJob: Factory,
  Delivery: Truck,
  Settings: Settings,
  Session: KeyRound,
};

export function auditEntityIcon(entity: AuditEntity): LucideIcon {
  return ENTITY_ICONS[entity] ?? Cog;
}

export function auditSeverityVariant(severity: AuditSeverity): StatusBadgeVariant {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "info";
}

export function auditActionVariant(action: AuditAction): StatusBadgeVariant {
  switch (action) {
    case "deleted":
    case "failed_login":
    case "rejected":
      return "danger";
    case "updated":
    case "assigned":
      return "warning";
    case "approved":
    case "created":
      return "success";
    default:
      return "neutral";
  }
}

export function getAuditInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatAuditWhen(timestamp: string): string {
  const date = parseISO(timestamp);
  if (isToday(date)) return format(date, "'Today' h:mm a");
  if (isYesterday(date)) return format(date, "'Yesterday' h:mm a");
  return format(date, "MMM d, h:mm a");
}

export function auditFieldLabel(field: string): string {
  return field
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export function auditEntityPath(entity: AuditEntity, entityId: string): string | null {
  switch (entity) {
    case "User":
      return entityId.startsWith("usr-") ? ROUTES.admin.userEdit(entityId) : ROUTES.admin.users;
    case "Role":
      return ROUTES.admin.roles;
    case "RoleGroup":
      return ROUTES.admin.roleGroups;
    case "Quotation":
      return ROUTES.quotations.detail(entityId);
    case "SalesOrder":
      return ROUTES.salesOrders.detail(entityId);
    case "Product":
      return ROUTES.products.detail(entityId);
    case "Customer":
      return ROUTES.customers.detail(entityId);
    case "InventoryItem":
      return ROUTES.inventory.detail(entityId);
    case "ManufacturingJob":
      return ROUTES.manufacturing.jobDetail(entityId);
    case "Delivery":
      return ROUTES.deliveries.detail(entityId);
    case "Settings":
      return ROUTES.admin.settings;
    default:
      return null;
  }
}
