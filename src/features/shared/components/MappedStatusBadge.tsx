import { StatusBadge } from "@/components/ui/StatusBadge";
import { resolveStatus } from "@/lib/status-badge";
import type { StatusMap } from "@/types/status";

export type MappedStatusBadgeProps = {
  statusMap: StatusMap;
  value: string;
  dot?: boolean;
};

export function MappedStatusBadge({ statusMap, value, dot }: MappedStatusBadgeProps) {
  const { label, variant } = resolveStatus(statusMap, value);
  return (
    <StatusBadge variant={variant} dot={dot}>
      {label}
    </StatusBadge>
  );
}
