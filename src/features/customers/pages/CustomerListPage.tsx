import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Eye,
  FileText,
  History,
  Pencil,
  Plus,
  ShoppingCart,
  UserCheck,
  UserX,
} from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { RowActions, type RowActionItem } from "@/components/ui/RowActions";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { EntityStatusBadge } from "@/features/shared/components/EntityStatusBadge";
import { CUSTOMER_TYPE_OPTIONS } from "@/features/shared/components/CustomerSelectorModal";
import {
  useCustomers,
  useDeleteCustomer,
  useUpdateCustomer,
} from "@/features/customers/hooks/useCustomers";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Customer } from "@/types/customer";
import type { CustomerTypeValue } from "@/types/customer";
import type { EntityStatus } from "@/types/common";

export function CustomerListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<CustomerTypeValue | "">("");
  const [statusFilter, setStatusFilter] = useState<EntityStatus | "">("");
  const [applied, setApplied] = useState({ search: "", type: "" as CustomerTypeValue | "", status: "" as EntityStatus | "" });
  const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(null);

  const { data, isLoading, error, refetch } = useCustomers({
    page: 1,
    pageSize: 100,
    search: applied.search || undefined,
    type: applied.type || undefined,
    status: applied.status || undefined,
  });

  const deleteCustomer = useDeleteCustomer();
  const updateCustomer = useUpdateCustomer();

  const handleToggleStatus = async (customer: Customer) => {
    const nextStatus: EntityStatus = customer.status === "active" ? "inactive" : "active";
    await updateCustomer.mutateAsync({
      id: customer.id,
      data: { status: nextStatus },
    });
    setDeactivateTarget(null);
  };

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
      {
        id: "contact",
        header: "Contact",
        cell: ({ row }) =>
          row.original.contactPersons.find((c) => c.isPrimary)?.name ??
          row.original.contactPersons[0]?.name ??
          "-",
      },
      { accessorKey: "phone", header: "Phone" },
      { accessorKey: "email", header: "Email" },
      {
        id: "salesperson",
        header: "Salesperson",
        cell: () => "Unassigned",
      },
      {
        id: "lastOrder",
        header: "Last Order",
        cell: ({ row }) =>
          row.original.totalOrders > 0 ? formatDate(row.original.updatedAt) : "-",
      },
      {
        accessorKey: "totalRevenue",
        header: "Total Value",
        cell: ({ row }) => formatCurrency(row.original.totalRevenue, "LKR"),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const customer = row.original;
          const actions: RowActionItem[] = [
            {
              id: "view",
              label: "View",
              icon: <Eye className="h-4 w-4" />,
              primary: true,
              onClick: () => navigate(ROUTES.customers.detail(customer.id)),
            },
            {
              id: "edit",
              label: "Edit",
              icon: <Pencil className="h-4 w-4" />,
              primary: true,
              onClick: () => navigate(ROUTES.customers.edit(customer.id)),
            },
            {
              id: "estimate",
              label: "Create Quotation",
              icon: <FileText className="h-4 w-4" />,
              primary: true,
              onClick: () =>
                navigate(`${ROUTES.quotations.new}?customerId=${customer.id}`),
            },
            {
              id: "sales-order",
              label: "Create Sales Order",
              icon: <ShoppingCart className="h-4 w-4" />,
              onClick: () =>
                navigate(`${ROUTES.salesOrders.new}?customerId=${customer.id}`),
            },
            {
              id: "toggle-status",
              label: customer.status === "active" ? "Deactivate" : "Activate",
              icon:
                customer.status === "active" ? (
                  <UserX className="h-4 w-4" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                ),
              onClick: () => setDeactivateTarget(customer),
            },
            {
              id: "history",
              label: "View History",
              icon: <History className="h-4 w-4" />,
              onClick: () =>
                navigate(`${ROUTES.customers.detail(customer.id)}?tab=activity`),
            },
          ];

          return <RowActions actions={actions} maxVisible={3} />;
        },
      },
    ],
    [navigate],
  );

  return (
    <PageContainer>
      <PageHeader
        title="Customers"
        description="Browse and manage customer accounts for AVIKANS SOLUTION."
        breadcrumbs={[{ label: "Customers" }]}
        actions={
          <Button
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.customers.new)}
          >
            New Customer
          </Button>
        }
      />

      <div className="space-y-4">
        <FilterPanel
          variant="toolbar"
          onApply={() =>
            setApplied({ search, type: typeFilter, status: statusFilter })
          }
          onReset={() => {
            setSearch("");
            setTypeFilter("");
            setStatusFilter("");
            setApplied({ search: "", type: "", status: "" });
          }}
        >
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SearchBar
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search customers..."
            />
            <Select
              label="Type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as CustomerTypeValue | "")}
              options={[{ value: "", label: "All types" }, ...CUSTOMER_TYPE_OPTIONS]}
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EntityStatus | "")}
              options={[
                { value: "", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
          </div>
        </FilterPanel>

        <PageContent
          isLoading={isLoading}
          error={error ? "Failed to load customers." : null}
          onRetry={() => void refetch()}
          isEmpty={!isLoading && !error && (data?.items.length ?? 0) === 0}
          emptyTitle="No customers found"
          emptyDescription="Create your first customer to get started."
          emptyAction={
            <Button onClick={() => navigate(ROUTES.customers.new)}>New Customer</Button>
          }
          loadingVariant="table"
        >
          <DataTable
            data={data?.items ?? []}
            columns={columns}
            getRowId={(row) => row.id}
            pageSize={15}
            forceTable
            density="compact"
          />
        </PageContent>
      </div>

      <ConfirmationDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && void handleToggleStatus(deactivateTarget)}
        title={
          deactivateTarget?.status === "active"
            ? "Deactivate Customer?"
            : "Activate Customer?"
        }
        description={
          deactivateTarget?.status === "active"
            ? `This will soft-delete ${deactivateTarget?.name}. The record remains in the system but is marked inactive.`
            : `Reactivate ${deactivateTarget?.name}?`
        }
        confirmLabel={deactivateTarget?.status === "active" ? "Deactivate" : "Activate"}
        variant={deactivateTarget?.status === "active" ? "danger" : "default"}
        loading={updateCustomer.isPending || deleteCustomer.isPending}
      />
    </PageContainer>
  );
}
