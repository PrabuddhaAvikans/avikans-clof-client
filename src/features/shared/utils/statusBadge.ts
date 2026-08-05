import type { StatusBadgeVariant as ComponentVariant } from "@/components/ui/StatusBadge";
import type { StatusBadgeVariant as DefinitionVariant, StatusMap } from "@/types/status";
import { getStatusLabel, getStatusVariant } from "@/types/status";

const VARIANT_MAP: Record<DefinitionVariant, ComponentVariant> = {
  default: "default",
  secondary: "neutral",
  success: "success",
  warning: "warning",
  destructive: "danger",
  outline: "outline",
  info: "info",
  teal: "teal",
};

export function toComponentVariant(variant: DefinitionVariant): ComponentVariant {
  return VARIANT_MAP[variant];
}

export function statusLabel(statusMap: StatusMap, value: string): string {
  return getStatusLabel(statusMap, value);
}

export function statusVariant(
  statusMap: StatusMap,
  value: string,
): ComponentVariant {
  return toComponentVariant(getStatusVariant(statusMap, value));
}
