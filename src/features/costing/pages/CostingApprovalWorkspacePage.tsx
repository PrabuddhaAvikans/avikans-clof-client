import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Filter,
  MoreHorizontal,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { Select } from "@/components/ui/Select";
import { ApprovalWorkflowPanel } from "@/features/costing/components/ApprovalWorkflowPanel";
import { CostingDetailPanel } from "@/features/costing/components/CostingDetailPanel";
import { CostingKpiCards } from "@/features/costing/components/CostingKpiCards";
import { PendingCostingList } from "@/features/costing/components/PendingCostingList";
import {
  useAddCostingComment,
  useApproveCostingRequest,
  useCostingRequest,
  useCostingRequests,
  useRejectCostingRequest,
  useRequestCostingChanges,
  useUpdateCostingNotes,
} from "@/features/costing/hooks/useCosting";
import { CostingRequestStatus, type CostingRequestStatusValue } from "@/types/status";

const STATUS_OPTIONS = Object.entries(CostingRequestStatus).map(([value, def]) => ({
  value,
  label: def.label,
}));

export function CostingApprovalWorkspacePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const salesOrderIdParam = searchParams.get("salesOrderId");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [statusFilter, setStatusFilter] = useState<CostingRequestStatusValue | "">("");
  const [appliedStatus, setAppliedStatus] = useState<CostingRequestStatusValue | "">("");
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const { data, isLoading, error, refetch } = useCostingRequests({
    page,
    pageSize,
    search: search || undefined,
    status: appliedStatus || undefined,
    salesOrderId: salesOrderIdParam || undefined,
  });

  const { data: selectedRequest, isLoading: isDetailLoading } = useCostingRequest(
    selectedId ?? "",
  );

  const approveMutation = useApproveCostingRequest();
  const rejectMutation = useRejectCostingRequest();
  const requestChangesMutation = useRequestCostingChanges();
  const updateNotesMutation = useUpdateCostingNotes();
  const addCommentMutation = useAddCostingComment();

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

  const activeRequest = selectedRequest ?? data?.items.find((item) => item.id === selectedId) ?? null;

  const canDecide = useMemo(
    () =>
      activeRequest &&
      activeRequest.coatingStatus !== "pending" &&
      (activeRequest.status === "pending" ||
        activeRequest.status === "in_review" ||
        activeRequest.status === "changes_requested"),
    [activeRequest],
  );

  const handleApprove = useCallback(
    async (id: string, comment?: string) => {
      try {
        const result = await approveMutation.mutateAsync({ id, comment });
        toast.success(
          result.status === "approved"
            ? `${result.requestNumber} fully approved`
            : `${result.requestNumber} advanced to next approval level`,
        );
      } catch {
        toast.error("Failed to approve costing request");
      }
    },
    [approveMutation],
  );

  const handleReject = useCallback(
    async (comment: string) => {
      if (!selectedId) return;
      try {
        const result = await rejectMutation.mutateAsync({ id: selectedId, comment });
        toast.error(`${result.requestNumber} rejected`);
      } catch {
        toast.error("Failed to reject costing request");
      }
    },
    [rejectMutation, selectedId],
  );

  const handleRequestChanges = useCallback(
    async (comment: string) => {
      if (!selectedId) return;
      try {
        const result = await requestChangesMutation.mutateAsync({ id: selectedId, comment });
        toast.info(`Changes requested for ${result.requestNumber}`);
      } catch {
        toast.error("Failed to request changes");
      }
    },
    [requestChangesMutation, selectedId],
  );

  const handleSaveNotes = useCallback(
    async (notes: string) => {
      if (!selectedId) return;
      try {
        await updateNotesMutation.mutateAsync({ id: selectedId, notes });
        toast.success("Notes saved");
      } catch {
        toast.error("Failed to save notes");
      }
    },
    [selectedId, updateNotesMutation],
  );

  const handleAddComment = useCallback(
    async (comment: string) => {
      if (!selectedId) return;
      try {
        await addCommentMutation.mutateAsync({ id: selectedId, comment });
        toast.success("Comment posted");
      } catch {
        toast.error("Failed to post comment");
      }
    },
    [addCommentMutation, selectedId],
  );

  const applyFilters = () => {
    setAppliedStatus(statusFilter);
    setPage(1);
    void refetch();
  };

  const resetFilters = () => {
    setStatusFilter("");
    setAppliedStatus("");
    setSearch("");
    setPage(1);
    void refetch();
  };

  return (
    <PageContainer maxWidth="full" className="py-3">
      <PageHeader
        title="Costing & Approval Workspace"
        description="Sales order generates a BOM estimation automatically. Approve costing here before the order can be confirmed."
        className="mb-2"
        actions={
          <>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.estimation.workspace)}
            >
              Product Estimation
            </Button>
            <Button
              variant="success"
              size="sm"
              leftIcon={<Check className="h-4 w-4" />}
              disabled={!canDecide || !selectedId}
              loading={approveMutation.isPending}
              onClick={() => selectedId && void handleApprove(selectedId)}
            >
              Approve
            </Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<X className="h-4 w-4" />}
              disabled={!canDecide || !selectedId}
              loading={rejectMutation.isPending}
              onClick={() => {
                toast.info("Use the decision comment in the approval panel to reject.");
              }}
            >
              Reject
            </Button>
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<MoreHorizontal className="h-4 w-4" />}
                rightIcon={<ChevronDown className="h-3.5 w-3.5" />}
                onClick={() => setShowMoreMenu((open) => !open)}
              >
                More
              </Button>
              {showMoreMenu && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-md border border-border bg-popover py-1 shadow-md">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setShowMoreMenu(false);
                      if (activeRequest) {
                        void navigator.clipboard.writeText(activeRequest.requestNumber);
                        toast.success("Request number copied");
                      }
                    }}
                  >
                    Copy request #
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setShowMoreMenu(false);
                      navigate(ROUTES.quotations.list);
                    }}
                  >
                    View all quotations
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setShowMoreMenu(false);
                      navigate(ROUTES.estimation.workspace);
                    }}
                  >
                    Product estimation
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      setShowMoreMenu(false);
                      navigate(ROUTES.salesOrders.list);
                    }}
                  >
                    Sales orders
                  </button>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Filter className="h-4 w-4" />}
              onClick={() => {
                const panel = document.getElementById("costing-filters");
                panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
              }}
            >
              Filters
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
        error={error ? "Failed to load costing requests." : null}
        onRetry={() => void refetch()}
        loadingVariant="table"
      >
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
            <CostingKpiCards request={activeRequest} />
          </div>

          <div id="costing-filters" className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4">
            <FilterPanel
              variant="toolbar"
              onApply={applyFilters}
              onReset={resetFilters}
            >
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[160px] flex-1 sm:max-w-[220px]">
                  <Select
                    label="Status"
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(event.target.value as CostingRequestStatusValue | "")
                    }
                    options={[{ value: "", label: "All statuses" }, ...STATUS_OPTIONS]}
                  />
                </div>
              </div>
            </FilterPanel>
          </div>

          <div className="col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-1">
            <PendingCostingList
              items={data?.items ?? []}
              totalCount={data?.totalCount ?? 0}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onApprove={(id) => void handleApprove(id)}
              page={page}
              pageSize={pageSize}
              onPageChange={(nextPage) => setPage(nextPage)}
              search={search}
              onSearchChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              isLoading={isLoading}
            />
          </div>

          <div className="col-span-1 md:col-span-1 lg:col-span-1 xl:col-span-2">
            <CostingDetailPanel
              request={isDetailLoading ? activeRequest : selectedRequest ?? activeRequest}
              onSaveNotes={handleSaveNotes}
              isSavingNotes={updateNotesMutation.isPending}
              className="min-h-[28rem]"
            />
          </div>

          <div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-1">
            <ApprovalWorkflowPanel
              request={isDetailLoading ? activeRequest : selectedRequest ?? activeRequest}
              onApprove={(comment) => selectedId && void handleApprove(selectedId, comment)}
              onReject={handleReject}
              onRequestChanges={handleRequestChanges}
              onAddComment={handleAddComment}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
              isRequestingChanges={requestChangesMutation.isPending}
              isAddingComment={addCommentMutation.isPending}
              className="min-h-[28rem]"
            />
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}
