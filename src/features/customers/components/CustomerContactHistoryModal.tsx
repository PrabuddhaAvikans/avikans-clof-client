import { Modal } from "@/components/ui/Modal";
import { ActivityLog } from "@/components/ui/ActivityLog";
import { Button } from "@/components/ui/Button";
import { useAuditLogs } from "@/features/admin/hooks/useAuditLogs";
import { formatDateTime } from "@/lib/format";

export type CustomerContactHistoryModalProps = {
  open: boolean;
  onClose: () => void;
  customerId: string;
  customerName?: string;
};

function CustomerContactHistoryBody({ customerId }: { customerId: string }) {
  const { data, isLoading, error } = useAuditLogs({
    page: 1,
    pageSize: 50,
    entity: "Customer",
    entityId: customerId,
    sortBy: "timestamp",
    sortDirection: "desc",
  });

  const entries =
    data?.items.map((entry) => ({
      id: entry.id,
      user: entry.userName,
      action: entry.details || `${entry.action} ${entry.entity}`,
      timestamp: formatDateTime(entry.timestamp),
      comment: entry.changes?.length
        ? entry.changes
            .map((change) =>
              [change.field, change.from, change.to].filter(Boolean).join(": "),
            )
            .join(" · ")
        : undefined,
    })) ?? [];

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Loading history…</p>;
  }

  if (error) {
    return (
      <p className="py-6 text-center text-sm text-destructive">
        Could not load contact history.
      </p>
    );
  }

  return (
    <ActivityLog
      entries={entries}
      emptyMessage="No contact history recorded for this customer yet."
    />
  );
}

export function CustomerContactHistoryModal({
  open,
  onClose,
  customerId,
  customerName,
}: CustomerContactHistoryModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customerName ? `Contact history · ${customerName}` : "Contact history"}
      size="lg"
      footer={
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      {open ? <CustomerContactHistoryBody customerId={customerId} /> : null}
    </Modal>
  );
}
