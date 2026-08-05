export type StatusBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "destructive"
  | "outline"
  | "info"
  | "teal";

export interface StatusDefinition {
  label: string;
  variant: StatusBadgeVariant;
}

export const QuotationStatus = {
  draft: { label: "Draft", variant: "secondary" },
  ready_to_send: { label: "Ready to Send", variant: "info" },
  sent: { label: "Sent", variant: "info" },
  viewed: { label: "Viewed", variant: "default" },
  accepted: { label: "Accepted", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  expired: { label: "Expired", variant: "warning" },
  converted: { label: "Converted", variant: "teal" },
} as const satisfies Record<string, StatusDefinition>;

export type QuotationStatusValue = keyof typeof QuotationStatus;

export const SalesOrderStatus = {
  draft: { label: "Draft", variant: "secondary" },
  pending_review: { label: "Pending Review", variant: "warning" },
  confirmed: { label: "Confirmed", variant: "info" },
  submitted: { label: "Submitted", variant: "info" },
  in_manufacturing: { label: "In Manufacturing", variant: "default" },
  ready_for_delivery: { label: "Ready for Delivery", variant: "info" },
  partially_delivered: { label: "Partially Delivered", variant: "warning" },
  delivered: { label: "Delivered", variant: "success" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
} as const satisfies Record<string, StatusDefinition>;

export type SalesOrderStatusValue = keyof typeof SalesOrderStatus;

export const ManufacturingJobStatus = {
  draft: { label: "Draft", variant: "secondary" },
  planned: { label: "Planned", variant: "info" },
  materials_pending: { label: "Materials Pending", variant: "warning" },
  ready_to_start: { label: "Ready to Start", variant: "info" },
  in_progress: { label: "In Progress", variant: "default" },
  on_hold: { label: "On Hold", variant: "warning" },
  quality_check: { label: "Quality Check", variant: "info" },
  rework: { label: "Rework", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "destructive" },
} as const satisfies Record<string, StatusDefinition>;

export type ManufacturingJobStatusValue = keyof typeof ManufacturingJobStatus;

export const DeliveryStatus = {
  planned: { label: "Planned", variant: "secondary" },
  ready_for_dispatch: { label: "Ready for Dispatch", variant: "info" },
  dispatched: { label: "Dispatched", variant: "info" },
  in_transit: { label: "In Transit", variant: "default" },
  partially_delivered: { label: "Partially Delivered", variant: "warning" },
  delivered: { label: "Delivered", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  returned: { label: "Returned", variant: "warning" },
  cancelled: { label: "Cancelled", variant: "destructive" },
} as const satisfies Record<string, StatusDefinition>;

export type DeliveryStatusValue = keyof typeof DeliveryStatus;

export const StockStatus = {
  in_stock: { label: "In Stock", variant: "success" },
  low_stock: { label: "Low Stock", variant: "warning" },
  out_of_stock: { label: "Out of Stock", variant: "destructive" },
  reserved: { label: "Reserved", variant: "info" },
} as const satisfies Record<string, StatusDefinition>;

export type StockStatusValue = keyof typeof StockStatus;

export const Priority = {
  low: { label: "Low", variant: "secondary" },
  medium: { label: "Medium", variant: "outline" },
  high: { label: "High", variant: "default" },
  urgent: { label: "Urgent", variant: "destructive" },
} as const satisfies Record<string, StatusDefinition>;

export type PriorityValue = keyof typeof Priority;

export const PaymentStatus = {
  unpaid: { label: "Unpaid", variant: "warning" },
  partial: { label: "Partial", variant: "info" },
  paid: { label: "Paid", variant: "success" },
  overdue: { label: "Overdue", variant: "destructive" },
} as const satisfies Record<string, StatusDefinition>;

export type PaymentStatusValue = keyof typeof PaymentStatus;

export const CostingRequestStatus = {
  pending: { label: "Pending", variant: "secondary" },
  in_review: { label: "In Review", variant: "info" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "destructive" },
  changes_requested: { label: "Changes Requested", variant: "warning" },
} as const satisfies Record<string, StatusDefinition>;

export type CostingRequestStatusValue = keyof typeof CostingRequestStatus;

export const CostingRiskFlag = {
  low: { label: "Low", variant: "success" },
  medium: { label: "Medium", variant: "warning" },
  high: { label: "High", variant: "destructive" },
} as const satisfies Record<string, StatusDefinition>;

export type CostingRiskFlagValue = keyof typeof CostingRiskFlag;

export type StatusMap = Record<string, StatusDefinition>;

const STATUS_MAPS: readonly StatusMap[] = [
  QuotationStatus,
  SalesOrderStatus,
  ManufacturingJobStatus,
  DeliveryStatus,
  StockStatus,
  Priority,
  PaymentStatus,
  CostingRequestStatus,
  CostingRiskFlag,
];

export function getStatusLabel(
  statusMap: StatusMap,
  value: string,
): string {
  const definition = statusMap[value];
  return definition?.label ?? value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getStatusVariant(
  statusMap: StatusMap,
  value: string,
): StatusBadgeVariant {
  const definition = statusMap[value];
  if (definition) {
    return definition.variant;
  }

  for (const map of STATUS_MAPS) {
    const match = map[value];
    if (match) {
      return match.variant;
    }
  }

  return "outline";
}
