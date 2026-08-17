import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
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
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Textarea } from "@/components/ui/Textarea";
import {
  useCreateRole,
  useRoles,
  useUpdateRole,
} from "@/features/admin/hooks/useUsers";
import { roleService } from "@/services";
import type { Role } from "@/types/user";
import type { EntityStatus } from "@/types/common";

const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: "Dashboard",
  products: "Products",
  categories: "Categories",
  inventory: "Inventory",
  customers: "Customers",
  quotations: "Quotations",
  sales_orders: "Sales Orders",
  finance: "Finance",
  manufacturing: "Manufacturing",
  delivery: "Delivery",
  users: "Users",
  roles: "Roles",
  settings: "Settings",
  audit_logs: "Audit Logs",
};

export function RolesPage() {
  const { data, isLoading, error, refetch } = useRoles({ page: 1, pageSize: 50 });
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
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const toggleModule = (module: PermissionModule) => {
    const modulePerms = PERMISSIONS_BY_MODULE[module];
    const allSelected = modulePerms.every((p) => permissions.includes(p));
    if (allSelected) {
      setPermissions((prev) => prev.filter((p) => !modulePerms.includes(p)));
    } else {
      setPermissions((prev) => [...new Set([...prev, ...modulePerms])]);
    }
  };

  const handleSave = async () => {
    if (!name) {
      toast.error("Role name is required");
      return;
    }
    try {
      if (editingRole) {
        await updateRole.mutateAsync({
          id: editingRole.id,
          data: { name, description, permissions, status },
        });
        toast.success("Role updated");
      } else {
        await createRole.mutateAsync({ name, description, permissions, status });
        toast.success("Role created");
      }
      setDrawerOpen(false);
      void refetch();
    } catch {
      toast.error("Failed to save role");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await roleService.deleteRole(deleteTarget.id);
      toast.success(`Role ${deleteTarget.name} deactivated`);
      setDeleteTarget(null);
      void refetch();
    } catch {
      toast.error("Failed to deactivate role");
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
        cell: ({ row }) => row.original.description ?? "-",
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
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex gap-1">
            <IconButton
              variant="ghost"
              size="sm"
              icon={<Edit className="h-4 w-4" />}
              aria-label="Edit role"
              onClick={() => openEdit(row.original)}
            />
            {!row.original.isSystem && (
              <IconButton
                variant="ghost"
                size="sm"
                icon={<Trash2 className="h-4 w-4 text-destructive" />}
                aria-label="Delete role"
                onClick={() => setDeleteTarget(row.original)}
              />
            )}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Roles"
        description="Configure roles and permission assignments."
        breadcrumbs={[{ label: "Administration" }, { label: "Roles" }]}
        actions={
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Create Role
          </Button>
        }
      />

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load roles" : null}
        onRetry={() => void refetch()}
        loadingVariant="table"
      >
        <DataTable data={data?.items ?? []} columns={columns} getRowId={(row) => row.id} />
      </PageContent>

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
          <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <div>
            <p className="mb-3 text-sm font-semibold">Permission Matrix</p>
            <div className="space-y-4">
              {(Object.values(PERMISSION_MODULES) as PermissionModule[]).map((module) => (
                <div key={module} className="rounded-lg border border-border p-3">
                  <Checkbox
                    checked={PERMISSIONS_BY_MODULE[module].every((p) =>
                      permissions.includes(p),
                    )}
                    indeterminate={
                      PERMISSIONS_BY_MODULE[module].some((p) => permissions.includes(p)) &&
                      !PERMISSIONS_BY_MODULE[module].every((p) => permissions.includes(p))
                    }
                    onChange={() => toggleModule(module)}
                    label={MODULE_LABELS[module]}
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2 pl-6 sm:grid-cols-3">
                    {PERMISSIONS_BY_MODULE[module].map((perm) => (
                      <Checkbox
                        key={perm}
                        checked={permissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        label={perm.split(":")[1]}
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
        description={`Deactivate role "${deleteTarget?.name}"?`}
        confirmLabel="Deactivate"
        variant="danger"
        loading={deleting}
      />
    </PageContainer>
  );
}
