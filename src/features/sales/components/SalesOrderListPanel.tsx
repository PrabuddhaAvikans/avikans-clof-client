import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { Pagination } from "@/components/ui/Pagination";
import { SearchBar } from "@/components/ui/SearchBar";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { workspaceListPanelBody, workspaceListPanelShell } from "@/lib/panelLayout";
import type { SalesOrder } from "@/types/sales-order";
import { SalesOrderStatus, type SalesOrderStatusValue } from "@/types/status";

const STATUS_TABS: { value: SalesOrderStatusValue | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Review" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_manufacturing", label: "Manufacturing" },
  { value: "ready_for_delivery", label: "Ready" },
  { value: "delivered", label: "Delivered" },
  { value: "completed", label: "Completed" },
];

export type SalesOrderListPanelProps = {
  items: SalesOrder[];
  totalCount: number;
  statusCounts?: Partial<Record<SalesOrderStatusValue | "", number>>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusFilter: SalesOrderStatusValue | "";
  onStatusFilterChange: (status: SalesOrderStatusValue | "") => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
  className?: string;
};

export function SalesOrderListPanel({
  items,
  totalCount,
  statusCounts,
  selectedId,
  onSelect,
  statusFilter,
  onStatusFilterChange,
  page,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
  isLoading,
  className,
}: SalesOrderListPanelProps) {
  const [localSearch, setLocalSearch] = useState(search);

  const tabs = useMemo(
    () =>
      STATUS_TABS.map((tab) => ({
        ...tab,
        count:
          tab.value === ""
            ? (statusCounts?.[""] ?? totalCount)
            : (statusCounts?.[tab.value] ?? 0),
      })),
    [statusCounts, totalCount],
  );

  return (
    <div
      className={cn(workspaceListPanelShell, className)}
    >
      <div className="border-b border-border px-3 py-3">
        <h2 className="text-sm font-semibold text-foreground">Sales Orders</h2>
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
            placeholder="Search orders..."
            className="w-full"
          />
        </div>
        <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              onClick={() => onStatusFilterChange(tab.value)}
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                statusFilter === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {tab.label}
              <span className="ml-1 opacity-70">{tab.count}</span>
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
            No sales orders match your filters.
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
                  title={item.orderNumber}
                  className={cn(
                    "flex w-full cursor-pointer flex-col gap-1.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                    selectedId === item.id && "bg-primary/5 hover:bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1">
                      <p className="truncate text-sm font-medium text-primary" title={item.orderNumber}>
                        {item.orderNumber}
                      </p>
                      <Link
                        to={ROUTES.salesOrders.detail(item.id)}
                        title="Open order page"
                        aria-label={`Open ${item.orderNumber}`}
                        className="shrink-0 rounded p-0.5 text-primary hover:bg-primary/10"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                    <MappedStatusBadge
                      statusMap={SalesOrderStatus}
                      value={item.status}
                      dot
                    />
                  </div>
                  <p className="truncate text-xs text-foreground" title={item.customerName}>{item.customerName}</p>
                  {item.quotationNumber && (
                    <p className="truncate text-[11px] text-muted-foreground" title={`From ${item.quotationNumber}`}>
                      From {item.quotationNumber}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(item.createdAt)}</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {formatCurrency(item.totalAmount, item.currency)}
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
