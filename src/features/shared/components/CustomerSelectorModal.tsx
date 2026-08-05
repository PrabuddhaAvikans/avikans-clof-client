import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useCustomers } from "@/features/customers/hooks/useCustomers";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { SearchBar } from "@/components/ui/SearchBar";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import type { Customer } from "@/types/customer";
import { CustomerType } from "@/types/customer";
import { RegisterCustomerModal } from "@/features/customers/components/RegisterCustomerModal";

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
  const [registerOpen, setRegisterOpen] = useState(false);
  const { data, isLoading, error, refetch } = useCustomers({
    page: 1,
    pageSize: 50,
    search: search || undefined,
    status: "active",
  });

  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      { accessorKey: "code", header: "Customer #" },
      { accessorKey: "name", header: "Name" },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) =>
          row.original.type.charAt(0).toUpperCase() + row.original.type.slice(1),
      },
      { accessorKey: "email", header: "Email" },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              onSelect(row.original);
              onClose();
            }}
          >
            Select
          </Button>
        ),
      },
    ],
    [onClose, onSelect],
  );

  const showRegisterCTA = !isLoading && !error && (data?.items.length ?? 0) === 0;

  useEffect(() => {
    // Reset internal state whenever the selector is opened/closed.
    setSearch("");
    setRegisterOpen(false);
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title} size="xl">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <SearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            containerClassName="min-w-0 flex-1"
          />
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="h-9 shrink-0"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setRegisterOpen(true)}
          >
            Register
          </Button>
        </div>
        <PageContent
          isLoading={isLoading}
          error={error ? "Failed to load customers." : null}
          onRetry={() => void refetch()}
          isEmpty={showRegisterCTA}
          emptyTitle="No matching customers"
          emptyDescription="Use Register to create a new customer."
          loadingVariant="table"
        >
          <DataTable
            data={data?.items ?? []}
            columns={columns}
            pageSize={8}
            enableColumnVisibility={false}
            getRowId={(row) => row.id}
          />
        </PageContent>
      </div>

      <RegisterCustomerModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={(customer) => {
          onSelect(customer);
          setRegisterOpen(false);
          onClose();
        }}
      />
    </Modal>
  );
}

export const CUSTOMER_TYPE_OPTIONS = [
  { value: CustomerType.individual, label: "Individual" },
  { value: CustomerType.retail, label: "Retail" },
  { value: CustomerType.corporate, label: "Corporate" },
];
