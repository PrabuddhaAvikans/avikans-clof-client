import { useEffect, useMemo, useState } from "react";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { CreditNoteListPanel } from "@/features/finance/components/CreditNoteListPanel";
import { CreditNoteDetailPanel } from "@/features/finance/components/CreditNoteDetailPanel";
import { ApplyCreditNoteModal } from "@/features/finance/components/ApplyCreditNoteModal";
import {
  useApplyCreditNote,
  useCreditNotes,
} from "@/features/finance/hooks/useCreditNotes";
import { useInvoices } from "@/features/finance/hooks/useInvoices";
import { workspaceGrid, workspaceGridCol, workspacePanelFill } from "@/lib/panelLayout";
import { type CreditNoteStatusValue } from "@/types/status";

export function FinanceCreditNotesPage() {
  const {
    data: creditData,
    isLoading: creditLoading,
    error: creditError,
    refetch: refetchCredits,
  } = useCreditNotes({ page: 1, pageSize: 200 });
  const {
    data: invoiceData,
    isLoading: invoiceLoading,
    error: invoiceError,
    refetch: refetchInvoices,
  } = useInvoices({ page: 1, pageSize: 200 });
  const applyCreditNote = useApplyCreditNote();

  const creditNotes = creditData?.items ?? [];
  const invoices = invoiceData?.items ?? [];
  const isLoading = creditLoading || invoiceLoading;
  const error = creditError?.message ?? invoiceError?.message ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CreditNoteStatusValue | "">("");
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    if (!selectedId && creditNotes.length > 0) {
      setSelectedId(creditNotes[0].id);
    }
  }, [creditNotes, selectedId]);

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

    try {
      await applyCreditNote.mutateAsync({
        id: args.creditNoteId,
        data: {
          invoiceId: args.invoiceId,
          amount: applyAmount,
          note: args.note,
        },
      });
      refetchCredits();
      refetchInvoices();
      toast.success(`Applied ${applyAmount.toFixed(2)} to invoice ${invoice.invoiceNumber}.`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to apply credit note.");
    }
  };

  return (
    <PageContainer maxWidth="full" className="py-3">
      <PageHeader
        title="Finance"
        description="Invoices and credit notes. Apply credit notes to reduce invoice outstanding balances."
        breadcrumbs={[{ label: "Finance", href: ROUTES.finance.invoices }]}
      />

      <PageContent isLoading={isLoading} error={error}>
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
