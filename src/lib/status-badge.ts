import type { StatusBadgeVariant as UiStatusBadgeVariant } from "@/components/ui/StatusBadge";
import type { StatusBadgeVariant } from "@/types/status";
import {
  getStatusLabel,
  getStatusVariant,
  type StatusMap,
} from "@/types/status";

const VARIANT_MAP: Record<StatusBadgeVariant, UiStatusBadgeVariant> = {
  default: "default",
  secondary: "neutral",
  success: "success",
  warning: "warning",
  destructive: "danger",
  outline: "outline",
  info: "info",
  teal: "teal",
};

export function toUiStatusVariant(variant: StatusBadgeVariant): UiStatusBadgeVariant {
  return VARIANT_MAP[variant];
}

export function resolveStatus(
  statusMap: StatusMap,
  value: string,
): { label: string; variant: UiStatusBadgeVariant } {
  return {
    label: getStatusLabel(statusMap, value),
    variant: toUiStatusVariant(getStatusVariant(statusMap, value)),
  };
}
