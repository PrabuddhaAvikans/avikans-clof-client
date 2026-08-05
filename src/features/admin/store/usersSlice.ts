import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import {
  createMutationEntry,
  emptyCache,
  invalidateEntries,
  setEntryFailure,
  setEntryLoading,
  setEntrySuccess,
  setMutationFailure,
  setMutationLoading,
  setMutationSuccess,
} from "@/app/store/async/reducers";
import type { AsyncEntry, MutationEntry } from "@/app/store/async/types";
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

type UserListData = PaginatedResponse<User>;
type RoleListData = PaginatedResponse<Role>;
type RoleGroupListData = PaginatedResponse<RoleGroup>;

type UpdateUserArg = { id: string; data: Partial<UserFormData> };
type UpdateRoleArg = { id: string; data: Partial<RoleFormData> };
type UpdateRoleGroupArg = { id: string; data: Partial<RoleGroupFormData> };

type EntityCache<TList, TDetail> = {
  lists: Record<string, AsyncEntry<TList>>;
  details: Record<string, AsyncEntry<TDetail>>;
  create: MutationEntry;
  update: MutationEntry;
};

export type UsersState = {
  users: EntityCache<UserListData, User> & {
    permissions: Record<string, AsyncEntry<PermissionAssignment>>;
  };
  roles: EntityCache<RoleListData, Role>;
  roleGroups: EntityCache<RoleGroupListData, RoleGroup>;
};

const initialState: UsersState = {
  users: {
    lists: emptyCache(),
    details: emptyCache(),
    permissions: emptyCache(),
    create: createMutationEntry(),
    update: createMutationEntry(),
  },
  roles: {
    lists: emptyCache(),
    details: emptyCache(),
    create: createMutationEntry(),
    update: createMutationEntry(),
  },
  roleGroups: {
    lists: emptyCache(),
    details: emptyCache(),
    create: createMutationEntry(),
    update: createMutationEntry(),
  },
};

function upsertUser(state: UsersState, user: User): void {
  state.users.details[user.id] = {
    data: user,
    status: "succeeded",
    error: null,
  };
}

function upsertRole(state: UsersState, role: Role): void {
  state.roles.details[role.id] = {
    data: role,
    status: "succeeded",
    error: null,
  };
}

function upsertRoleGroup(state: UsersState, group: RoleGroup): void {
  state.roleGroups.details[group.id] = {
    data: group,
    status: "succeeded",
    error: null,
  };
}

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    fetchUsersRequest(state, action: PayloadAction<RequestPayload<UserListFilters>>) {
      if (action.payload.key) setEntryLoading(state.users.lists, action.payload.key);
    },
    fetchUsersSuccess(state, action: PayloadAction<SuccessPayload<UserListData>>) {
      setEntrySuccess(state.users.lists, action);
    },
    fetchUsersFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.users.lists, action);
    },

    fetchUserRequest(state, action: PayloadAction<RequestPayload<string>>) {
      if (action.payload.key) setEntryLoading(state.users.details, action.payload.key);
    },
    fetchUserSuccess(state, action: PayloadAction<SuccessPayload<User>>) {
      setEntrySuccess(state.users.details, action);
    },
    fetchUserFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.users.details, action);
    },

    fetchUserPermissionsRequest(state, action: PayloadAction<RequestPayload<string>>) {
      if (action.payload.key) setEntryLoading(state.users.permissions, action.payload.key);
    },
    fetchUserPermissionsSuccess(
      state,
      action: PayloadAction<SuccessPayload<PermissionAssignment>>,
    ) {
      setEntrySuccess(state.users.permissions, action);
    },
    fetchUserPermissionsFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.users.permissions, action);
    },

    createUserRequest(state, _action: PayloadAction<RequestPayload<UserFormData>>) {
      setMutationLoading(state.users.create);
    },
    createUserSuccess(state, action: PayloadAction<SuccessPayload<User>>) {
      setMutationSuccess(state.users.create);
      upsertUser(state, action.payload.data);
      invalidateEntries(state.users.lists);
      invalidateEntries(state.users.permissions);
    },
    createUserFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.users.create, action);
    },

    updateUserRequest(state, _action: PayloadAction<RequestPayload<UpdateUserArg>>) {
      setMutationLoading(state.users.update);
    },
    updateUserSuccess(state, action: PayloadAction<SuccessPayload<User>>) {
      setMutationSuccess(state.users.update);
      upsertUser(state, action.payload.data);
      invalidateEntries(state.users.lists);
      invalidateEntries(state.users.permissions);
    },
    updateUserFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.users.update, action);
    },

    fetchRolesRequest(state, action: PayloadAction<RequestPayload<RoleListFilters>>) {
      if (action.payload.key) setEntryLoading(state.roles.lists, action.payload.key);
    },
    fetchRolesSuccess(state, action: PayloadAction<SuccessPayload<RoleListData>>) {
      setEntrySuccess(state.roles.lists, action);
    },
    fetchRolesFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.roles.lists, action);
    },

    fetchRoleRequest(state, action: PayloadAction<RequestPayload<string>>) {
      if (action.payload.key) setEntryLoading(state.roles.details, action.payload.key);
    },
    fetchRoleSuccess(state, action: PayloadAction<SuccessPayload<Role>>) {
      setEntrySuccess(state.roles.details, action);
    },
    fetchRoleFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.roles.details, action);
    },

    createRoleRequest(state, _action: PayloadAction<RequestPayload<RoleFormData>>) {
      setMutationLoading(state.roles.create);
    },
    createRoleSuccess(state, action: PayloadAction<SuccessPayload<Role>>) {
      setMutationSuccess(state.roles.create);
      upsertRole(state, action.payload.data);
      invalidateEntries(state.roles.lists);
    },
    createRoleFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.roles.create, action);
    },

    updateRoleRequest(state, _action: PayloadAction<RequestPayload<UpdateRoleArg>>) {
      setMutationLoading(state.roles.update);
    },
    updateRoleSuccess(state, action: PayloadAction<SuccessPayload<Role>>) {
      setMutationSuccess(state.roles.update);
      upsertRole(state, action.payload.data);
      invalidateEntries(state.roles.lists);
    },
    updateRoleFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.roles.update, action);
    },

    fetchRoleGroupsRequest(
      state,
      action: PayloadAction<RequestPayload<RoleListFilters>>,
    ) {
      if (action.payload.key) setEntryLoading(state.roleGroups.lists, action.payload.key);
    },
    fetchRoleGroupsSuccess(
      state,
      action: PayloadAction<SuccessPayload<RoleGroupListData>>,
    ) {
      setEntrySuccess(state.roleGroups.lists, action);
    },
    fetchRoleGroupsFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.roleGroups.lists, action);
    },

    fetchRoleGroupRequest(state, action: PayloadAction<RequestPayload<string>>) {
      if (action.payload.key) setEntryLoading(state.roleGroups.details, action.payload.key);
    },
    fetchRoleGroupSuccess(state, action: PayloadAction<SuccessPayload<RoleGroup>>) {
      setEntrySuccess(state.roleGroups.details, action);
    },
    fetchRoleGroupFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.roleGroups.details, action);
    },

    createRoleGroupRequest(
      state,
      _action: PayloadAction<RequestPayload<RoleGroupFormData>>,
    ) {
      setMutationLoading(state.roleGroups.create);
    },
    createRoleGroupSuccess(state, action: PayloadAction<SuccessPayload<RoleGroup>>) {
      setMutationSuccess(state.roleGroups.create);
      upsertRoleGroup(state, action.payload.data);
      invalidateEntries(state.roleGroups.lists);
    },
    createRoleGroupFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.roleGroups.create, action);
    },

    updateRoleGroupRequest(
      state,
      _action: PayloadAction<RequestPayload<UpdateRoleGroupArg>>,
    ) {
      setMutationLoading(state.roleGroups.update);
    },
    updateRoleGroupSuccess(state, action: PayloadAction<SuccessPayload<RoleGroup>>) {
      setMutationSuccess(state.roleGroups.update);
      upsertRoleGroup(state, action.payload.data);
      invalidateEntries(state.roleGroups.lists);
    },
    updateRoleGroupFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.roleGroups.update, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.users.lists);
      invalidateEntries(state.users.details);
      invalidateEntries(state.users.permissions);
      invalidateEntries(state.roles.lists);
      invalidateEntries(state.roles.details);
      invalidateEntries(state.roleGroups.lists);
      invalidateEntries(state.roleGroups.details);
    },
  },
});

export const usersActions = usersSlice.actions;
export default usersSlice.reducer;
