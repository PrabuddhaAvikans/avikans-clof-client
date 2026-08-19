import { useMemo, useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workspaceListPanelBody, workspaceListPanelShell } from "@/lib/panelLayout";
import type { CostingRequest } from "@/types/costing";
import { CoatingStatus, type CoatingStatusValue } from "@/types/status";

const STATUS_TABS: { value: CoatingStatusValue | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "pending", label: "Awaiting" },
  { value: "submitted", label: "Submitted" },
];

export type CoatingListPanelProps = {
  items: CostingRequest[];
  totalCount: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  coatingStatusFilter: CoatingStatusValue | "";
  onCoatingStatusFilterChange: (status: CoatingStatusValue | "") => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
  className?: string;
};

export function CoatingListPanel({
  items,
  totalCount,
  selectedId,
  onSelect,
  coatingStatusFilter,
  onCoatingStatusFilterChange,
  page,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
  isLoading,
  className,
}: CoatingListPanelProps) {
  const [localSearch, setLocalSearch] = useState(search);

  const tabs = useMemo(() => STATUS_TABS, []);

  return (
    <div className={cn(workspaceListPanelShell, className)}>
      <div className="border-b border-border px-3 py-3">
        <h2 className="text-sm font-semibold text-foreground">Coating Requests</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {totalCount} sales-order coating job{totalCount !== 1 ? "s" : ""}
        </p>
        <div className="mt-2.5">
          <SearchBar
            value={localSearch}
            onChange={(event) => setLocalSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearchChange(localSearch);
            }}
            onClear={() => {
              setLocalSearch("");
              onSearchChange("");
            }}
            placeholder="Search SO, customer, request…"
            className="w-full"
          />
        </div>
        <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => onCoatingStatusFilterChange(tab.value)}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                coatingStatusFilter === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className={workspaceListPanelBody}>
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="space-y-2 px-3 py-3">
                <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-3 w-36 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No coating requests match your filters.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(item.id);
                    }
                  }}
                  className={cn(
                    "flex w-full cursor-pointer flex-col gap-1.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                    selectedId === item.id && "bg-primary/5 hover:bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-primary">
                      {item.salesOrderNumber ?? item.requestNumber}
                    </p>
                    <MappedStatusBadge statusMap={CoatingStatus} value={item.coatingStatus} dot />
                  </div>
                  <p className="truncate text-xs text-foreground">{item.customerName}</p>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(item.requestedDate)}</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {formatCurrency(item.totalEstimate, item.currency)}
                    </span>
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
          onChange={(nextPage) => onPageChange(nextPage)}
          className="rounded-none border-0 border-t border-border"
          showPageSize={false}
        />
      )}
    </div>
  );
}
