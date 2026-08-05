import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { usersActions } from "@/features/admin/store/usersSlice";
import type {
  RoleFormData,
  RoleGroupFormData,
  RoleListFilters,
  UserFormData,
  UserListFilters,
} from "@/services";
import type { PaginatedResponse } from "@/types/common";
import type {
  PermissionAssignment,
  Role,
  RoleGroup,
  User,
} from "@/types/user";

export function useUsers(filters: UserListFilters) {
  return useEpicQuery<UserListFilters, PaginatedResponse<User>>({
    arg: filters,
    request: usersActions.fetchUsersRequest,
    selectEntry: (state, key) => state.users.users.lists[key],
  });
}

export function useUser(id: string) {
  return useEpicQuery<string, User>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: usersActions.fetchUserRequest,
    selectEntry: (state, key) => state.users.users.details[key],
  });
}

export function useUserPermissions(userId: string) {
  return useEpicQuery<string, PermissionAssignment>({
    arg: userId,
    enabled: Boolean(userId),
    getKey: (value) => value,
    request: usersActions.fetchUserPermissionsRequest,
    selectEntry: (state, key) => state.users.users.permissions[key],
  });
}

export function useCreateUser() {
  return useEpicMutation<UserFormData, User>({
    request: usersActions.createUserRequest,
    selectMutation: (state: RootState) => state.users.users.create,
  });
}

export function useUpdateUser() {
  return useEpicMutation<{ id: string; data: Partial<UserFormData> }, User>({
    request: usersActions.updateUserRequest,
    selectMutation: (state: RootState) => state.users.users.update,
  });
}

export function useRoles(filters: RoleListFilters) {
  return useEpicQuery<RoleListFilters, PaginatedResponse<Role>>({
    arg: filters,
    request: usersActions.fetchRolesRequest,
    selectEntry: (state, key) => state.users.roles.lists[key],
  });
}

export function useRole(id: string) {
  return useEpicQuery<string, Role>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: usersActions.fetchRoleRequest,
    selectEntry: (state, key) => state.users.roles.details[key],
  });
}

export function useCreateRole() {
  return useEpicMutation<RoleFormData, Role>({
    request: usersActions.createRoleRequest,
    selectMutation: (state: RootState) => state.users.roles.create,
  });
}

export function useUpdateRole() {
  return useEpicMutation<{ id: string; data: Partial<RoleFormData> }, Role>({
    request: usersActions.updateRoleRequest,
    selectMutation: (state: RootState) => state.users.roles.update,
  });
}

export function useRoleGroups(filters: RoleListFilters) {
  return useEpicQuery<RoleListFilters, PaginatedResponse<RoleGroup>>({
    arg: filters,
    request: usersActions.fetchRoleGroupsRequest,
    selectEntry: (state, key) => state.users.roleGroups.lists[key],
  });
}

export function useRoleGroup(id: string) {
  return useEpicQuery<string, RoleGroup>({
    arg: id,
    enabled: Boolean(id),
    getKey: (value) => value,
    request: usersActions.fetchRoleGroupRequest,
    selectEntry: (state, key) => state.users.roleGroups.details[key],
  });
}

export function useCreateRoleGroup() {
  return useEpicMutation<RoleGroupFormData, RoleGroup>({
    request: usersActions.createRoleGroupRequest,
    selectMutation: (state: RootState) => state.users.roleGroups.create,
  });
}

export function useUpdateRoleGroup() {
  return useEpicMutation<
    { id: string; data: Partial<RoleGroupFormData> },
    RoleGroup
  >({
    request: usersActions.updateRoleGroupRequest,
    selectMutation: (state: RootState) => state.users.roleGroups.update,
  });
}
