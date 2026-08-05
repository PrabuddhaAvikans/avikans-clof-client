import { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Mail, Save } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import type { Permission } from "@/app/config/permissions";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { FormikForm, DynamicForm } from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createUserFormSections } from "@/features/admin/forms/userFormFields";
import { userFormSchema, type UserFormValues } from "@/features/admin/schemas/userSchema";
import {
  useCreateUser,
  useRoleGroups,
  useRoles,
  useUpdateUser,
  useUser,
  useUserPermissions,
} from "@/features/admin/hooks/useUsers";
import type { UserFormData } from "@/services";

const defaultValues: UserFormValues = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  roleId: "",
  roleGroupIds: [],
  department: "",
  jobTitle: "",
  status: "active",
};

function RoleGroupsSection({
  roleGroupIds,
  onToggle,
}: {
  roleGroupIds: string[];
  onToggle: (groupId: string) => void;
}) {
  const { data: roleGroups } = useRoleGroups({ page: 1, pageSize: 50 });

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-semibold">Role Groups</h2>
      <div className="space-y-2">
        {(roleGroups?.items ?? []).map((group) => (
          <Checkbox
            key={group.id}
            checked={roleGroupIds.includes(group.id)}
            onChange={() => onToggle(group.id)}
            label={`${group.name} (${group.roleNames.join(", ")})`}
          />
        ))}
      </div>
    </div>
  );
}

function PermissionsPreview({
  roleId,
  roleGroupIds,
}: {
  roleId: string;
  roleGroupIds: string[];
}) {
  const { id } = useParams<{ id: string }>();
  const { data: roles } = useRoles({ page: 1, pageSize: 50 });
  const { data: roleGroups } = useRoleGroups({ page: 1, pageSize: 50 });
  const { data: permissions } = useUserPermissions(id ?? "");

  const selectedRole = roles?.items.find((r) => r.id === roleId);
  const selectedGroups = (roleGroups?.items ?? []).filter((g) => roleGroupIds.includes(g.id));

  const groupRolePermissions = useMemo(() => {
    const perms = new Set<Permission>();
    for (const group of selectedGroups) {
      for (const groupRoleId of group.roleIds) {
        const role = roles?.items.find((r) => r.id === groupRoleId);
        role?.permissions.forEach((p) => perms.add(p));
      }
    }
    return [...perms];
  }, [selectedGroups, roles?.items]);

  const effectivePermissions = useMemo(() => {
    const set = new Set<Permission>([
      ...(selectedRole?.permissions ?? []),
      ...groupRolePermissions,
    ]);
    return [...set].sort();
  }, [selectedRole, groupRolePermissions]);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-semibold">Effective Permissions Preview</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Combined from primary role and role groups.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {effectivePermissions.map((perm) => (
          <StatusBadge key={perm} variant="neutral" size="sm">
            {perm}
          </StatusBadge>
        ))}
        {effectivePermissions.length === 0 && (
          <p className="text-sm text-muted-foreground">Select a role to preview permissions</p>
        )}
      </div>
      {permissions && (
        <p className="mt-3 text-xs text-muted-foreground">
          Server effective count: {permissions.effectivePermissions.length}
        </p>
      )}
    </div>
  );
}

function UserFormActions({
  isEdit,
  roleGroupIds,
  onToggleGroup,
}: {
  isEdit: boolean;
  roleGroupIds: string[];
  onToggleGroup: (groupId: string) => void;
}) {
  const { values, validateForm, isSubmitting, setFieldValue } = useFormikContext<UserFormValues>();
  const { data: roles } = useRoles({ page: 1, pageSize: 50 });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const sections = useMemo(
    () =>
      createUserFormSections({
        roleOptions: (roles?.items ?? []).map((r) => ({ value: r.id, label: r.name })),
      }),
    [roles?.items],
  );

  const toFormData = (): UserFormData => ({
    email: values.email,
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone || undefined,
    roleId: values.roleId,
    roleGroupIds,
    department: values.department || undefined,
    jobTitle: values.jobTitle || undefined,
    status: values.status,
  });

  const handleSave = async (sendInvite = false) => {
    const validationErrors = await validateForm();
    if (Object.keys(validationErrors).length > 0) return;

    try {
      if (isEdit && id) {
        await updateUser.mutateAsync({ id, data: toFormData() });
        toast.success("User updated");
      } else {
        await createUser.mutateAsync(toFormData());
        toast.success(sendInvite ? "User created and invitation sent" : "User created");
      }
      navigate(ROUTES.admin.users);
    } catch {
      toast.error("Failed to save user");
    }
  };

  useEffect(() => {
    void setFieldValue("roleGroupIds", roleGroupIds, false);
  }, [roleGroupIds, setFieldValue]);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <DynamicForm sections={sections} columns={1} />
      </div>
      <div className="space-y-6 lg:col-span-2">
        <RoleGroupsSection roleGroupIds={roleGroupIds} onToggle={onToggleGroup} />
        <PermissionsPreview roleId={values.roleId} roleGroupIds={roleGroupIds} />
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="primary"
            leftIcon={<Save className="h-4 w-4" />}
            loading={isSubmitting || createUser.isPending || updateUser.isPending}
            onClick={() => void handleSave(false)}
          >
            Save
          </Button>
          {!isEdit && (
            <Button
              type="button"
              variant="outline"
              leftIcon={<Mail className="h-4 w-4" />}
              loading={createUser.isPending}
              onClick={() => void handleSave(true)}
            >
              Save and Send Invitation
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { data: user, isLoading } = useUser(id ?? "");
  const [roleGroupIds, setRoleGroupIds] = useState<string[]>([]);

  const initialValues = useMemo<UserFormValues>(() => {
    if (!user) return defaultValues;
    return {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone ?? "",
      roleId: user.roleId,
      roleGroupIds: user.roleGroupIds,
      department: user.department ?? "",
      jobTitle: user.jobTitle ?? "",
      status: user.status,
    };
  }, [user]);

  useEffect(() => {
    if (user) setRoleGroupIds(user.roleGroupIds);
  }, [user]);

  const toggleGroup = (groupId: string) => {
    setRoleGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId],
    );
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title={isEdit ? "Edit User" : "Add User"}
        description="Configure user profile, roles, and permissions."
        breadcrumbs={[
          { label: "Administration", href: ROUTES.admin.users },
          { label: "Users", href: ROUTES.admin.users },
          { label: isEdit ? "Edit" : "Add" },
        ]}
        actions={
          <Link to={ROUTES.admin.users}>
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
        }
      />

      <PageContent isLoading={isEdit && isLoading}>
        <FormikForm<UserFormValues>
          initialValues={initialValues}
          validationSchema={userFormSchema}
          onSubmit={() => undefined}
          enableReinitialize
        >
          <UserFormActions isEdit={isEdit} roleGroupIds={roleGroupIds} onToggleGroup={toggleGroup} />
        </FormikForm>
      </PageContent>
    </PageContainer>
  );
}
