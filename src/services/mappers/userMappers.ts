import type {
  Role,
  RoleGroup,
  User,
} from "@/types/user";

export function mapUser(raw: Record<string, unknown>): User {
  return {
    id: String(raw.id),
    email: String(raw.email),
    firstName: String(raw.firstName),
    lastName: String(raw.lastName),
    displayName: String(raw.displayName ?? `${raw.firstName} ${raw.lastName}`),
    phone: raw.phone as string | undefined,
    avatarUrl: raw.avatarUrl as string | undefined,
    roleId: String(raw.roleId),
    roleName: String(raw.roleName ?? ""),
    roleGroupIds: ((raw.roleGroupIds as string[]) ?? []).map(String),
    roleGroupNames: ((raw.roleGroupNames as string[]) ?? []).map(String),
    department: raw.department as string | undefined,
    jobTitle: raw.jobTitle as string | undefined,
    status: (raw.status as User["status"]) ?? "active",
    lastLoginAt: raw.lastLoginAt as string | undefined,
    createdAt: String(raw.createdAt ?? raw.createdOnUtc ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? raw.modifiedOnUtc ?? new Date().toISOString()),
  };
}

export function mapRole(raw: Record<string, unknown>): Role {
  return {
    id: String(raw.id),
    name: String(raw.name),
    description: raw.description as string | undefined,
    permissions: (raw.permissions as Role["permissions"]) ?? [],
    isSystem: Boolean(raw.isSystem),
    userCount: Number(raw.userCount ?? 0),
    status: (raw.status as Role["status"]) ?? "active",
    createdAt: String(raw.createdAt ?? raw.createdOnUtc ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? raw.modifiedOnUtc ?? new Date().toISOString()),
  };
}

export function mapRoleGroup(raw: Record<string, unknown>): RoleGroup {
  return {
    id: String(raw.id),
    name: String(raw.name),
    description: raw.description as string | undefined,
    roleIds: ((raw.roleIds as string[]) ?? []).map(String),
    roleNames: ((raw.roleNames as string[]) ?? []).map(String),
    userCount: Number(raw.userCount ?? 0),
    status: (raw.status as RoleGroup["status"]) ?? "active",
    createdAt: String(raw.createdAt ?? raw.createdOnUtc ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? raw.modifiedOnUtc ?? new Date().toISOString()),
  };
}
