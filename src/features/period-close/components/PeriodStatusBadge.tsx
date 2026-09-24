import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  periodStatusLabel,
  periodStatusVariant,
} from "@/features/period-close/lib/periodLabels";
import type { PeriodStatusValue } from "@/types/period-close";

export function PeriodStatusBadge({ status }: { status: PeriodStatusValue }) {
  return (
    <StatusBadge variant={periodStatusVariant(status)} dot>
      {periodStatusLabel(status)}
    </StatusBadge>
  );
}
