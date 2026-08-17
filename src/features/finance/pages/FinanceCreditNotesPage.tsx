import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { CreditNoteListPanel } from "@/features/finance/components/CreditNoteListPanel";
import { CreditNoteDetailPanel } from "@/features/finance/components/CreditNoteDetailPanel";
import { ApplyCreditNoteModal } from "@/features/finance/components/ApplyCreditNoteModal";
import { workspaceGrid, workspaceGridCol, workspacePanelFill } from "@/lib/panelLayout";
import type { CreditNote } from "@/types/credit-note";
import type { Invoice } from "@/types/invoice";
import { type CreditNoteStatusValue } from "@/types/status";
import { initialCreditNotes } from "@/features/finance/mock/mockCreditNotes";
import { initialInvoices } from "@/features/finance/mock/mockInvoices";

export function FinanceCreditNotesPage() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(initialCreditNotes);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  const [selectedId, setSelectedId] = useState<string | null>(
    initialCreditNotes[0]?.id ?? null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CreditNoteStatusValue | "">("");

  const [applyOpen, setApplyOpen] = useState(false);

  const selectedCreditNote = useMemo(() => {
    return creditNotes.find((cn) => cn.id === selectedId) ?? null;
  }, [creditNotes, selectedId]);

  const handleApply = async (args: {
    creditNoteId: string;
    invoiceId: string;
    amount: number;
    note: string;
  }) => {
    const credit = creditNotes.find((c) => c.id === args.creditNoteId);
    const invoice = invoices.find((inv) => inv.id === args.invoiceId);
    if (!credit || !invoice) return;

    const maxAmount = Math.min(credit.remainingAmount, invoice.outstandingAmount);
    const applyAmount = Math.max(0, Math.min(args.amount, maxAmount));
    if (applyAmount <= 0) return;

    setCreditNotes((prev) =>
      prev.map((c) => {
        if (c.id !== args.creditNoteId) return c;

        const newAppliedAmount = c.appliedAmount + applyAmount;
        const newRemainingAmount = Math.max(0, c.totalAmount - newAppliedAmount);
        const newStatus: CreditNoteStatusValue =
          newRemainingAmount === 0
            ? "applied"
            : newAppliedAmount > 0
              ? "partially_applied"
              : c.status;

        return {
          ...c,
          appliedAmount: newAppliedAmount,
          remainingAmount: newRemainingAmount,
          status: newStatus,
          invoiceId: c.invoiceId ?? invoice.id,
          invoiceNumber: c.invoiceNumber ?? invoice.invoiceNumber,
          applications: [
            ...c.applications,
            {
              id: `cna-${Date.now()}`,
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              amount: applyAmount,
              note: args.note,
              appliedAt: new Date().toISOString(),
              appliedBy: c.createdBy,
              appliedByName: c.createdByName,
            },
          ],
          updatedAt: new Date().toISOString(),
        };
      }),
    );

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== args.invoiceId) return inv;

        const newCredited = inv.amountCredited + applyAmount;
        const newOutstanding = Math.max(0, inv.outstandingAmount - applyAmount);
        const newStatus = newOutstanding === 0 ? "paid" : newCredited > 0 ? "partial" : "issued";

        return {
          ...inv,
          amountCredited: newCredited,
          outstandingAmount: newOutstanding,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        };
      }),
    );

    toast.success(`Applied ${applyAmount.toFixed(2)} to invoice ${invoice.invoiceNumber}.`);
  };

  return (
    <PageContainer maxWidth="full" className="py-3">
      <PageHeader
        title="Finance"
        description="Invoices and credit notes. Apply credit notes to reduce invoice outstanding balances."
        breadcrumbs={[{ label: "Finance", href: ROUTES.finance.invoices }]}
      />

      <PageContent>
        <div className={workspaceGrid}>
          <div className={workspaceGridCol + " min-h-[18rem] lg:col-span-3"}>
            <CreditNoteListPanel
              items={creditNotes}
              selectedId={selectedId}
              onSelect={setSelectedId}
              search={search}
              onSearchChange={(v) => {
                setSearch(v);
              }}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              className={workspacePanelFill}
            />
          </div>

          <div className={workspaceGridCol + " min-h-[24rem] lg:col-span-9"}>
            <CreditNoteDetailPanel
              creditNote={selectedCreditNote}
              onApplyClick={() => setApplyOpen(true)}
              disableApply={!selectedCreditNote || selectedCreditNote.remainingAmount <= 0}
              className={workspacePanelFill}
            />
          </div>
        </div>

        <ApplyCreditNoteModal
          open={applyOpen}
          onClose={() => setApplyOpen(false)}
          creditNote={selectedCreditNote}
          invoices={invoices}
          onApply={handleApply}
        />
      </PageContent>
    </PageContainer>
  );
}

