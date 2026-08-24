import { useMemo, useState } from "react";
import { Copy, Save } from "lucide-react";
import { FormikForm } from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Modal } from "@/components/ui/Modal";
import { QuotationFormEditor } from "@/features/sales/components/QuotationFormEditor";
import { useCreateQuotation } from "@/features/sales/hooks/useQuotations";
import {
  buildDuplicateQuotationCreatePayload,
  buildDuplicateQuotationFormValues,
  summarizeDuplicateQuotation,
} from "@/features/sales/lib/duplicateQuotation";
import {
  quotationFormSchema,
  type QuotationFormValues,
} from "@/features/sales/schemas/quotationSchema";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Quotation } from "@/types/quotation";
import { toast } from "sonner";

export type DuplicateQuotationModalProps = {
  open: boolean;
  quotation: Quotation | null;
  onClose: () => void;
  onCreated: (created: Quotation) => void;
};

export function DuplicateQuotationModal({
  open,
  quotation,
  onClose,
  onCreated,
}: DuplicateQuotationModalProps) {
  const createQuotation = useCreateQuotation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<QuotationFormValues | null>(
    null,
  );

  const initialValues = useMemo(
    () => (quotation ? buildDuplicateQuotationFormValues(quotation) : null),
    [quotation],
  );

  const summary = pendingValues
    ? summarizeDuplicateQuotation(pendingValues)
    : null;

  const handleModalClose = () => {
    if (confirmOpen) {
      setConfirmOpen(false);
      return;
    }
    setPendingValues(null);
    onClose();
  };

  const handleRequestCreate = async (values: QuotationFormValues) => {
    setPendingValues(values);
    setConfirmOpen(true);
  };

  const handleConfirmCreate = async () => {
    if (!pendingValues) return;
    try {
      const payload = buildDuplicateQuotationCreatePayload(pendingValues);
      const created = await createQuotation.mutateAsync(payload);
      setConfirmOpen(false);
      setPendingValues(null);
      toast.success(`Quotation ${created.quotationNumber} created successfully.`);
      onCreated(created);
      onClose();
    } catch {
      toast.error("Failed to create duplicated quotation");
    }
  };

  if (!quotation || !initialValues) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={handleModalClose}
        title={`Duplicate Quotation - ${quotation.quotationNumber}`}
        size="full"
        className="h-[min(94vh,56rem)] max-h-[94vh]"
        closeOnOverlayClick={!confirmOpen}
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Review and edit the copied draft. A new quotation number is assigned only after
              you confirm.
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={handleModalClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                form="duplicate-quotation-form"
                variant="primary"
                leftIcon={<Save className="h-4 w-4" />}
                disabled={createQuotation.isPending}
              >
                Save Duplicate
              </Button>
            </div>
          </div>
        }
      >
        <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/30 px-4 py-3">
          <Copy className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Copied from <span className="font-medium text-foreground">{quotation.quotationNumber}</span>.
            Status, history, and delivery records are not copied. The new quotation will start as{" "}
            <span className="font-medium text-foreground">Draft</span>.
          </p>
        </div>

        <FormikForm<QuotationFormValues>
          id="duplicate-quotation-form"
          key={quotation.id}
          initialValues={initialValues}
          validationSchema={quotationFormSchema}
          onSubmit={handleRequestCreate}
          enableReinitialize
          className="space-y-4"
        >
          <QuotationFormEditor variant="page" showQuickActions={false} />
        </FormikForm>
      </Modal>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirmCreate()}
        title="Create this quotation as a new quotation?"
        confirmLabel="Confirm & Create"
        cancelLabel="Cancel"
        loading={createQuotation.isPending}
      >
        {summary && (
          <dl className="mt-3 space-y-2 rounded-md border border-border bg-muted/20 px-3 py-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Customer</dt>
              <dd className="font-medium text-foreground">{summary.customerName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Number of items</dt>
              <dd className="font-medium text-foreground">{summary.itemCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Total Amount</dt>
              <dd className="font-medium tabular-nums text-foreground">
                {formatCurrency(summary.totalAmount, quotation.currency || "LKR")}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Valid Until</dt>
              <dd className="font-medium text-foreground">
                {formatDate(summary.validUntil)}
              </dd>
            </div>
          </dl>
        )}
      </ConfirmationDialog>
    </>
  );
}
