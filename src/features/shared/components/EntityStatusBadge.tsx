import { StatusBadge } from "@/components/ui/StatusBadge";
import type { EntityStatus } from "@/types/common";

const ENTITY_STATUS_CONFIG: Record<
  EntityStatus,
  { label: string; variant: "success" | "neutral" }
> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "neutral" },
};

export type EntityStatusBadgeProps = {
  status: EntityStatus;
};

export function EntityStatusBadge({ status }: EntityStatusBadgeProps) {
  const config = ENTITY_STATUS_CONFIG[status];
  return (
    <StatusBadge variant={config.variant} dot>
      {config.label}
    </StatusBadge>
  );
}
