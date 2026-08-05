import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Pencil, Plus, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { SalesOrderDetailPanel } from "@/features/sales/components/SalesOrderDetailPanel";
import { SalesOrderListPanel } from "@/features/sales/components/SalesOrderListPanel";
import { SalesOrderWorkflowPanel } from "@/features/sales/components/SalesOrderWorkflowPanel";
import {
  useCancelSalesOrder,
  useConfirmSalesOrder,
  useSalesOrder,
  useSalesOrders,
} from "@/features/sales/hooks/useSalesOrders";
import type { SalesOrderStatusValue } from "@/types/status";

export function SalesOrderWorkspacePage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState<SalesOrderStatusValue | "">("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const canEdit =
    activeOrder &&
    (activeOrder.status === "draft" || activeOrder.status === "pending_review");
  const canCancel =
    activeOrder &&
    !["cancelled", "completed", "delivered"].includes(activeOrder.status);
  const canConfirm =
    activeOrder &&
    ["draft", "pending_review", "submitted"].includes(activeOrder.status);

  const handleConfirm = useCallback(async () => {
    if (!activeOrder) return;
    try {
      await confirmOrder.mutateAsync(activeOrder.id);
      toast.success(`${activeOrder.orderNumber} confirmed`);
      setConfirmOpen(false);
    } catch {
      toast.error("Failed to confirm sales order");
    }
  }, [activeOrder, confirmOrder]);

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

  return (
    <PageContainer maxWidth="full" className="py-3">
      <PageHeader
        title="Sales Orders"
        description="Manage orders converted from quotations and track fulfillment."
        className="mb-2"
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
      >
        <div className="grid min-h-[calc(100svh-11rem)] grid-cols-1 gap-2 lg:grid-cols-12">
          <div className="min-h-[18rem] lg:col-span-3 lg:min-h-0">
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
              className="h-full"
            />
          </div>

          <div className="min-h-[24rem] lg:col-span-6 lg:min-h-0">
            <SalesOrderDetailPanel order={activeOrder} className="h-full" />
          </div>

          <div className="min-h-[18rem] lg:col-span-3 lg:min-h-0">
            <SalesOrderWorkflowPanel
              order={activeOrder}
              onEdit={() =>
                activeOrder && navigate(ROUTES.salesOrders.edit(activeOrder.id))
              }
              onCancel={() => setCancelOpen(true)}
              onConfirm={() => setConfirmOpen(true)}
              onReview={() =>
                activeOrder && navigate(ROUTES.salesOrders.review(activeOrder.id))
              }
              isConfirming={confirmOrder.isPending}
              isCancelling={cancelOrder.isPending}
              className="h-full"
            />
          </div>
        </div>
      </PageContent>

      <ConfirmationDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void handleConfirm()}
        title="Confirm Sales Order?"
        description={`Confirm ${activeOrder?.orderNumber ?? "this order"}? This will move the order into fulfillment.`}
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
    </PageContainer>
  );
}

export const SalesOrdersPage = SalesOrderWorkspacePage;
