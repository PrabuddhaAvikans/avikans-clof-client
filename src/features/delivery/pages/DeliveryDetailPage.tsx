import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, FileCheck } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCard } from "@/components/ui/SummaryCard";
import {
  useDelivery,
  useUpdateDeliveryStatus,
} from "@/features/delivery/hooks/useDeliveries";
import {
  DELIVERY_STATUS_FLOW,
  getDeliveryStatusAction,
} from "@/features/delivery/lib/deliveryStatus";
import { statusLabel, statusVariant } from "@/features/shared/utils/statusBadge";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DeliveryStatus, Priority, type DeliveryStatusValue } from "@/types/status";

export function DeliveryDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: delivery, isLoading, error, refetch } = useDelivery(id);
  const updateStatus = useUpdateDeliveryStatus();

  const statusAction = delivery
    ? getDeliveryStatusAction(delivery.status as DeliveryStatusValue)
    : null;

  const handleAdvance = async () => {
    if (!delivery || !statusAction) return;

    if (statusAction.useScreen === "dispatch") {
      navigate(ROUTES.deliveries.dispatch(delivery.id));
      return;
    }
    if (statusAction.useScreen === "proof") {
      navigate(ROUTES.deliveries.proof(delivery.id));
      return;
    }

    try {
      const updated = await updateStatus.mutateAsync({
        id: delivery.id,
        status: statusAction.nextStatus,
      });
      toast.success(
        `${updated.deliveryNumber} → ${statusLabel(DeliveryStatus, updated.status)}`,
      );
      void refetch();
    } catch (err) {
      const message =
        typeof err === "object" && err && "message" in err
          ? String((err as { message: string }).message)
          : "Could not update delivery status";
      toast.error(message);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title={delivery?.deliveryNumber ?? "Delivery Details"}
        description={delivery ? `${delivery.customerName} · ${delivery.salesOrderNumber}` : undefined}
        breadcrumbs={[
          { label: "Delivery", href: ROUTES.deliveries.list },
          { label: delivery?.deliveryNumber ?? "Details" },
        ]}
        actions={
          delivery && (
            <div className="flex gap-2">
              <Link to={ROUTES.deliveries.list}>
                <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                  Back
                </Button>
              </Link>
              {statusAction && (
                <Button
                  variant="primary"
                  leftIcon={
                    statusAction.useScreen === "proof" ? (
                      <FileCheck className="h-4 w-4" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )
                  }
                  loading={updateStatus.isPending}
                  onClick={() => void handleAdvance()}
                >
                  {statusAction.label}
                </Button>
              )}
            </div>
          )
        }
      />

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load delivery" : null}
        onRetry={() => void refetch()}
      >
        {delivery && (
          <>
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard
                title="Status"
                value={statusLabel(DeliveryStatus, delivery.status)}
              />
              <SummaryCard title="Scheduled" value={formatDate(delivery.scheduledDate)} />
              <SummaryCard title="Driver" value={delivery.driverName ?? "Unassigned"} />
              <SummaryCard
                title="Priority"
                value={statusLabel(Priority, delivery.priority)}
              />
            </div>

            <div className="mb-6 rounded-lg border border-border bg-card p-4">
              <p className="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Status after production
              </p>
              <ol className="flex flex-wrap gap-2">
                {DELIVERY_STATUS_FLOW.map((step, index) => {
                  const currentIndex = DELIVERY_STATUS_FLOW.indexOf(
                    delivery.status as DeliveryStatusValue,
                  );
                  const stepIndex = index;
                  const done = currentIndex > stepIndex;
                  const active = delivery.status === step;
                  return (
                    <li
                      key={step}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-[11px]",
                        active && "border-foreground bg-foreground text-background",
                        done && !active && "border-border bg-muted text-foreground",
                        !done && !active && "border-border text-muted-foreground",
                      )}
                    >
                      {statusLabel(DeliveryStatus, step)}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-semibold">Overview</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Customer</dt>
                    <dd className="font-medium">{delivery.customerName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Sales Order</dt>
                    <dd className="font-medium">{delivery.salesOrderNumber}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <StatusBadge
                        variant={statusVariant(DeliveryStatus, delivery.status)}
                        dot
                        size="sm"
                      >
                        {statusLabel(DeliveryStatus, delivery.status)}
                      </StatusBadge>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Carrier</dt>
                    <dd>{delivery.carrier ?? "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Tracking</dt>
                    <dd>{delivery.trackingNumber ?? "-"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Vehicle</dt>
                    <dd>{delivery.vehicleNumber ?? "-"}</dd>
                  </div>
                  {delivery.dispatchedAt && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Dispatched</dt>
                      <dd>{formatDateTime(delivery.dispatchedAt)}</dd>
                    </div>
                  )}
                  {delivery.deliveredAt && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Delivered</dt>
                      <dd>{formatDateTime(delivery.deliveredAt)}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-semibold">Shipping Address</h3>
                <address className="text-sm not-italic text-muted-foreground">
                  {delivery.shippingAddress.line1}
                  {delivery.shippingAddress.line2 && (
                    <>
                      <br />
                      {delivery.shippingAddress.line2}
                    </>
                  )}
                  <br />
                  {delivery.shippingAddress.city}, {delivery.shippingAddress.state}{" "}
                  {delivery.shippingAddress.postalCode}
                  <br />
                  {delivery.shippingAddress.country}
                </address>
                {delivery.notes && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-xs font-medium text-muted-foreground">Notes</p>
                    <p className="mt-1 text-sm">{delivery.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Ordered</th>
                    <th className="px-4 py-3 text-right">Delivered</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {delivery.items.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.productSku}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.quantityOrdered} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.quantityDelivered} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.quantityOrdered - item.quantityDelivered} {item.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {delivery.proofOfDelivery && (
              <div className="mt-6 rounded-lg border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-semibold">Proof of Delivery</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Received By</dt>
                    <dd>{delivery.proofOfDelivery.signedBy}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Signed At</dt>
                    <dd>{formatDateTime(delivery.proofOfDelivery.signedAt)}</dd>
                  </div>
                  {delivery.proofOfDelivery.notes && (
                    <div>
                      <dt className="text-muted-foreground">Notes</dt>
                      <dd className="mt-1">{delivery.proofOfDelivery.notes}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}
          </>
        )}
      </PageContent>
    </PageContainer>
  );
}
