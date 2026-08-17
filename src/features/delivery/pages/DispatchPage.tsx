import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { useDelivery, useDispatchDelivery } from "@/features/delivery/hooks/useDeliveries";
import { useManufacturingJobs } from "@/features/manufacturing/hooks/useManufacturing";

const CHECKLIST_ITEMS = [
  { id: "packed", label: "Items packed and secured" },
  { id: "qty_verified", label: "Quantities verified against order" },
  { id: "docs", label: "Delivery documents prepared" },
  { id: "customer_notified", label: "Customer notified of dispatch" },
  { id: "driver_confirmed", label: "Driver confirmed and assigned" },
] as const;

export function DispatchPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: delivery, isLoading, error, refetch } = useDelivery(id);
  const dispatchDelivery = useDispatchDelivery();
  const { data: manufacturingJobs } = useManufacturingJobs({
    page: 1,
    pageSize: 50,
    salesOrderId: delivery?.salesOrderId,
  });

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const qcPassed = useMemo(() => {
    const jobs = manufacturingJobs?.items ?? [];
    if (jobs.length === 0) return true;
    return jobs.every(
      (job) => job.status === "completed" || job.qualityInspection?.status === "passed",
    );
  }, [manufacturingJobs?.items]);

  const allChecked = CHECKLIST_ITEMS.every((item) => checked[item.id]);
  const canDispatch = allChecked && qcPassed;

  const handleDispatch = async () => {
    if (!canDispatch || !delivery) return;
    try {
      await dispatchDelivery.mutateAsync(delivery.id);
      toast.success(`Delivery ${delivery.deliveryNumber} dispatched`);
      navigate(ROUTES.deliveries.detail(delivery.id));
    } catch {
      toast.error("Failed to dispatch delivery");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Dispatch Delivery"
        description={delivery ? `${delivery.deliveryNumber} - ${delivery.customerName}` : undefined}
        breadcrumbs={[
          { label: "Delivery", href: ROUTES.deliveries.list },
          { label: delivery?.deliveryNumber ?? "Dispatch" },
        ]}
        actions={
          delivery && (
            <Link to={ROUTES.deliveries.detail(delivery.id)}>
              <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back
              </Button>
            </Link>
          )
        }
      />

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load delivery" : null}
        onRetry={() => void refetch()}
      >
        {delivery && (
          <div className="mx-auto max-w-xl space-y-6">
            {!qcPassed && (
              <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                <div>
                  <p className="font-medium text-warning">Quality check not passed</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Related manufacturing jobs must pass QC before dispatch. Complete quality
                    inspections first.
                  </p>
                  <Link
                    to={ROUTES.manufacturing.quality}
                    className="mt-2 inline-block text-sm text-primary hover:underline"
                  >
                    Go to Quality Inspection
                  </Link>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-semibold">Pre-Dispatch Checklist</h3>
              <ul className="space-y-3">
                {CHECKLIST_ITEMS.map((item) => (
                  <li key={item.id}>
                    <Checkbox
                      checked={Boolean(checked[item.id])}
                      onChange={(e) =>
                        setChecked((prev) => ({ ...prev, [item.id]: e.target.checked }))
                      }
                      label={item.label}
                    />
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Scheduled:</span>{" "}
                {new Date(delivery.scheduledDate).toLocaleString()}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Driver:</span>{" "}
                {delivery.driverName ?? "Not assigned"}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">Items:</span> {delivery.items.length}
              </p>
            </div>

            <Button
              variant="primary"
              className="w-full"
              leftIcon={<CheckCircle className="h-4 w-4" />}
              disabled={!canDispatch}
              loading={dispatchDelivery.isPending}
              onClick={() => void handleDispatch()}
            >
              Confirm Dispatch
            </Button>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}
