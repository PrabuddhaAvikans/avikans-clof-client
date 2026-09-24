import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Pencil, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { ApplyCreditNoteModal } from "@/features/finance/components/ApplyCreditNoteModal";
import { initialCreditNotes } from "@/features/finance/mock/mockCreditNotes";
import { initialInvoices } from "@/features/finance/mock/mockInvoices";
import { SalesOrderCostingPanel } from "@/features/sales/components/SalesOrderCostingPanel";
import { SalesOrderDetailPanel } from "@/features/sales/components/SalesOrderDetailPanel";
import { SalesOrderListPanel } from "@/features/sales/components/SalesOrderListPanel";
import { SalesOrderWorkflowPanel } from "@/features/sales/components/SalesOrderWorkflowPanel";
import {
  useCancelSalesOrder,
  useConfirmSalesOrder,
  useSalesOrder,
  useSalesOrders,
} from "@/features/sales/hooks/useSalesOrders";
import {
  useCostingBySalesOrder,
  useCreateCostingFromSalesOrder,
} from "@/features/costing/hooks/useCosting";
import { canConfirmSalesOrder, getConfirmBlockReason } from "@/features/sales/lib/salesOrderFlow";
import type { CreditNote } from "@/types/credit-note";
import type { Invoice } from "@/types/invoice";
import type { CreditNoteStatusValue, SalesOrderStatusValue } from "@/types/status";
import { cn } from "@/lib/utils";
import {
  workspaceGrid,
  workspaceGridCol,
  workspacePanelFill,
  workspacePanelGrow,
  workspacePanelHug,
} from "@/lib/panelLayout";

export function SalesOrderWorkspacePage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<SalesOrderStatusValue | "">("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applyCreditOpen, setApplyCreditOpen] = useState(false);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>(initialCreditNotes);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  const { data, isLoading, error, refetch } = useSalesOrders({
    page,
    pageSize,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const { data: countsData } = useSalesOrders({ page: 1, pageSize: 100 });
  const { data: selectedOrder } = useSalesOrder(selectedId ?? "");

  const confirmOrder = useConfirmSalesOrder();
  const cancelOrder = useCancelSalesOrder();
  const { data: orderCosting } = useCostingBySalesOrder(selectedId ?? "");
  const createCosting = useCreateCostingFromSalesOrder();

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

  const activeOrder =
    selectedOrder ?? data?.items.find((item) => item.id === selectedId) ?? null;

  const statusCounts = useMemo(() => {
    const items = countsData?.items ?? [];
    const counts: Partial<Record<SalesOrderStatusValue | "", number>> = {
      "": countsData?.totalCount ?? items.length,
    };
    for (const item of items) {
      counts[item.status] = (counts[item.status] ?? 0) + 1;
    }
    return counts;
  }, [countsData]);

  const orderCreditNotes = useMemo(() => {
    if (!activeOrder) return [];
    return creditNotes.filter(
      (cn) =>
        cn.salesOrderId === activeOrder.id &&
        cn.remainingAmount > 0 &&
        cn.status !== "void" &&
        cn.status !== "draft",
    );
  }, [activeOrder, creditNotes]);

  const orderInvoices = useMemo(() => {
    if (!activeOrder) return [];
    return invoices.filter((inv) => inv.salesOrderId === activeOrder.id);
  }, [activeOrder, invoices]);

  const canApplyCreditNote =
    Boolean(activeOrder) &&
    orderCreditNotes.length > 0 &&
    orderInvoices.some((inv) => inv.outstandingAmount > 0);

  const canEdit =
    activeOrder &&
    (activeOrder.status === "draft" || activeOrder.status === "pending_review");
  const canCancel =
    activeOrder &&
    !["cancelled", "completed", "delivered"].includes(activeOrder.status);
  const canConfirm = canConfirmSalesOrder(activeOrder, orderCosting);
  const confirmBlockReason = getConfirmBlockReason(activeOrder, orderCosting);

  const handleConfirm = useCallback(async () => {
    if (!activeOrder) return;
    try {
      await confirmOrder.mutateAsync(activeOrder.id);
      toast.success(`${activeOrder.orderNumber} confirmed`);
      setConfirmOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Complete estimation and costing approval before confirming.",
      );
    }
  }, [activeOrder, confirmOrder]);

  const handleCreateCosting = useCallback(async () => {
    if (!activeOrder) return;
    try {
      const created = await createCosting.mutateAsync(activeOrder);
      toast.success(`BOM estimation ${created.requestNumber} created and sent for costing approval`);
      navigate(ROUTES.costing.forOrder(activeOrder.id));
    } catch {
      toast.error("Failed to create estimation request");
    }
  }, [activeOrder, createCosting, navigate]);

  const handleCancel = useCallback(async () => {
    if (!activeOrder) return;
    try {
      await cancelOrder.mutateAsync({ id: activeOrder.id });
      toast.success(`${activeOrder.orderNumber} cancelled`);
      setCancelOpen(false);
      void refetch();
    } catch {
      toast.error("Failed to cancel sales order");
    }
  }, [activeOrder, cancelOrder, refetch]);

  const handleApplyCreditNote = useCallback(
    async (args: {
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
          const newStatus =
            newOutstanding === 0 ? "paid" : newCredited > 0 ? "partial" : "issued";

          return {
            ...inv,
            amountCredited: newCredited,
            outstandingAmount: newOutstanding,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          };
        }),
      );

      toast.success(
        `Applied ${applyAmount.toFixed(2)} from ${credit.creditNoteNumber} to ${invoice.invoiceNumber}.`,
      );
    },
    [creditNotes, invoices],
  );

  return (
    <PageContainer maxWidth="full" className="flex min-h-0 flex-col py-3 lg:h-full lg:overflow-hidden">
      <PageHeader
        title="Sales Orders"
        description="Sales order generates a BOM estimation automatically, then costing goes to approval before confirm."
        className="mb-2 shrink-0"
        actions={
          <>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.salesOrders.new)}
            >
              New Sales Order
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Pencil className="h-4 w-4" />}
              disabled={!canEdit}
              onClick={() =>
                activeOrder && navigate(ROUTES.salesOrders.edit(activeOrder.id))
              }
            >
              Edit
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<X className="h-4 w-4" />}
              disabled={!canCancel}
              onClick={() => setCancelOpen(true)}
            >
              Cancel Order
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Check className="h-4 w-4" />}
              disabled={!canConfirm}
              loading={confirmOrder.isPending}
              onClick={() => setConfirmOpen(true)}
            >
              Confirm Order
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
        error={error ? "Failed to load sales orders." : null}
        onRetry={() => void refetch()}
        loadingVariant="card"
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className={workspaceGrid}>
          <div className={cn("min-h-[18rem] lg:col-span-3 lg:overflow-hidden", workspaceGridCol)}>
            <SalesOrderListPanel
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

          <div className={cn("min-h-[24rem] lg:col-span-5 lg:overflow-hidden", workspaceGridCol)}>
            <SalesOrderDetailPanel order={activeOrder} className={workspacePanelFill} />
          </div>

          <div className={cn("flex min-h-0 flex-col gap-2 lg:col-span-4 lg:overflow-hidden", workspaceGridCol)}>
            <SalesOrderCostingPanel
              order={activeOrder}
              costing={orderCosting ?? null}
              onCreateCosting={() => void handleCreateCosting()}
              isCreating={createCosting.isPending}
              className={workspacePanelHug}
            />
            <SalesOrderWorkflowPanel
              order={activeOrder}
              costing={orderCosting ?? null}
              onEdit={() =>
                activeOrder && navigate(ROUTES.salesOrders.edit(activeOrder.id))
              }
              onCancel={() => setCancelOpen(true)}
              onConfirm={() => setConfirmOpen(true)}
              onReview={() =>
                activeOrder && navigate(ROUTES.salesOrders.review(activeOrder.id))
              }
              onApplyCreditNote={() => setApplyCreditOpen(true)}
              canApplyCreditNote={canApplyCreditNote}
              isConfirming={confirmOrder.isPending}
              isCancelling={cancelOrder.isPending}
              className={workspacePanelGrow}
            />
          </div>
        </div>
      </PageContent>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirm()}
        title="Confirm Sales Order?"
        description={`Confirm ${activeOrder?.orderNumber ?? "this order"}? ${confirmBlockReason ?? "This will move the order into fulfillment."}`}
        confirmLabel="Confirm Order"
        loading={confirmOrder.isPending}
      />

      <ConfirmationDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => void handleCancel()}
        title="Cancel Sales Order?"
        description={`Cancel ${activeOrder?.orderNumber ?? "this order"}? The order will be marked as cancelled.`}
        confirmLabel="Cancel Order"
        variant="danger"
        loading={cancelOrder.isPending}
      />

      <ApplyCreditNoteModal
        open={applyCreditOpen}
        onClose={() => setApplyCreditOpen(false)}
        creditNotes={orderCreditNotes}
        invoices={orderInvoices}
        salesOrderId={activeOrder?.id}
        onApply={handleApplyCreditNote}
      />
    </PageContainer>
  );
}

export const SalesOrdersPage = SalesOrderWorkspacePage;
