import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { usersActions } from "@/features/admin/store/usersSlice";
import { roleService, userService } from "@/services";

const fetchUsersEpic = createAsyncEpic({
  request: usersActions.fetchUsersRequest,
  success: usersActions.fetchUsersSuccess,
  failure: usersActions.fetchUsersFailure,
  handler: (filters) => userService.list(filters),
});

const fetchUserEpic = createAsyncEpic({
  request: usersActions.fetchUserRequest,
  success: usersActions.fetchUserSuccess,
  failure: usersActions.fetchUserFailure,
  handler: (id) => userService.getById(id),
});

const fetchUserPermissionsEpic = createAsyncEpic({
  request: usersActions.fetchUserPermissionsRequest,
  success: usersActions.fetchUserPermissionsSuccess,
  failure: usersActions.fetchUserPermissionsFailure,
  handler: (userId) => userService.getPermissionAssignment(userId),
});

const createUserEpic = createAsyncEpic({
  request: usersActions.createUserRequest,
  success: usersActions.createUserSuccess,
  failure: usersActions.createUserFailure,
  handler: (data) => userService.create(data),
  mode: "merge",
});

const updateUserEpic = createAsyncEpic({
  request: usersActions.updateUserRequest,
  success: usersActions.updateUserSuccess,
  failure: usersActions.updateUserFailure,
  handler: ({ id, data }) => userService.update(id, data),
  mode: "merge",
});

const fetchRolesEpic = createAsyncEpic({
  request: usersActions.fetchRolesRequest,
  success: usersActions.fetchRolesSuccess,
  failure: usersActions.fetchRolesFailure,
  handler: (filters) => roleService.listRoles(filters),
});

const fetchRoleEpic = createAsyncEpic({
  request: usersActions.fetchRoleRequest,
  success: usersActions.fetchRoleSuccess,
  failure: usersActions.fetchRoleFailure,
  handler: (id) => roleService.getRoleById(id),
});

const createRoleEpic = createAsyncEpic({
  request: usersActions.createRoleRequest,
  success: usersActions.createRoleSuccess,
  failure: usersActions.createRoleFailure,
  handler: (data) => roleService.createRole(data),
  mode: "merge",
});

const updateRoleEpic = createAsyncEpic({
  request: usersActions.updateRoleRequest,
  success: usersActions.updateRoleSuccess,
  failure: usersActions.updateRoleFailure,
  handler: ({ id, data }) => roleService.updateRole(id, data),
  mode: "merge",
});

const fetchRoleGroupsEpic = createAsyncEpic({
  request: usersActions.fetchRoleGroupsRequest,
  success: usersActions.fetchRoleGroupsSuccess,
  failure: usersActions.fetchRoleGroupsFailure,
  handler: (filters) => roleService.listRoleGroups(filters),
});

const fetchRoleGroupEpic = createAsyncEpic({
  request: usersActions.fetchRoleGroupRequest,
  success: usersActions.fetchRoleGroupSuccess,
  failure: usersActions.fetchRoleGroupFailure,
  handler: (id) => roleService.getRoleGroupById(id),
});

const createRoleGroupEpic = createAsyncEpic({
  request: usersActions.createRoleGroupRequest,
  success: usersActions.createRoleGroupSuccess,
  failure: usersActions.createRoleGroupFailure,
  handler: (data) => roleService.createRoleGroup(data),
  mode: "merge",
});

const updateRoleGroupEpic = createAsyncEpic({
  request: usersActions.updateRoleGroupRequest,
  success: usersActions.updateRoleGroupSuccess,
  failure: usersActions.updateRoleGroupFailure,
  handler: ({ id, data }) => roleService.updateRoleGroup(id, data),
  mode: "merge",
});

export const usersEpic = combineEpics(
  fetchUsersEpic,
  fetchUserEpic,
  fetchUserPermissionsEpic,
  createUserEpic,
  updateUserEpic,
  fetchRolesEpic,
  fetchRoleEpic,
  createRoleEpic,
  updateRoleEpic,
  fetchRoleGroupsEpic,
  fetchRoleGroupEpic,
  createRoleGroupEpic,
  updateRoleGroupEpic,
);
