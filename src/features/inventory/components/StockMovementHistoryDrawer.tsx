import { Link } from "react-router-dom";
import { ROUTES } from "@/app/config/routes";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Timeline } from "@/components/ui/Timeline";
import { useStockMovements } from "@/features/inventory/hooks/useInventory";
import {
  movementReason,
  signedMovementQuantity,
  stockMovementBadgeVariant,
  stockMovementImpact,
  stockMovementLabel,
  stockMovementTimelineStatus,
} from "@/features/inventory/lib/stockMovements";
import { formatDateTime, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InventoryItem, StockMovement } from "@/types/inventory";

export type StockMovementHistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  movement: StockMovement | null;
  item?: InventoryItem;
  onRecord: () => void;
};

export function StockMovementHistoryDrawer({
  open,
  onClose,
  movement,
  item,
  onRecord,
}: StockMovementHistoryDrawerProps) {
  const itemId = movement?.inventoryItemId ?? "";
  const { data, isLoading } = useStockMovements(
    {
      page: 1,
      pageSize: 100,
      inventoryItemId: itemId || undefined,
    },
    { enabled: open && Boolean(itemId) },
  );

  const history = data?.items ?? [];
  const name = item?.name ?? movement?.inventoryItemName ?? "Item";
  const sku = item?.sku ?? movement?.inventoryItemSku ?? "";
  const unit = item?.unit ?? movement?.unit ?? "";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Item history"
      size="md"
      footer={
        movement ? (
          <>
            <Link to={ROUTES.inventory.detail(movement.inventoryItemId)}>
              <Button variant="outline">Open item</Button>
            </Link>
            <Button onClick={onRecord}>Record</Button>
          </>
        ) : undefined
      }
    >
      {!movement ? (
        <p className="text-sm text-muted-foreground">Select a movement to see history.</p>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <p className="font-mono text-xs text-muted-foreground">{sku}</p>
            {item && (
              <p className="mt-2 text-xs text-muted-foreground">
                On hand {formatNumber(item.quantityOnHand)} {unit}
                {" · "}Available {formatNumber(item.quantityAvailable)}
                {" · "}Reserved {formatNumber(item.quantityReserved)}
              </p>
            )}
          </div>

          <section className="rounded-md border border-border bg-muted/40 p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Selected movement
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge variant={stockMovementBadgeVariant(movement.type)} dot>
                {stockMovementLabel(movement.type)}
              </StatusBadge>
              <MovementQty movement={movement} />
            </div>
            <p className="mt-2 text-sm text-foreground">{stockMovementImpact(movement)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(movement.performedAt)} · {movement.performedByName}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{movementReason(movement)}</p>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-foreground">History</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading history…</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No other movements for this item.</p>
            ) : (
              <Timeline
                events={history.map((entry) => {
                  const signed = signedMovementQuantity(entry);
                  return {
                    id: entry.id,
                    title: `${stockMovementLabel(entry.type)}  ${signed.prefix}${formatNumber(Math.abs(entry.quantity))} ${entry.unit}`,
                    description: `${stockMovementImpact(entry)}${movementReason(entry) !== "—" ? ` · ${movementReason(entry)}` : ""}`,
                    timestamp: formatDateTime(entry.performedAt),
                    status: stockMovementTimelineStatus(entry.type),
                  };
                })}
              />
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}

function MovementQty({ movement }: { movement: StockMovement }) {
  const signed = signedMovementQuantity(movement);
  return (
    <span className={cn("text-sm font-semibold tabular-nums", signed.className)}>
      {signed.prefix}
      {formatNumber(Math.abs(movement.quantity))} {movement.unit}
    </span>
  );
}
