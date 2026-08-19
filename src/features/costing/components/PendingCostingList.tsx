import { useMemo, useState } from "react";
import { Check, Eye, FileText, MoreHorizontal } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { RowActions, type RowActionItem } from "@/components/ui/RowActions";
import { SearchBar } from "@/components/ui/SearchBar";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workspaceListPanelBody, workspaceListPanelShell } from "@/lib/panelLayout";
import type { CostingRequest } from "@/types/costing";
import { CostingRequestStatus } from "@/types/status";

export type PendingCostingListProps = {
  items: CostingRequest[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onApprove?: (id: string) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
};

export function PendingCostingList({
  items,
  totalCount,
  selectedId,
  onSelect,
  onApprove,
  page,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
  isLoading,
}: PendingCostingListProps) {
  const [localSearch, setLocalSearch] = useState(search);

  const handleSearchSubmit = () => {
    onSearchChange(localSearch);
  };

  const rowActions = useMemo(
    () =>
      (item: CostingRequest): RowActionItem[] => {
        const canApprove =
          item.coatingStatus !== "pending" &&
          (item.status === "pending" ||
            item.status === "in_review" ||
            item.status === "changes_requested");

        return [
          {
            id: "view",
            label: "View",
            icon: <Eye className="h-4 w-4" />,
            onClick: () => onSelect(item.id),
            primary: true,
          },
          {
            id: "approve",
            label: "Approve",
            icon: <Check className="h-4 w-4" />,
            onClick: () => onApprove?.(item.id),
            primary: true,
            disabled: !canApprove || !onApprove,
          },
          {
            id: "details",
            label: "Open details",
            icon: <FileText className="h-4 w-4" />,
            onClick: () => onSelect(item.id),
          },
          {
            id: "more",
            label: "Copy request #",
            icon: <MoreHorizontal className="h-4 w-4" />,
            onClick: () => {
              void navigator.clipboard.writeText(item.requestNumber);
            },
          },
        ];
      },
    [onApprove, onSelect],
  );

  return (
    <div className={workspaceListPanelShell}>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Pending Costing Items</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {totalCount} request{totalCount !== 1 ? "s" : ""} awaiting review
        </p>
        <div className="mt-3">
          <SearchBar
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSearchSubmit();
              }
            }}
            onClear={() => {
              setLocalSearch("");
              onSearchChange("");
            }}
            placeholder="Search by request #, customer, project…"
            className="w-full"
          />
        </div>
      </div>

      <div className={workspaceListPanelBody}>
        {isLoading ? (
          <div className="space-y-0 divide-y divide-border">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="px-3 py-3">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-40 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No costing requests match your search.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <div
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 px-3 py-2.5 transition-colors hover:bg-muted/50",
                    selectedId === item.id && "bg-primary/5 hover:bg-primary/5",
                  )}
                  onClick={() => onSelect(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(item.id);
                    }
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary">
                          {item.salesOrderNumber ?? item.requestNumber}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {item.customerName}
                          {item.salesOrderNumber ? ` · ${item.requestNumber}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(item.requestedDate)}
                        </p>
                      </div>
                      <div
                        className="shrink-0"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <RowActions actions={rowActions(item)} maxVisible={2} />
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm tabular-nums text-foreground">
                        {formatCurrency(item.totalEstimate, item.currency)}
                      </p>
                      <MappedStatusBadge
                        statusMap={CostingRequestStatus}
                        value={item.status}
                        dot
                      />
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalCount > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalCount}
          onChange={onPageChange}
          className="rounded-none border-0 border-t border-border"
          showPageSize={false}
        />
      )}
    </div>
  );
}
