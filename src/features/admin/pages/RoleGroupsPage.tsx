import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { useRefreshSessionPermissions } from "@/features/admin/hooks/useRefreshSessionPermissions";
import {
  useCreateRoleGroup,
  useRoleGroups,
  useRoles,
  useUpdateRoleGroup,
} from "@/features/admin/hooks/useUsers";
import { usePermissions } from "@/hooks/usePermissions";
import { roleService } from "@/services";
import type { RoleGroup } from "@/types/user";
import type { EntityStatus } from "@/types/common";

export function RoleGroupsPage() {
  const { hasPermission } = usePermissions();
  const refreshSession = useRefreshSessionPermissions();
  const canCreate = hasPermission("roles:create");
  const canEdit = hasPermission("roles:edit");
  const canDelete = hasPermission("roles:delete");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [applied, setApplied] = useState({ search: "", status: "" });

  const { data, isLoading, error, refetch } = useRoleGroups({
    page: 1,
    pageSize: 50,
    status: (applied.status as EntityStatus) || undefined,
  });
  const { data: roles } = useRoles({ page: 1, pageSize: 50 });
  const createGroup = useCreateRoleGroup();
  const updateGroup = useUpdateRoleGroup();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<RoleGroup | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const [status, setStatus] = useState<EntityStatus>("active");
  const [deleteTarget, setDeleteTarget] = useState<RoleGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredGroups = useMemo(() => {
    const query = applied.search.trim().toLowerCase();
    return (data?.items ?? []).filter((group) => {
      if (!query) return true;
      return (
        group.name.toLowerCase().includes(query) ||
        (group.description ?? "").toLowerCase().includes(query) ||
        group.roleNames.some((roleName) => roleName.toLowerCase().includes(query))
      );
    });
  }, [applied.search, data?.items]);

  const selectableRoles = useMemo(
    () =>
      (roles?.items ?? []).filter(
        (role) => role.status === "active" || roleIds.includes(role.id),
      ),
    [roleIds, roles?.items],
  );

  const openCreate = () => {
    setEditingGroup(null);
    setName("");
    setDescription("");
    setRoleIds([]);
    setStatus("active");
    setDrawerOpen(true);
  };

  const openEdit = (group: RoleGroup) => {
    setEditingGroup(group);
    setName(group.name);
    setDescription(group.description ?? "");
    setRoleIds([...group.roleIds]);
    setStatus(group.status);
    setDrawerOpen(true);
  };

  const toggleRole = (id: string) => {
    setRoleIds((prev) =>
      prev.includes(id) ? prev.filter((roleId) => roleId !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!name.trim() || roleIds.length === 0) {
      toast.error("Name and at least one role are required");
      return;
    }
    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          id: editingGroup.id,
          data: { name: name.trim(), description, roleIds, status },
        });
        toast.success("Role group updated");
      } else {
        await createGroup.mutateAsync({
          name: name.trim(),
          description,
          roleIds,
          status,
        });
        toast.success("Role group created");
      }
      setDrawerOpen(false);
      await refreshSession();
      void refetch();
    } catch {
      toast.error("Failed to save role group");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await roleService.deleteRoleGroup(deleteTarget.id);
      toast.success(`Group ${deleteTarget.name} deactivated`);
      setDeleteTarget(null);
      await refreshSession();
      void refetch();
    } catch {
      toast.error("Failed to deactivate group");
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo<ColumnDef<RoleGroup>[]>(
    () => [
      { id: "name", accessorKey: "name", header: "Group" },
      {
        id: "roles",
        header: "Roles",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roleNames.map((roleName) => (
              <StatusBadge key={roleName} variant="neutral" size="sm">
                {roleName}
              </StatusBadge>
            ))}
          </div>
        ),
      },
      { id: "users", accessorKey: "userCount", header: "Users" },
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
                aria-label="Edit group"
                onClick={() => openEdit(row.original)}
              />
            )}
            {canDelete && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Trash2 className="h-4 w-4 text-destructive" />}
                aria-label="Deactivate group"
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
        title="Role Groups"
        description="Bundle roles for easier assignment, such as Sales Team or Production Floor."
        breadcrumbs={[{ label: "Administration" }, { label: "Role Groups" }]}
        actions={
          canCreate ? (
            <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
              Create Group
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
              placeholder="Search groups..."
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
          error={error ? "Failed to load role groups" : null}
          onRetry={() => void refetch()}
          isEmpty={!isLoading && !error && filteredGroups.length === 0}
          emptyTitle="No role groups found"
          emptyDescription="Create a group or adjust filters to see results."
          loadingVariant="table"
        >
          <DataTable
            data={filteredGroups}
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
        title={editingGroup ? "Edit Role Group" : "Create Role Group"}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={createGroup.isPending || updateGroup.isPending}
              onClick={() => void handleSave()}
            >
              Save Group
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
          />
          <div>
            <p className="mb-2 text-sm font-medium">Roles in Group</p>
            <div className="space-y-2">
              {selectableRoles.map((role) => (
                <Checkbox
                  key={role.id}
                  checked={roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  label={role.name}
                  disabled={role.status !== "active"}
                />
              ))}
              {selectableRoles.length === 0 && (
                <p className="text-sm text-muted-foreground">No active roles available.</p>
              )}
            </div>
          </div>
        </div>
      </Drawer>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Deactivate Role Group"
        description={`Deactivate "${deleteTarget?.name}"? It will no longer grant grouped permissions to assigned users.`}
        confirmLabel="Deactivate"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  );
}
