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
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import {
  useCreateRoleGroup,
  useRoleGroups,
  useRoles,
  useUpdateRoleGroup,
} from "@/features/admin/hooks/useUsers";
import { roleService } from "@/services";
import type { RoleGroup } from "@/types/user";
import type { EntityStatus } from "@/types/common";

export function RoleGroupsPage() {
  const { data, isLoading, error, refetch } = useRoleGroups({ page: 1, pageSize: 50 });
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
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!name || roleIds.length === 0) {
      toast.error("Name and at least one role are required");
      return;
    }
    try {
      if (editingGroup) {
        await updateGroup.mutateAsync({
          id: editingGroup.id,
          data: { name, description, roleIds, status },
        });
        toast.success("Role group updated");
      } else {
        await createGroup.mutateAsync({ name, description, roleIds, status });
        toast.success("Role group created");
      }
      setDrawerOpen(false);
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
            {row.original.roleNames.map((r) => (
              <StatusBadge key={r} variant="neutral" size="sm">
                {r}
              </StatusBadge>
            ))}
          </div>
        ),
      },
      { id: "users", accessorKey: "userCount", header: "Users" },
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
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Edit className="h-4 w-4" />}
              aria-label="Edit group"
              onClick={() => openEdit(row.original)}
            />
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Trash2 className="h-4 w-4 text-destructive" />}
              aria-label="Delete group"
              onClick={() => setDeleteTarget(row.original)}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Role Groups"
        description="Group roles for easier user assignment (e.g. System Admin, Sales Team)."
        breadcrumbs={[{ label: "Administration" }, { label: "Role Groups" }]}
        actions={
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Create Group
          </Button>
        }
      />

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load role groups" : null}
        onRetry={() => void refetch()}
        loadingVariant="table"
      >
        <DataTable data={data?.items ?? []} columns={columns} getRowId={(row) => row.id} />
      </PageContent>

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
          <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <div>
            <p className="mb-2 text-sm font-medium">Roles in Group</p>
            <div className="space-y-2">
              {(roles?.items ?? []).map((role) => (
                <Checkbox
                  key={role.id}
                  checked={roleIds.includes(role.id)}
                  onChange={() => toggleRole(role.id)}
                  label={role.name}
                />
              ))}
            </div>
          </div>
        </div>
      </Drawer>

      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Deactivate Role Group"
        description={`Deactivate "${deleteTarget?.name}"?`}
        confirmLabel="Deactivate"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  );
}
