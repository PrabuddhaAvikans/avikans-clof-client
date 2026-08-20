import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  Copy,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { SendQuotationModal } from "@/features/sales/components/SendQuotationModal";
import { QuotationContactDrawer } from "@/features/sales/components/QuotationContactHistory";
import { QuotationDetailPanel } from "@/features/sales/components/QuotationDetailPanel";
import { QuotationListPanel } from "@/features/sales/components/QuotationListPanel";
import { QuotationWorkflowPanel } from "@/features/sales/components/QuotationWorkflowPanel";
import {
  useAddQuotationContact,
  useConvertQuotationToSalesOrder,
  useCreateQuotation,
  useDeleteQuotation,
  useQuotation,
  useQuotations,
  useSendQuotation,
} from "@/features/sales/hooks/useQuotations";
import { quotationsActions } from "@/features/sales/store/quotationsSlice";
import type { QuotationContactInput } from "@/services/interfaces/quotationService";
import type { Quotation } from "@/types/quotation";
import type { QuotationStatusValue } from "@/types/status";
import { cn } from "@/lib/utils";
import {
  workspaceGrid,
  workspaceGridCol,
  workspacePanelFill,
} from "@/lib/panelLayout";

export function QuotationWorkspacePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<QuotationStatusValue | "">("");
  const [sendOpen, setSendOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuotations({
    page,
    pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const { data: countsData } = useQuotations({ page: 1, pageSize: 100 });

  const { data: selectedQuotation } = useQuotation(selectedId ?? "");

  const sendQuotation = useSendQuotation();
  const convertToOrder = useConvertQuotationToSalesOrder();
  const createQuotation = useCreateQuotation();
  const addContact = useAddQuotationContact();
  const deleteQuotation = useDeleteQuotation();

  useEffect(() => {
    if (!selectedId && data?.items.length) {
      setSelectedId(data.items[0].id);
    }
  }, [data?.items, selectedId]);

  useEffect(() => {
    if (
      selectedId &&
      data?.items.length &&
      !data.items.some((item) => item.id === selectedId)
    ) {
      setSelectedId(data.items[0]?.id ?? null);
    }
  }, [data?.items, selectedId]);

  const activeQuotation =
    selectedQuotation ?? data?.items.find((item) => item.id === selectedId) ?? null;

  const statusCounts = useMemo(() => {
    const items = countsData?.items ?? [];
    const counts: Partial<Record<QuotationStatusValue | "", number>> = {
      "": countsData?.totalCount ?? items.length,
    };
    for (const item of items) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return counts;
  }, [countsData]);

  const handleDuplicate = useCallback(
    async (quotation: Quotation) => {
      try {
        const created = await createQuotation.mutateAsync({
          customerId: quotation.customerId,
          lineItems: quotation.lineItems.map((item) => ({
            productId: item.productId,
            productSku: item.productSku,
            productName: item.productName,
            description: item.description,
            productVersionId: item.productVersionId,
            productVersionLabel: item.productVersionLabel,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent,
            taxPercent: item.taxPercent,
            isCustomized: item.isCustomized,
            customization: item.customization
              ? {
                  ...item.customization,
                  isLocked: false,
                  promotedProductVersionId: undefined,
                }
              : undefined,
          })),
          validUntil: quotation.validUntil,
          priority: quotation.priority,
          notes: quotation.notes,
          termsAndConditions: quotation.termsAndConditions,
          discountAmount: quotation.discountAmount,
        });
        toast.success(`Duplicated as ${created.quotationNumber}`);
        setSelectedId(created.id);
        void refetch();
      } catch {
        toast.error("Failed to duplicate quotation");
      }
    },
    [createQuotation, refetch],
  );

  const handleConvert = useCallback(async () => {
    if (!activeQuotation) return;
    try {
      const order = await convertToOrder.mutateAsync(activeQuotation.id);
      toast.success("Converted to sales order");
      setConvertOpen(false);
      navigate(ROUTES.salesOrders.detail(order.id));
    } catch {
      toast.error("Failed to convert quotation");
    }
  }, [activeQuotation, convertToOrder, navigate]);

  const handleAddContact = useCallback(
    async (data: QuotationContactInput) => {
      if (!activeQuotation) return;
      try {
        await addContact.mutateAsync({ id: activeQuotation.id, data });
        toast.success("Contact logged");
      } catch {
        toast.error("Could not log contact - approval may already be complete");
      }
    },
    [activeQuotation, addContact],
  );

  const handleDelete = useCallback(async () => {
    if (!activeQuotation) return;
    try {
      await deleteQuotation.mutateAsync(activeQuotation.id);
      toast.success(`${activeQuotation.quotationNumber} deleted`);
      setDeleteOpen(false);
      setSelectedId(null);
      void refetch();
    } catch {
      toast.error("Failed to delete quotation");
    }
  }, [activeQuotation, deleteQuotation, refetch]);

  const canEdit =
    activeQuotation &&
    (activeQuotation.status === "draft" || activeQuotation.status === "ready_to_send");
  const canDelete = Boolean(canEdit);
  const canSend =
    activeQuotation &&
    (activeQuotation.status === "draft" || activeQuotation.status === "ready_to_send");
  const canConvert =
    activeQuotation &&
    (activeQuotation.status === "accepted" || activeQuotation.status === "sent");

  return (
    <PageContainer maxWidth="full" className="py-3">
      <PageHeader
        title="Quotation & Order Conversion"
        description="Quotation → Sales Order → Product Estimation → Costing Approval → Confirm."
        className="mb-2"
        actions={
          <>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.quotations.new)}
            >
              New Quotation
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Pencil className="h-4 w-4" />}
              disabled={!canEdit}
              onClick={() =>
                activeQuotation && navigate(ROUTES.quotations.edit(activeQuotation.id))
              }
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              disabled={!canDelete}
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Copy className="h-4 w-4" />}
              disabled={!activeQuotation}
              onClick={() => activeQuotation && void handleDuplicate(activeQuotation)}
            >
              Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Mail className="h-4 w-4" />}
              disabled={!canSend}
              onClick={() => setSendOpen(true)}
            >
              Send to Customer
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<ArrowRightLeft className="h-4 w-4" />}
              disabled={!canConvert}
              loading={convertToOrder.isPending}
              onClick={() => setConvertOpen(true)}
            >
              Convert to Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              onClick={() => void refetch()}
            >
              Refresh
            </Button>
          </>
        }
      />

      <PageContent
        isLoading={isLoading && !data}
        error={error ? "Failed to load quotations." : null}
        onRetry={() => void refetch()}
        loadingVariant="card"
      >
        <div className={workspaceGrid}>
          <div className={cn("min-h-[18rem] lg:col-span-3", workspaceGridCol)}>
            <QuotationListPanel
              items={data?.items ?? []}
              totalCount={data?.totalCount ?? 0}
              statusCounts={statusCounts}
              selectedId={selectedId}
              onSelect={setSelectedId}
              statusFilter={statusFilter}
              onStatusFilterChange={(status) => {
                setStatusFilter(status);
                setPage(1);
              }}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              isLoading={isLoading}
              className={workspacePanelFill}
            />
          </div>

           <div className={cn("min-h-[24rem] lg:col-span-6", workspaceGridCol)}>
            <QuotationDetailPanel
              quotation={activeQuotation}
              onOpenContacts={() => setContactsOpen(true)}
              onQuotationUpdated={(updated) => {
                dispatch(
                  quotationsActions.fetchDetailSuccess({
                    key: updated.id,
                    data: updated,
                  }),
                );
                void refetch();
              }}
              className={workspacePanelFill}
            />
          </div>

          <div className={cn("min-h-[18rem] lg:col-span-3", workspaceGridCol)}>
            <QuotationWorkflowPanel
              quotation={activeQuotation}
              onEdit={() =>
                activeQuotation && navigate(ROUTES.quotations.edit(activeQuotation.id))
              }
              onDelete={() => setDeleteOpen(true)}
              onSend={() => setSendOpen(true)}
              onDuplicate={() => activeQuotation && void handleDuplicate(activeQuotation)}
              onConvert={() => setConvertOpen(true)}
              onDownloadPdf={() =>
                activeQuotation && navigate(ROUTES.quotations.preview(activeQuotation.id))
              }
              onOpenContacts={() => setContactsOpen(true)}
              isSending={sendQuotation.isPending}
              isConverting={convertToOrder.isPending}
              isDeleting={deleteQuotation.isPending}
              className={workspacePanelFill}
            />
          </div>
        </div>
      </PageContent>     

      <QuotationContactDrawer
        open={contactsOpen}
        onClose={() => setContactsOpen(false)}
        quotation={activeQuotation}
        onAddContact={handleAddContact}
        isAdding={addContact.isPending}
      />

      <ConfirmationDialog
        open={convertOpen}
        onClose={() => setConvertOpen(false)}
        onConfirm={() => void handleConvert()}
        title="Convert to Sales Order?"
        description={`Convert ${activeQuotation?.quotationNumber ?? "this quotation"} into a sales order?`}
        confirmLabel="Convert"
        loading={convertToOrder.isPending}
      />

      <ConfirmationDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
        title="Delete Quotation?"
        description={`Permanently delete ${activeQuotation?.quotationNumber ?? "this quotation"}? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteQuotation.isPending}
      />

      {activeQuotation && (
        <SendQuotationModal
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          quotation={activeQuotation}
          onSent={() => {
            void sendQuotation.mutateAsync(activeQuotation.id);
            setSendOpen(false);
            toast.success("Quotation sent");
          }}
        />
      )}
    </PageContainer>
  );
}

export const QuotationsPage = QuotationWorkspacePage;
