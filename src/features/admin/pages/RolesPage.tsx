import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import {
  PERMISSION_MODULES,
  PERMISSIONS_BY_MODULE,
  type Permission,
  type PermissionModule,
} from "@/app/config/permissions";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Drawer } from "@/components/ui/Drawer";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { SearchBar } from "@/components/ui/SearchBar";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import { EntityStatusBadge } from "@/features/shared/components/EntityStatusBadge";
import { PERMISSION_MODULE_LABELS } from "@/features/admin/lib/permissionLabels";
import { useRefreshSessionPermissions } from "@/features/admin/hooks/useRefreshSessionPermissions";
import {
  useCreateRole,
  useRoles,
  useUpdateRole,
} from "@/features/admin/hooks/useUsers";
import { usePermissions } from "@/hooks/usePermissions";
import { roleService } from "@/services";
import type { Role } from "@/types/user";
import type { EntityStatus } from "@/types/common";

export function RolesPage() {
  const { hasPermission } = usePermissions();
  const refreshSession = useRefreshSessionPermissions();
  const canCreate = hasPermission("roles:create");
  const canEdit = hasPermission("roles:edit");
  const canDelete = hasPermission("roles:delete");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [applied, setApplied] = useState({ search: "", status: "" });

  const { data, isLoading, error, refetch } = useRoles({
    page: 1,
    pageSize: 50,
    status: (applied.status as EntityStatus) || undefined,
  });
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [status, setStatus] = useState<EntityStatus>("active");
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredRoles = useMemo(() => {
    const query = applied.search.trim().toLowerCase();
    return (data?.items ?? []).filter((role) => {
      if (!query) return true;
      return (
        role.name.toLowerCase().includes(query) ||
        (role.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [applied.search, data?.items]);

  const isSystemEdit = Boolean(editingRole?.isSystem);

  const openCreate = () => {
    setEditingRole(null);
    setName("");
    setDescription("");
    setPermissions([]);
    setStatus("active");
    setDrawerOpen(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setName(role.name);
    setDescription(role.description ?? "");
    setPermissions([...role.permissions]);
    setStatus(role.status);
    setDrawerOpen(true);
  };

  const togglePermission = (perm: Permission) => {
    if (isSystemEdit) return;
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((item) => item !== perm) : [...prev, perm],
    );
  };

  const toggleModule = (module: PermissionModule) => {
    if (isSystemEdit) return;
    const modulePerms = PERMISSIONS_BY_MODULE[module];
    const allSelected = modulePerms.every((perm) => permissions.includes(perm));
    if (allSelected) {
      setPermissions((prev) => prev.filter((perm) => !modulePerms.includes(perm)));
    } else {
      setPermissions((prev) => [...new Set([...prev, ...modulePerms])]);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Role name is required");
      return;
    }
    try {
      if (editingRole) {
        await updateRole.mutateAsync({
          id: editingRole.id,
          data: isSystemEdit
            ? { description, status }
            : { name: name.trim(), description, permissions, status },
        });
        toast.success("Role updated");
      } else {
        await createRole.mutateAsync({
          name: name.trim(),
          description,
          permissions,
          status,
        });
        toast.success("Role created");
      }
      setDrawerOpen(false);
      await refreshSession();
      void refetch();
    } catch (error) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to save role";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await roleService.deleteRole(deleteTarget.id);
      toast.success(`Role ${deleteTarget.name} deactivated`);
      setDeleteTarget(null);
      await refreshSession();
      void refetch();
    } catch (error) {
      const message =
        typeof error === "object" && error && "message" in error
          ? String((error as { message: string }).message)
          : "Failed to deactivate role";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<Role>[]>(
    () => [
      { id: "name", accessorKey: "name", header: "Role" },
      {
        id: "description",
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => row.original.description || "-",
      },
      {
        id: "permissions",
        header: "Permissions",
        cell: ({ row }) => row.original.permissions.length,
      },
      { id: "users", accessorKey: "userCount", header: "Users" },
      {
        id: "type",
        header: "Type",
        cell: ({ row }) => (
          <StatusBadge variant={row.original.isSystem ? "info" : "neutral"} size="sm">
            {row.original.isSystem ? "System" : "Custom"}
          </StatusBadge>
        ),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <EntityStatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            {canEdit && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Edit className="h-4 w-4" />}
                aria-label="Edit role"
                onClick={() => openEdit(row.original)}
              />
            )}
            {canDelete && !row.original.isSystem && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Trash2 className="h-4 w-4 text-destructive" />}
                aria-label="Deactivate role"
                onClick={() => setDeleteTarget(row.original)}
              />
            )}
          </div>
        ),
      },
    ],
    [canDelete, canEdit],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Roles"
        description="Configure roles and the permissions each role grants."
        breadcrumbs={[{ label: "Administration" }, { label: "Roles" }]}
        actions={
          canCreate ? (
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Create Role
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <FilterPanel
          variant="toolbar"
          onApply={() => setApplied({ search, status: statusFilter })}
          onReset={() => {
            setSearch("");
            setStatusFilter("");
            setApplied({ search: "", status: "" });
          }}
        >
          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
            <SearchBar
              label="Search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onClear={() => setSearch("")}
              placeholder="Search roles..."
            />
            <Select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
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
          error={error ? "Failed to load roles" : null}
          onRetry={() => void refetch()}
          isEmpty={!isLoading && !error && filteredRoles.length === 0}
          emptyTitle="No roles found"
          emptyDescription="Create a role or adjust filters to see results."
          loadingVariant="table"
        >
          <DataTable
            data={filteredRoles}
            columns={columns}
            getRowId={(row) => row.id}
            pageSize={15}
            forceTable
            density="compact"
          />
        </PageContent>
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingRole ? "Edit Role" : "Create Role"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createRole.isPending || updateRole.isPending}
              onClick={() => void handleSave()}
            >
              Save Role
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSystemEdit}
          />
          <Textarea
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={2}
          />
          <Select
            label="Status"
            value={status}
            onChange={(event) => setStatus(event.target.value as EntityStatus)}
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
            disabled={isSystemEdit}
          />
          <div>
            <p className="mb-1 text-sm font-semibold">Permission Matrix</p>
            {isSystemEdit ? (
              <p className="mb-3 text-xs text-muted-foreground">
                System roles have a fixed permission set and cannot be changed.
              </p>
            ) : (
              <p className="mb-3 text-xs text-muted-foreground">
                Select the modules and actions this role can access.
              </p>
            )}
            <div className="space-y-4">
              {(Object.values(PERMISSION_MODULES) as PermissionModule[]).map((module) => (
                <div key={module} className="rounded-lg border border-border p-3">
                  <Checkbox
                    checked={PERMISSIONS_BY_MODULE[module].every((perm) =>
                      permissions.includes(perm),
                    )}
                    indeterminate={
                      PERMISSIONS_BY_MODULE[module].some((perm) =>
                        permissions.includes(perm),
                      ) &&
                      !PERMISSIONS_BY_MODULE[module].every((perm) =>
                        permissions.includes(perm),
                      )
                    }
                    onChange={() => toggleModule(module)}
                    label={PERMISSION_MODULE_LABELS[module]}
                    disabled={isSystemEdit}
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2 pl-6 sm:grid-cols-3">
                    {PERMISSIONS_BY_MODULE[module].map((perm) => (
                      <Checkbox
                        key={perm}
                        checked={permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        label={perm.split(":")[1]}
                        disabled={isSystemEdit}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Deactivate Role"
        description={`Deactivate role "${deleteTarget?.name}"? Users keep the assignment, but the role can no longer be selected for new users.`}
        confirmLabel="Deactivate"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  );
}
