import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { RowActions, type RowActionItem } from "@/components/ui/RowActions";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import { EntityStatusBadge } from "@/features/shared/components/EntityStatusBadge";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { useRefreshSessionPermissions } from "@/features/admin/hooks/useRefreshSessionPermissions";
import {
  useRoles,
  useUpdateUser,
  useUsers,
} from "@/features/admin/hooks/useUsers";
import { usePermissions } from "@/hooks/usePermissions";
import { formatDateTime } from "@/lib/format";
import type { User } from "@/types/user";
import type { EntityStatus } from "@/types/common";

export function UsersPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthSession();
  const { hasPermission } = usePermissions();
  const refreshSession = useRefreshSessionPermissions();
  const canCreate = hasPermission("users:create");
  const canEdit = hasPermission("users:edit");
  const canDelete = hasPermission("users:delete");

  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState("");
  const [status, setStatus] = useState("");
  const [applied, setApplied] = useState({ search: "", roleId: "", status: "" });
  const [statusTarget, setStatusTarget] = useState<User | null>(null);

  const { data, isLoading, error, refetch } = useUsers({
    page: 1,
    pageSize: 100,
    search: applied.search || undefined,
    roleId: applied.roleId || undefined,
    status: (applied.status as EntityStatus) || undefined,
  });
  const { data: roles } = useRoles({ page: 1, pageSize: 50 });
  const updateUser = useUpdateUser();

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    const nextStatus: EntityStatus =
      statusTarget.status === "active" ? "inactive" : "active";
    try {
      await updateUser.mutateAsync({
        id: statusTarget.id,
        data: { status: nextStatus },
      });
      toast.success(
        nextStatus === "active"
          ? `${statusTarget.displayName} reactivated`
          : `${statusTarget.displayName} deactivated`,
      );
      if (statusTarget.id === currentUser?.id && nextStatus === "inactive") {
        await refreshSession();
      }
      setStatusTarget(null);
      void refetch();
    } catch {
      toast.error("Failed to update user status");
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
        cell: ({ row }) => row.original.roleGroupNames.join(", ") || "—",
      },
      {
        id: "department",
        header: "Department",
        cell: ({ row }) => row.original.department || "—",
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatusBadge status={row.original.status} />,
      },
      {
        id: "lastLogin",
        header: "Last Login",
        cell: ({ row }) =>
          row.original.lastLoginAt ? formatDateTime(row.original.lastLoginAt) : "Never",
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const user = row.original;
          const isSelf = user.id === currentUser?.id;
          const actions: RowActionItem[] = [];

          if (canEdit) {
            actions.push({
              id: "edit",
              label: "Edit",
              icon: <Pencil className="h-4 w-4" />,
              primary: true,
              onClick: () => navigate(ROUTES.admin.userEdit(user.id)),
            });
          }

          if (canDelete) {
            actions.push({
              id: "toggle-status",
              label: user.status === "active" ? "Deactivate" : "Activate",
              icon:
                user.status === "active" ? (
                  <UserX className="h-4 w-4" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                ),
              danger: user.status === "active",
              disabled: isSelf && user.status === "active",
              onClick: () => setStatusTarget(user),
            });
          }

          return <RowActions actions={actions} maxVisible={2} />;
        },
      },
    ],
    [canDelete, canEdit, currentUser?.id, navigate],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Users"
        description="Manage system users, roles, and access assignments."
        breadcrumbs={[{ label: "Administration" }, { label: "Users" }]}
        actions={
          canCreate ? (
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.admin.usersNew)}
            >
              Add User
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <FilterPanel
          variant="toolbar"
          onApply={() => setApplied({ search, roleId, status })}
          onReset={() => {
            setSearch("");
            setRoleId("");
            setStatus("");
            setApplied({ search: "", roleId: "", status: "" });
          }}
        >
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <SearchBar
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search users..."
            />
            <Select
              label="Role"
              value={roleId}
              onChange={(event) => setRoleId(event.target.value)}
              options={[
                { value: "", label: "All roles" },
                ...(roles?.items ?? []).map((role) => ({
                  value: role.id,
                  label: role.name,
                })),
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
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
          error={error ? "Failed to load users" : null}
          onRetry={() => void refetch()}
          isEmpty={!isLoading && !error && (data?.items.length ?? 0) === 0}
          emptyTitle="No users found"
          emptyDescription="Create a user or adjust filters to see results."
          emptyAction={
            canCreate ? (
              <Button onClick={() => navigate(ROUTES.admin.usersNew)}>Add User</Button>
            ) : undefined
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
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => void handleToggleStatus()}
        title={
          statusTarget?.status === "active" ? "Deactivate User" : "Activate User"
        }
        description={
          statusTarget?.status === "active"
            ? `Deactivate ${statusTarget?.displayName}? They will lose access until reactivated.`
            : `Reactivate ${statusTarget?.displayName}? They will be able to sign in again.`
        }
        confirmLabel={statusTarget?.status === "active" ? "Deactivate" : "Activate"}
        variant={statusTarget?.status === "active" ? "danger" : "default"}
        loading={updateUser.isPending}
      />
    </PageContainer>
  );
}
