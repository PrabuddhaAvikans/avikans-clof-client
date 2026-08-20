import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { ProductVersionStatus } from "@/types/status";
import type { ProductVersionStatusValue } from "@/types/status";

export type ProductVersionStatusBadgeProps = {
  status: ProductVersionStatusValue;
  dot?: boolean;
};

export function ProductVersionStatusBadge({
  status,
  dot,
}: ProductVersionStatusBadgeProps) {
  return (
    <MappedStatusBadge statusMap={ProductVersionStatus} value={status} dot={dot} />
  );
}
