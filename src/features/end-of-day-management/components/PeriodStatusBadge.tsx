import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  periodStatusLabel,
  periodStatusVariant,
} from "@/features/end-of-day-management/lib/periodLabels";
import type { PeriodStatusValue } from "@/types/end-of-day-management";

export function PeriodStatusBadge({ status }: { status: PeriodStatusValue }) {
  return (
    <StatusBadge variant={periodStatusVariant(status)} dot>
      {periodStatusLabel(status)}
    </StatusBadge>
  );
}
