import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type {
  RoleListFilters,
  RoleService,
  UserListFilters,
  UserService,
} from "@/services/interfaces/userService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import {
  initialRoleGroups,
  initialRoles,
  initialUsers,
} from "@/services/mock/data/users";
import type { PermissionAssignment, Role, RoleGroup, User } from "@/types/user";
import { resolveEffectivePermissions } from "@/lib/effectivePermissions";

let users = cloneData(initialUsers);
let roles = cloneData(initialRoles);
let roleGroups = cloneData(initialRoleGroups);

function resolveRoleNames(roleIds: string[]): string[] {
  return roleIds
    .map((id) => roles.find((r) => r.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

function resolveRoleGroupNames(groupIds: string[]): string[] {
  return groupIds
    .map((id) => roleGroups.find((g) => g.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

function syncAssignmentCounts() {
  roles = roles.map((role) => ({
    ...role,
    userCount: users.filter((user) => user.status === "active" && user.roleId === role.id)
      .length,
  }));
  roleGroups = roleGroups.map((group) => ({
    ...group,
    userCount: users.filter(
      (user) => user.status === "active" && user.roleGroupIds.includes(group.id),
    ).length,
  }));
}

export function findActiveUserByEmail(email: string): User | undefined {
  const normalized = email.trim().toLowerCase();
  return users.find(
    (user) => user.email.toLowerCase() === normalized && user.status === "active",
  );
}

export function getRoleCatalog() {
  return { roles, roleGroups };
}

export function recordUserLogin(userId: string): User | undefined {
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return undefined;
  users[index] = {
    ...users[index],
    lastLoginAt: nowIso(),
    updatedAt: nowIso(),
  };
  return users[index];
}

export const mockUserService: UserService = {
  async list(filters: UserListFilters) {
    await delay();
    return applyListQuery(
      users,
      filters,
      ["displayName", "email", "firstName", "lastName", "department", "jobTitle"],
      (item) => {
        if (filters.roleId && item.roleId !== filters.roleId) return false;
        if (filters.roleGroupId && !item.roleGroupIds.includes(filters.roleGroupId)) {
          return false;
        }
        if (filters.status && item.status !== filters.status) return false;
        if (filters.department && item.department !== filters.department) return false;
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    const user = users.find((u) => u.id === id);
    if (!user) notFoundError("User", id);
    return user;
  },

  async create(data) {
    await delay();
    const role = roles.find((r) => r.id === data.roleId);
    if (!role) notFoundError("Role", data.roleId);

    const timestamp = nowIso();
    const user: User = {
      id: generateId("usr"),
      ...data,
      displayName: `${data.firstName} ${data.lastName}`,
      roleName: role.name,
      roleGroupNames: resolveRoleGroupNames(data.roleGroupIds),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    users.push(user);
    syncAssignmentCounts();
    return user;
  },

  async update(id, data) {
    await delay();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) notFoundError("User", id);

    const role = data.roleId ? roles.find((r) => r.id === data.roleId) : undefined;
    const existing = users[index];

    users[index] = {
      ...existing,
      ...data,
      displayName:
        data.firstName || data.lastName
          ? `${data.firstName ?? existing.firstName} ${data.lastName ?? existing.lastName}`
          : existing.displayName,
      roleName: role?.name ?? existing.roleName,
      roleGroupNames: data.roleGroupIds
        ? resolveRoleGroupNames(data.roleGroupIds)
        : existing.roleGroupNames,
      updatedAt: nowIso(),
    };
    syncAssignmentCounts();
    return users[index];
  },

  async delete(id) {
    await delay();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) notFoundError("User", id);
    users[index] = { ...users[index], status: "inactive", updatedAt: nowIso() };
    syncAssignmentCounts();
  },

  async getPermissionAssignment(userId) {
    await delay();
    const user = users.find((u) => u.id === userId);
    if (!user) notFoundError("User", userId);
    const role = roles.find((r) => r.id === user.roleId);
    if (!role) notFoundError("Role", user.roleId);

    const assignment: PermissionAssignment = {
      userId: user.id,
      roleId: role.id,
      additionalPermissions: [],
      revokedPermissions: [],
      effectivePermissions: resolveEffectivePermissions(user, roles, roleGroups),
    };
    return assignment;
  },
};

export const mockRoleService: RoleService = {
  async listRoles(filters: RoleListFilters) {
    await delay();
    return applyListQuery(
      roles,
      filters,
      ["name", "description"],
      (item) => !filters.status || item.status === filters.status,
    );
  },

  async getRoleById(id) {
    await delay();
    const role = roles.find((r) => r.id === id);
    if (!role) notFoundError("Role", id);
    return role;
  },

  async createRole(data) {
    await delay();
    const timestamp = nowIso();
    const role: Role = {
      id: generateId("rol"),
      ...data,
      isSystem: false,
      userCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    roles.push(role);
    return role;
  },

  async updateRole(id, data) {
    await delay();
    const index = roles.findIndex((r) => r.id === id);
    if (index === -1) notFoundError("Role", id);
    if (roles[index].isSystem && data.permissions) {
      throw { code: "FORBIDDEN", message: "System roles cannot have permissions modified." };
    }
    roles[index] = { ...roles[index], ...data, updatedAt: nowIso() };
    return roles[index];
  },

  async deleteRole(id) {
    await delay();
    const index = roles.findIndex((r) => r.id === id);
    if (index === -1) notFoundError("Role", id);
    if (roles[index].isSystem) {
      throw { code: "FORBIDDEN", message: "System roles cannot be deleted." };
    }
    roles[index] = { ...roles[index], status: "inactive", updatedAt: nowIso() };
  },

  async listRoleGroups(filters: RoleListFilters) {
    await delay();
    return applyListQuery(
      roleGroups,
      filters,
      ["name", "description"],
      (item) => !filters.status || item.status === filters.status,
    );
  },

  async getRoleGroupById(id) {
    await delay();
    const group = roleGroups.find((g) => g.id === id);
    if (!group) notFoundError("RoleGroup", id);
    return group;
  },

  async createRoleGroup(data) {
    await delay();
    const timestamp = nowIso();
    const group: RoleGroup = {
      id: generateId("rg"),
      ...data,
      roleNames: resolveRoleNames(data.roleIds),
      userCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    roleGroups.push(group);
    return group;
  },

  async updateRoleGroup(id, data) {
    await delay();
    const index = roleGroups.findIndex((g) => g.id === id);
    if (index === -1) notFoundError("RoleGroup", id);

    const roleIds = data.roleIds ?? roleGroups[index].roleIds;
    roleGroups[index] = {
      ...roleGroups[index],
      ...data,
      roleIds,
      roleNames: resolveRoleNames(roleIds),
      updatedAt: nowIso(),
    };
    return roleGroups[index];
  },

  async deleteRoleGroup(id) {
    await delay();
    const index = roleGroups.findIndex((g) => g.id === id);
    if (index === -1) notFoundError("RoleGroup", id);
    roleGroups[index] = {
      ...roleGroups[index],
      status: "inactive",
      updatedAt: nowIso(),
    };
  },
};
