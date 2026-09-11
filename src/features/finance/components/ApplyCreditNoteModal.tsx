import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { CreditNote } from "@/types/credit-note";
import type { Invoice } from "@/types/invoice";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/format";

export type ApplyCreditNoteModalProps = {
  open: boolean;
  onClose: () => void;
  creditNote?: CreditNote | null;
  creditNotes?: CreditNote[];
  invoices: Invoice[];
  salesOrderId?: string;
  onApply: (args: {
    creditNoteId: string;
    invoiceId: string;
    amount: number;
    note: string;
  }) => Promise<void> | void;
};

export function ApplyCreditNoteModal({
  open,
  onClose,
  creditNote: creditNoteProp = null,
  creditNotes,
  invoices,
  salesOrderId,
  onApply,
}: ApplyCreditNoteModalProps) {
  const selectableNotes = useMemo(() => {
    const source = creditNotes?.length
      ? creditNotes
      : creditNoteProp
        ? [creditNoteProp]
        : [];
    return source.filter((cn) => cn.remainingAmount > 0);
  }, [creditNotes, creditNoteProp]);

  const [creditNoteId, setCreditNoteId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allowCreditNoteSelect = Boolean(creditNotes?.length);

  const creditNote = useMemo(() => {
    if (allowCreditNoteSelect) {
      return selectableNotes.find((cn) => cn.id === creditNoteId) ?? null;
    }
    return creditNoteProp;
  }, [allowCreditNoteSelect, selectableNotes, creditNoteId, creditNoteProp]);

  const remaining = creditNote?.remainingAmount ?? 0;

  const eligibleInvoices = useMemo(() => {
    if (!creditNote) return [];
    return invoices.filter((inv) => {
      if (inv.customerId !== creditNote.customerId) return false;
      if (inv.outstandingAmount <= 0) return false;
      if (salesOrderId) return inv.salesOrderId === salesOrderId;
      if (creditNote.salesOrderId) return inv.salesOrderId === creditNote.salesOrderId;
      return true;
    });
  }, [creditNote, invoices, salesOrderId]);

  const creditNoteOptions = useMemo(
    () =>
      selectableNotes.map((cn) => ({
        value: cn.id,
        label: `${cn.creditNoteNumber} • Remaining ${formatCurrency(cn.remainingAmount, cn.currency)}`,
      })),
    [selectableNotes],
  );

  const invoiceOptions = useMemo(
    () =>
      eligibleInvoices.map((inv) => ({
        value: inv.id,
        label: `${inv.invoiceNumber} • Outstanding ${formatCurrency(inv.outstandingAmount, inv.currency)}`,
      })),
    [eligibleInvoices],
  );

  const selectedInvoice = useMemo(
    () => eligibleInvoices.find((inv) => inv.id === invoiceId) ?? null,
    [eligibleInvoices, invoiceId],
  );

  const maxAmount = useMemo(() => {
    const invoiceOutstanding = selectedInvoice?.outstandingAmount ?? 0;
    return Math.min(remaining, invoiceOutstanding);
  }, [remaining, selectedInvoice]);

  useEffect(() => {
    if (!open) return;
    setNote("");
    if (!selectableNotes.length) {
      setCreditNoteId("");
      return;
    }
    const preferred =
      creditNoteProp && selectableNotes.some((cn) => cn.id === creditNoteProp.id)
        ? creditNoteProp.id
        : selectableNotes[0]!.id;
    setCreditNoteId(preferred);
  }, [open, selectableNotes, creditNoteProp]);

  useEffect(() => {
    if (!open) return;
    if (!eligibleInvoices.length) {
      setInvoiceId("");
      setAmount(0);
      return;
    }
    const first = eligibleInvoices[0]!;
    setInvoiceId(first.id);
    setAmount(Math.min(remaining, first.outstandingAmount));
  }, [open, eligibleInvoices, remaining, creditNoteId]);

  useEffect(() => {
    if (!open) return;
    setAmount((prev) => Math.min(prev, maxAmount));
  }, [open, maxAmount]);

  const trimmedNote = note.trim();

  const handleApply = async () => {
    if (!creditNote || !invoiceId) return;
    if (amount <= 0) {
      toast.error("Enter a valid amount greater than 0.");
      return;
    }
    if (amount > maxAmount) {
      toast.error("Amount exceeds invoice outstanding or credit note remaining.");
      return;
    }
    if (!trimmedNote) {
      toast.error("Please enter a description / note for this application.");
      return;
    }

    try {
      setSubmitting(true);
      await onApply({
        creditNoteId: creditNote.id,
        invoiceId,
        amount,
        note: trimmedNote,
      });
      toast.success("Credit note applied successfully.");
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to apply credit note.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const emptyMessage = !selectableNotes.length
    ? salesOrderId
      ? "No open credit notes are available for this sales order."
      : "No open credit notes are available."
    : "No invoices with outstanding balance are available for this order.";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Apply Credit Note"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            onClick={() => void handleApply()}
            disabled={
              !creditNote ||
              !eligibleInvoices.length ||
              amount <= 0 ||
              !trimmedNote
            }
          >
            Apply
          </Button>
        </>
      }
    >
      {!selectableNotes.length || (creditNote && eligibleInvoices.length === 0) ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Credit Note
              </p>
              <p className="mt-1 text-sm font-medium">
                {creditNote?.creditNoteNumber ?? "-"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Remaining:{" "}
                <span className="font-medium text-foreground">
                  {creditNote
                    ? formatCurrency(creditNote.remainingAmount, creditNote.currency)
                    : "-"}
                </span>
              </p>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Selected Invoice
              </p>
              <p className="mt-1 text-sm font-medium">
                {selectedInvoice?.invoiceNumber ?? "-"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Outstanding:{" "}
                <span className="font-medium text-foreground">
                  {selectedInvoice
                    ? formatCurrency(
                        selectedInvoice.outstandingAmount,
                        selectedInvoice.currency,
                      )
                    : "-"}
                </span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {allowCreditNoteSelect && (
              <Select
                label="Credit Note"
                value={creditNoteId}
                onChange={(e) => setCreditNoteId(e.target.value)}
                options={creditNoteOptions}
                placeholder="Select credit note"
              />
            )}

            <Select
              label="Invoice"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              options={invoiceOptions}
              placeholder="Select invoice"
            />

            <Input
              label="Apply Amount"
              type="number"
              min={0}
              step={0.01}
              value={Number.isFinite(amount) ? amount : 0}
              onChange={(e) => setAmount(Number(e.target.value))}
              rightAddon={
                creditNote ? (
                  <span className="text-[11px] text-muted-foreground">
                    Max {formatCurrency(maxAmount, creditNote.currency)}
                  </span>
                ) : undefined
              }
            />
          </div>

          <Textarea
            label="Description / Note"
            required
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain why this credit is being applied (e.g. return, price adjustment)…"
            hint="Required. Shown on the credit note application history."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/30 p-4">
            <div className="text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Preview
              </p>
              <p className="mt-1 text-sm">
                This will reduce invoice outstanding by{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {creditNote
                    ? formatCurrency(amount, creditNote.currency)
                    : formatCurrency(amount)}
                </span>
                .
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAmount(maxAmount)}
              disabled={submitting || maxAmount <= 0}
            >
              Auto fill max
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
