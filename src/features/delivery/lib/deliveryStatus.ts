import type { DeliveryStatusValue } from "@/types/status";
import { DeliveryStatus } from "@/types/status";

/** Happy-path steps after production books a delivery. */
export const DELIVERY_STATUS_FLOW: DeliveryStatusValue[] = [
  "planned",
  "ready_for_dispatch",
  "dispatched",
  "in_transit",
  "delivered",
];

const NEXT_STATUS: Partial<Record<DeliveryStatusValue, DeliveryStatusValue>> = {
  planned: "ready_for_dispatch",
  ready_for_dispatch: "dispatched",
  dispatched: "in_transit",
  in_transit: "delivered",
};

export type DeliveryStatusAction = {
  nextStatus: DeliveryStatusValue;
  label: string;
  /** Prefer the dedicated dispatch / POD screens when true. */
  useScreen?: "dispatch" | "proof";
};

export function getDeliveryStatusAction(
  status: DeliveryStatusValue,
): DeliveryStatusAction | null {
  const nextStatus = NEXT_STATUS[status];
  if (!nextStatus) return null;

  if (nextStatus === "dispatched") {
    return {
      nextStatus,
      label: "Dispatch",
      useScreen: "dispatch",
    };
  }
  if (nextStatus === "delivered") {
    return {
      nextStatus,
      label: "Proof of delivery",
      useScreen: "proof",
    };
  }

  return {
    nextStatus,
    label: `Mark ${DeliveryStatus[nextStatus].label}`,
  };
}

export function canAdvanceDeliveryStatus(status: DeliveryStatusValue): boolean {
  return Boolean(NEXT_STATUS[status]);
}
