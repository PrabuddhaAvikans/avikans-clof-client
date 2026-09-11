import type { StatusBadgeVariant } from "@/components/ui/StatusBadge";
import type { InventoryItem, StockMovement, StockMovementTypeValue } from "@/types/inventory";
import { StockMovementType } from "@/types/inventory";

export const STOCK_MOVEMENT_LABELS: Record<StockMovementTypeValue, string> = {
  receipt: "Stock In",
  issue: "Stock Out",
  adjustment: "Adjustment",
  reservation: "Reserved",
  release: "Unreserved",
  transfer: "Transfer",
};

export const STOCK_MOVEMENT_TYPE_CHIPS: Array<{
  value: StockMovementTypeValue | "";
  label: string;
}> = [
  { value: "", label: "All" },
  { value: StockMovementType.receipt, label: "Stock In" },
  { value: StockMovementType.issue, label: "Stock Out" },
  { value: StockMovementType.adjustment, label: "Adjustment" },
  { value: StockMovementType.reservation, label: "Reserved" },
  { value: StockMovementType.release, label: "Unreserved" },
  { value: StockMovementType.transfer, label: "Transfer" },
];

export const RECORDABLE_MOVEMENT_TYPES: Array<{
  value: Exclude<StockMovementTypeValue, "transfer">;
  label: string;
  description: string;
}> = [
  {
    value: "receipt",
    label: "Stock In",
    description: "Received from a supplier or returned. Adds to on-hand.",
  },
  {
    value: "issue",
    label: "Stock Out",
    description: "Used, issued, or sold. Removes from on-hand.",
  },
  {
    value: "adjustment",
    label: "Adjustment",
    description: "Correct the count after a stock take or damage.",
  },
  {
    value: "reservation",
    label: "Reserve",
    description: "Hold for a job. On-hand stays the same; available drops.",
  },
  {
    value: "release",
    label: "Unreserve",
    description: "Free held stock so it can be used again.",
  },
];

const BADGE_VARIANT: Record<StockMovementTypeValue, StatusBadgeVariant> = {
  receipt: "success",
  issue: "danger",
  adjustment: "warning",
  reservation: "info",
  release: "teal",
  transfer: "neutral",
};

export function stockMovementLabel(type: string): string {
  return STOCK_MOVEMENT_LABELS[type as StockMovementTypeValue] ?? type;
}

export function stockMovementBadgeVariant(type: string): StatusBadgeVariant {
  return BADGE_VARIANT[type as StockMovementTypeValue] ?? "neutral";
}

export function stockMovementTimelineStatus(
  type: string,
): "default" | "success" | "warning" | "danger" | "info" {
  switch (type) {
    case "receipt":
      return "success";
    case "issue":
      return "danger";
    case "adjustment":
      return "warning";
    default:
      return "info";
  }
}

export function stockMovementImpact(movement: StockMovement): string {
  switch (movement.type) {
    case "receipt":
      return "Added to on-hand";
    case "issue":
      return "Removed from on-hand";
    case "adjustment":
      return movement.quantity < 0 ? "Count decreased" : "Count corrected";
    case "reservation":
      return "Held for a job";
    case "release":
      return "Hold released";
    case "transfer":
      return "Moved";
    default:
      return "—";
  }
}

export function signedMovementQuantity(movement: StockMovement): {
  signed: number;
  prefix: string;
  className: string;
} {
  if (movement.type === "issue" || (movement.type === "adjustment" && movement.quantity < 0)) {
    return {
      signed: -Math.abs(movement.quantity),
      prefix: "−",
      className: "text-destructive",
    };
  }
  if (movement.type === "receipt" || (movement.type === "adjustment" && movement.quantity > 0)) {
    return {
      signed: Math.abs(movement.quantity),
      prefix: "+",
      className: "text-emerald-700",
    };
  }
  return {
    signed: Math.abs(movement.quantity),
    prefix: "",
    className: "text-foreground",
  };
}

export function movementReason(movement: StockMovement): string {
  if (movement.notes?.trim()) return movement.notes.trim();
  if (movement.referenceType === "manufacturing_job" && movement.referenceId) {
    return `Job ${movement.referenceId}`;
  }
  if (movement.referenceType === "purchase_order" && movement.referenceId) {
    return movement.referenceId;
  }
  if (movement.referenceType && movement.referenceId) {
    return `${movement.referenceType} ${movement.referenceId}`;
  }
  return "—";
}

export function previewStockChange(options: {
  item: InventoryItem;
  type: StockMovementTypeValue;
  quantity: number;
  adjustmentDirection: "increase" | "decrease";
}): {
  summary: string;
  warning?: string;
  nextOnHand: number;
  nextAvailable: number;
  nextReserved: number;
} {
  const qty = Number(options.quantity) || 0;
  const { item, type, adjustmentDirection } = options;
  const onHand = item.quantityOnHand;
  const reserved = item.quantityReserved;
  const available = item.quantityAvailable;
  const unit = item.unit;

  let nextOnHand = onHand;
  let nextReserved = reserved;
  let nextAvailable = available;
  let summary = "";
  let warning: string | undefined;

  if (type === "receipt") {
    nextOnHand = onHand + qty;
    nextAvailable = available + qty;
    summary = `${qty} ${unit} will be added to on-hand.`;
  } else if (type === "issue") {
    nextOnHand = onHand - qty;
    nextAvailable = available - qty;
    summary = `${qty} ${unit} will be removed from on-hand.`;
    if (qty > available) {
      warning = `Only ${available} ${unit} available.`;
    }
  } else if (type === "adjustment") {
    const delta = adjustmentDirection === "decrease" ? -qty : qty;
    nextOnHand = onHand + delta;
    nextAvailable = available + delta;
    summary =
      adjustmentDirection === "decrease"
        ? `On-hand will decrease by ${qty} ${unit}.`
        : `On-hand will increase by ${qty} ${unit}.`;
    if (nextOnHand < 0) {
      warning = "On-hand cannot go below zero.";
    }
  } else if (type === "reservation") {
    nextReserved = reserved + qty;
    nextAvailable = available - qty;
    summary = `${qty} ${unit} will be held. On-hand stays ${onHand} ${unit}.`;
    if (qty > available) {
      warning = `Only ${available} ${unit} available to reserve.`;
    }
  } else if (type === "release") {
    nextReserved = Math.max(0, reserved - qty);
    nextAvailable = available + Math.min(qty, reserved);
    summary = `${qty} ${unit} will be released from hold.`;
    if (qty > reserved) {
      warning = `Only ${reserved} ${unit} is currently reserved.`;
    }
  } else {
    summary = `${qty} ${unit} recorded as a transfer.`;
  }

  return { summary, warning, nextOnHand, nextAvailable, nextReserved };
}
