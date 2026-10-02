import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  Check,
  Copy,
  Mail,
  MessageSquareWarning,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Textarea } from "@/components/ui/Textarea";
import { DuplicateQuotationModal } from "@/features/sales/components/DuplicateQuotationModal";
import { SendQuotationModal } from "@/features/sales/components/SendQuotationModal";
import { QuotationContactDrawer } from "@/features/sales/components/QuotationContactHistory";
import { QuotationDetailPanel } from "@/features/sales/components/QuotationDetailPanel";
import { QuotationListPanel } from "@/features/sales/components/QuotationListPanel";
import { QuotationWorkflowPanel } from "@/features/sales/components/QuotationWorkflowPanel";
import {
  useAddQuotationContact,
  useConvertQuotationToSalesOrder,
  useDeleteQuotation,
  useQuotation,
  useQuotations,
  useSendQuotation,
  useUpdateQuotation,
} from "@/features/sales/hooks/useQuotations";
import {
  canApproveQuotation,
  canConvertQuotation,
  canDeleteQuotation,
  canEditQuotation,
  canMarkCustomerFeedback,
  canRejectQuotation,
  canRequestRevision,
  canSendQuotation,
} from "@/features/sales/lib/quotationLifecycle";
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
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Quotation | null>(null);

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
  const addContact = useAddQuotationContact();
  const deleteQuotation = useDeleteQuotation();
  const updateQuotation = useUpdateQuotation();

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

  const openDuplicateModal = useCallback((quotation: Quotation) => {
    setDuplicateSource(quotation);
    setDuplicateOpen(true);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!activeQuotation) return;
    try {
      const order = await convertToOrder.mutateAsync(activeQuotation.id);
      toast.success(
        order.quotationNumber
          ? `Sales order created from ${order.quotationNumber}. BOM estimation sent for costing approval.`
          : "Sales order created. BOM estimation sent for costing approval.",
      );
      setConvertOpen(false);
      navigate(ROUTES.costing.forOrder(order.id));
    } catch {
      toast.error("Failed to convert quotation");
    }
  }, [activeQuotation, convertToOrder, navigate]);

  const handleAddContact = useCallback(
    async (data: QuotationContactInput) => {
      if (!activeQuotation) return;
      try {
        await addContact.mutateAsync({ id: activeQuotation.id, data });
        toast.success(
          data.type === "comment" ? "Internal comment added" : "Contact logged",
        );
        void refetch();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Could not log contact",
        );
      }
    },
    [activeQuotation, addContact, refetch],
  );

  const handleStatusChange = useCallback(
    async (
      status: QuotationStatusValue,
      successMessage: string,
      extra?: { rejectionReason?: string },
    ) => {
      if (!activeQuotation) return;
      try {
        await updateQuotation.mutateAsync({
          id: activeQuotation.id,
          data: {
            status,
            ...(extra?.rejectionReason
              ? { rejectionReason: extra.rejectionReason }
              : {}),
          },
        });
        toast.success(successMessage);
        void refetch();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update quotation status",
        );
      }
    },
    [activeQuotation, refetch, updateQuotation],
  );

  const handleReject = useCallback(async () => {
    const reason = rejectReason.trim();
    if (reason.length < 3) {
      toast.error("Enter a rejection reason (at least 3 characters).");
      return;
    }
    await handleStatusChange("rejected", "Quotation rejected", {
      rejectionReason: reason,
    });
    setRejectOpen(false);
    setRejectReason("");
  }, [handleStatusChange, rejectReason]);

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

  const canEdit = activeQuotation
    ? canEditQuotation(activeQuotation.status)
    : false;
  const canDelete = activeQuotation
    ? canDeleteQuotation(activeQuotation.status)
    : false;
  const canSend = activeQuotation
    ? canSendQuotation(activeQuotation.status)
    : false;
  const canConvert = activeQuotation
    ? canConvertQuotation(activeQuotation.status)
    : false;
  const canApprove = activeQuotation
    ? canApproveQuotation(activeQuotation.status)
    : false;
  const canReject = activeQuotation
    ? canRejectQuotation(activeQuotation.status)
    : false;
  const canFeedback = activeQuotation
    ? canMarkCustomerFeedback(activeQuotation.status)
    : false;
  const canRequestChanges = activeQuotation
    ? canRequestRevision(activeQuotation.status)
    : false;

  return (
    <PageContainer maxWidth="full" className="py-3">
      <PageHeader
        title="Quotation & Order Conversion"
        description="Quotation → Customer Feedback → Revision → Approval → Sales Order → Costing."
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
              onClick={() => activeQuotation && openDuplicateModal(activeQuotation)}
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
            {canFeedback && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<MessageSquareWarning className="h-4 w-4" />}
                loading={updateQuotation.isPending}
                onClick={() =>
                  void handleStatusChange(
                    "customer_feedback",
                    "Marked as customer feedback",
                  )
                }
              >
                Customer Feedback
              </Button>
            )}
            {canRequestChanges && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Pencil className="h-4 w-4" />}
                loading={updateQuotation.isPending}
                onClick={() =>
                  void handleStatusChange(
                    "revision_required",
                    "Marked as revision required",
                  )
                }
              >
                Revision Required
              </Button>
            )}
            {canApprove && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Check className="h-4 w-4" />}
                loading={updateQuotation.isPending}
                onClick={() =>
                  void handleStatusChange("accepted", "Quotation approved")
                }
              >
                Approve
              </Button>
            )}
            {canReject && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<X className="h-4 w-4" />}
                loading={updateQuotation.isPending}
                onClick={() => {
                  setRejectReason("");
                  setRejectOpen(true);
                }}
              >
                Reject
              </Button>
            )}
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
              onAddContact={handleAddContact}
              isAddingContact={addContact.isPending}
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
              onDuplicate={() => activeQuotation && openDuplicateModal(activeQuotation)}
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
        open={rejectOpen}
        onClose={() => {
          setRejectOpen(false);
          setRejectReason("");
        }}
        onConfirm={() => void handleReject()}
        title="Reject quotation?"
        description={`Explain why ${activeQuotation?.quotationNumber ?? "this quotation"} is being rejected. This reason is saved in the contact history.`}
        confirmLabel="Reject"
        variant="danger"
        loading={updateQuotation.isPending}
      >
        <div className="mt-3">
          <Textarea
            label="Rejection reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            placeholder="e.g. Customer chose a competitor due to lead time"
            rows={3}
            disabled={updateQuotation.isPending}
          />
        </div>
      </ConfirmationDialog>

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

      <DuplicateQuotationModal
        open={duplicateOpen}
        quotation={duplicateSource}
        onClose={() => {
          setDuplicateOpen(false);
          setDuplicateSource(null);
        }}
        onCreated={(created) => {
          setSelectedId(created.id);
          void refetch();
        }}
      />

      {activeQuotation && (
        <SendQuotationModal
          open={sendOpen}
          onClose={() => setSendOpen(false)}
          quotation={activeQuotation}
          onSent={() => {
            setSendOpen(false);
            void refetch();
          }}
        />
      )}
    </PageContainer>
  );
}

export const QuotationsPage = QuotationWorkspacePage;
