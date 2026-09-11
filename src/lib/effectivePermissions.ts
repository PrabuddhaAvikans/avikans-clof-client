import type { Permission } from "@/app/config/permissions";
import type { Role, RoleGroup, User } from "@/types/user";

export function resolveEffectivePermissions(
  user: Pick<User, "roleId" | "roleGroupIds">,
  roles: Role[],
  roleGroups: RoleGroup[],
): Permission[] {
  const permissions = new Set<Permission>();
  const primaryRole = roles.find((role) => role.id === user.roleId);
  primaryRole?.permissions.forEach((permission) => permissions.add(permission));

  for (const groupId of user.roleGroupIds) {
    const group = roleGroups.find((item) => item.id === groupId);
    if (!group || group.status !== "active") continue;

    for (const roleId of group.roleIds) {
      const role = roles.find((item) => item.id === roleId);
      if (!role || role.status !== "active") continue;
      role.permissions.forEach((permission) => permissions.add(permission));
    }
  }

  return [...permissions].sort();
}
