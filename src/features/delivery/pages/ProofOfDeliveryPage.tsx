import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, PenLine } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useDelivery, useRecordProofOfDelivery } from "@/features/delivery/hooks/useDeliveries";

type PodResult = "delivered" | "partial" | "failed" | "reschedule";

export function ProofOfDeliveryPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: delivery, isLoading, error, refetch } = useDelivery(id);
  const recordPod = useRecordProofOfDelivery();

  const [deliveredAt, setDeliveredAt] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<PodResult>("delivered");
  const [photos, setPhotos] = useState<string[]>([]);

  const handleSubmit = async () => {
    if (!delivery || !receivedBy || !deliveredAt) {
      toast.error("Please fill in required fields");
      return;
    }
    if (result === "failed" || result === "reschedule") {
      toast.info(`Delivery marked as ${result}`);
      navigate(ROUTES.deliveries.detail(delivery.id));
      return;
    }
    try {
      await recordPod.mutateAsync({
        id: delivery.id,
        proof: {
          signedBy: receivedBy,
          signedAt: new Date(deliveredAt).toISOString(),
          photoUrls: photos,
          notes: notes || undefined,
        },
      });
      toast.success(
        result === "partial"
          ? "Partial delivery recorded"
          : "Proof of delivery confirmed",
      );
      navigate(ROUTES.deliveries.detail(delivery.id));
    } catch {
      toast.error("Failed to record proof of delivery");
    }
  };

  const addPhoto = () => {
    setPhotos((prev) => [...prev, `/assets/pod/photo-${prev.length + 1}.jpg`]);
    toast.success("Photo added (placeholder)");
  };

  return (
    <PageContainer>
      <PageHeader
        title="Proof of Delivery"
        description={delivery ? `${delivery.deliveryNumber} - ${delivery.customerName}` : undefined}
        breadcrumbs={[
          { label: "Delivery", href: ROUTES.deliveries.list },
          { label: delivery?.deliveryNumber ?? "Proof" },
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
            <div className="rounded-lg border border-border bg-card p-6 space-y-4">
              <Input
                label="Delivered Date & Time"
                type="datetime-local"
                required
                value={deliveredAt}
                onChange={(e) => setDeliveredAt(e.target.value)}
              />
              <Input
                label="Received By"
                required
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Name of recipient"
              />

              <div>
                <p className="mb-2 text-sm font-medium">Signature</p>
                <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30">
                  <PenLine className="mr-2 h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Signature placeholder</span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Photos</p>
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, index) => (
                    <div
                      key={photo}
                      className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground"
                    >
                      Photo {index + 1}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPhoto}
                    className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground hover:bg-muted/50"
                  >
                    <Camera className="h-5 w-5" />
                    <span className="mt-1 text-xs">Add</span>
                  </button>
                </div>
              </div>

              <Textarea
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Delivery Result</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(
                  [
                    { value: "delivered", label: "Confirm" },
                    { value: "partial", label: "Partial" },
                    { value: "failed", label: "Failed" },
                    { value: "reschedule", label: "Reschedule" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResult(opt.value)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      result === opt.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full"
              loading={recordPod.isPending}
              onClick={() => void handleSubmit()}
            >
              {result === "delivered"
                ? "Confirm Delivery"
                : result === "partial"
                  ? "Confirm Partial Delivery"
                  : result === "failed"
                    ? "Mark as Failed"
                    : "Reschedule Delivery"}
            </Button>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}
