import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { IconButton } from "@/components/ui/IconButton";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useUsers, useRoles } from "@/features/admin/hooks/useUsers";
import { formatDateTime } from "@/lib/format";
import { userService } from "@/services";
import type { User } from "@/types/user";
import type { EntityStatus } from "@/types/common";

export function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState("");
  const [status, setStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, error, refetch } = useUsers({
    page: 1,
    pageSize: 100,
    search: search || undefined,
    roleId: roleId || undefined,
    status: (status as EntityStatus) || undefined,
  });
  const { data: roles } = useRoles({ page: 1, pageSize: 50 });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await userService.delete(deleteTarget.id);
      toast.success(`User ${deleteTarget.displayName} deactivated`);
      setDeleteTarget(null);
      void refetch();
    } catch {
      toast.error("Failed to deactivate user");
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.displayName}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      },
      { id: "role", accessorKey: "roleName", header: "Role" },
      {
        id: "groups",
        header: "Role Groups",
        cell: ({ row }) => row.original.roleGroupNames.join(", ") || "-",
      },
      { id: "department", accessorKey: "department", header: "Department" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            variant={row.original.status === "active" ? "success" : "neutral"}
            size="sm"
          >
            {row.original.status}
          </StatusBadge>
        ),
      },
      {
        id: "lastLogin",
        header: "Last Login",
        cell: ({ row }) =>
          row.original.lastLoginAt ? formatDateTime(row.original.lastLoginAt) : "Never",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Eye className="h-4 w-4" />}
              aria-label="Edit user"
              onClick={() => navigate(ROUTES.admin.userEdit(row.original.id))}
            />
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Trash2 className="h-4 w-4 text-destructive" />}
              aria-label="Deactivate user"
              onClick={() => setDeleteTarget(row.original)}
            />
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Users"
        description="Manage system users and access assignments."
        breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
        actions={
          <Link to={ROUTES.admin.usersNew}>
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>
              Add User
            </Button>
          </Link>
        }
      />

      <div className="mb-6">
        <FilterPanel
          onReset={() => {
            setSearch("");
            setRoleId("");
            setStatus("");
          }}
        >
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SearchBar
              label="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search users..."
            />
            <Select
              label="Role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              options={(roles?.items ?? []).map((r) => ({ value: r.id, label: r.name }))}
              placeholder="All roles"
            />
            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              placeholder="All statuses"
            />
          </div>
        </FilterPanel>
      </div>

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load users" : null}
        onRetry={() => void refetch()}
        loadingVariant="table"
      >
        <DataTable data={data?.items ?? []} columns={columns} getRowId={(row) => row.id} />
      </PageContent>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Deactivate User"
        description={`Deactivate ${deleteTarget?.displayName}? They will lose access to the system.`}
        confirmLabel="Deactivate"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  );
}
