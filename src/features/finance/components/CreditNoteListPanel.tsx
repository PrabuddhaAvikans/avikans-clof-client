import { useMemo } from "react";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { workspaceListPanelBody, workspaceListPanelShell } from "@/lib/panelLayout";
import { SearchBar } from "@/components/ui/SearchBar";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CreditNoteStatus, type CreditNoteStatusValue } from "@/types/status";

import type { CreditNote } from "@/types/credit-note";

export type CreditNoteListPanelProps = {
  items: CreditNote[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: CreditNoteStatusValue | "";
  onStatusFilterChange: (value: CreditNoteStatusValue | "") => void;
  className?: string;
};

const STATUS_TABS: { value: CreditNoteStatusValue | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "issued", label: "Issued" },
  { value: "partially_applied", label: "Partially Applied" },
  { value: "applied", label: "Applied" },
];

export function CreditNoteListPanel({
  items,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  className,
}: CreditNoteListPanelProps) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((cn) => {
      const matchesSearch =
        !q ||
        cn.creditNoteNumber.toLowerCase().includes(q) ||
        cn.customerName.toLowerCase().includes(q) ||
        (cn.invoiceNumber ?? "").toLowerCase().includes(q);

      const matchesStatus = !statusFilter || cn.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  return (
    <div className={cn(workspaceListPanelShell, className)}>
      <div className="border-b border-border px-3 py-3">
        <h2 className="text-sm font-semibold text-foreground">Credit Notes</h2>
        <div className="mt-2.5">
          <SearchBar
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSearchChange(search);
            }}
            onClear={() => onSearchChange("")}
            placeholder="Search credit notes..."
            className="w-full"
          />
        </div>
        <div className="mt-2.5 flex gap-1 overflow-x-auto pb-0.5">
          {STATUS_TABS.map((tab) => (
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
            </button>
          ))}
        </div>
      </div>

      <div className={workspaceListPanelBody}>
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No credit notes match your filters.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "flex w-full flex-col gap-1.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                    selectedId === item.id && "bg-primary/5 hover:bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-medium text-primary" title={item.creditNoteNumber}>
                      {item.creditNoteNumber}
                    </p>
                    <MappedStatusBadge
                      statusMap={CreditNoteStatus}
                      value={item.status}
                      dot
                    />
                  </div>
                  <p className="truncate text-xs text-foreground" title={item.customerName}>{item.customerName}</p>
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(item.issueDate ?? item.createdAt)}</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {formatCurrency(item.remainingAmount, item.currency)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

