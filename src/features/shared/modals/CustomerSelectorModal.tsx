import { useMemo, useState } from "react";
import { Button, Modal, SearchBar } from "@/components/ui";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { formatDate } from "@/lib/format";
import type { Customer } from "@/types/customer";

export type CustomerSelectorModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
  title?: string;
};

export function CustomerSelectorModal({
  open,
  onClose,
  onSelect,
  title = "Select Customer",
}: CustomerSelectorModalProps) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useCustomers({
    page: 1,
    pageSize: 50,
    search: search || undefined,
  });

  const customers = useMemo(() => data?.items ?? [], [data?.items]);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    onClose();
    setSearch("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="space-y-4">
        <SearchBar
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, or company..."
        />

        <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading customers...</p>
          ) : customers.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No customers found</p>
          ) : (
            <ul className="divide-y divide-border">
              {customers.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(customer)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{customer.name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {customer.email} · {customer.code}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge
                        variant={customer.status === "active" ? "success" : "neutral"}
                        size="sm"
                      >
                        {customer.status}
                      </StatusBadge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(customer.updatedAt)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
