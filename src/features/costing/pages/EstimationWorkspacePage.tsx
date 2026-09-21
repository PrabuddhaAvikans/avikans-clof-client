import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Calculator, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { EstimationDetailPanel } from "@/features/costing/components/EstimationDetailPanel";
import { EstimationListPanel } from "@/features/costing/components/EstimationListPanel";
import {
  useCostingRequest,
  useCostingRequests,
  useSubmitCoating,
} from "@/features/costing/hooks/useCosting";
import { useInventoryItems } from "@/features/inventory/hooks/useInventory";
import type { CoatingSubmitFormValues } from "@/features/costing/schemas/costingSchema";
import { cn } from "@/lib/utils";
import {
  workspaceGrid,
  workspaceGridCol,
  workspacePanelFill,
} from "@/lib/panelLayout";
import type { CoatingStatusValue } from "@/types/status";

export function EstimationWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const salesOrderIdParam = searchParams.get("salesOrderId");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [coatingStatusFilter, setCoatingStatusFilter] = useState<CoatingStatusValue | "">(
    "",
  );

  const { data, isLoading, error, refetch } = useCostingRequests({
    page,
    pageSize,
    search: search || undefined,
    coatingStatus: coatingStatusFilter || undefined,
    salesOrderId: salesOrderIdParam || undefined,
    linkedToSalesOrder: true,
  });

  const { data: selectedRequest } = useCostingRequest(selectedId ?? "");
  const { data: inventoryData } = useInventoryItems({ page: 1, pageSize: 500 });
  const submitCoating = useSubmitCoating();

  useEffect(() => {
    if (!selectedId && data?.items.length) {
      setSelectedId(data.items[0].id);
    }
  }, [data?.items, selectedId]);

  useEffect(() => {
    if (selectedId && data?.items.length && !data.items.some((item) => item.id === selectedId)) {
      setSelectedId(data.items[0]?.id ?? null);
    }
  }, [data?.items, selectedId]);

  const activeRequest =
    selectedRequest ?? data?.items.find((item) => item.id === selectedId) ?? null;

  const handleSubmit = useCallback(
    async (values: CoatingSubmitFormValues) => {
      if (!activeRequest) return;
      try {
        const result = await submitCoating.mutateAsync({
          id: activeRequest.id,
          data: {
            items: values.items,
            materials: values.materials,
            notes: values.notes,
          },
        });
        toast.success(`Estimation submitted for ${result.salesOrderNumber ?? result.requestNumber}`);
        void refetch();
        if (result.salesOrderId) {
          navigate(ROUTES.costing.forOrder(result.salesOrderId));
        }
      } catch {
        toast.error("Failed to submit estimation");
      }
    },
    [activeRequest, navigate, refetch, submitCoating],
  );

  return (
    <PageContainer maxWidth="full" className="py-3">
      <PageHeader
        title="Product Estimation"
        description="Sales order products generate a BOM estimation automatically. Review here only if costing requests changes; otherwise continue to approval."
        className="mb-2"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Calculator className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.costing.workspace)}
            >
              Costing & Approval
            </Button>
            <Button
              variant="ghost"
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
        error={error ? "Failed to load estimation requests." : null}
        onRetry={() => void refetch()}
        loadingVariant="card"
      >
        <div className={workspaceGrid}>
          <div className={cn("min-h-[18rem] lg:col-span-4", workspaceGridCol)}>
            <EstimationListPanel
              items={data?.items ?? []}
              totalCount={data?.totalCount ?? 0}
              selectedId={selectedId}
              onSelect={setSelectedId}
              coatingStatusFilter={coatingStatusFilter}
              onCoatingStatusFilterChange={(status) => {
                setCoatingStatusFilter(status);
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
          <div className={cn("min-h-[24rem] lg:col-span-8", workspaceGridCol)}>
            <EstimationDetailPanel
              request={activeRequest}
              onSubmitEstimation={handleSubmit}
              isSubmitting={submitCoating.isPending}
              inventoryItems={inventoryData?.items ?? []}
              className={workspacePanelFill}
            />
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}
