import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { usersActions as actions } from "@/features/admin/store/usersSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapRole, mapRoleGroup, mapUser } from "@/services/mappers/userMappers";
import type { PermissionAssignment } from "@/types/user";

const fetchUsersEpic = createApiEpic({
  request: actions.fetchUsersRequest,
  success: actions.fetchUsersSuccess,
  failure: actions.fetchUsersFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/users${buildQuery(filters)}`),
      mapUser,
    ),
});

const fetchUserEpic = createApiEpic({
  request: actions.fetchUserRequest,
  success: actions.fetchUserSuccess,
  failure: actions.fetchUserFailure,
  execute: async (id) => mapUser(asRecord(await http.get(`/api/users/${id}`))),
});

const fetchUserPermissionsEpic = createApiEpic({
  request: actions.fetchUserPermissionsRequest,
  success: actions.fetchUserPermissionsSuccess,
  failure: actions.fetchUserPermissionsFailure,
  execute: async (userId) =>
    (await http.get(`/api/users/${userId}/permission-assignment`)) as PermissionAssignment,
});

const createUserEpic = createApiEpic({
  request: actions.createUserRequest,
  success: actions.createUserSuccess,
  failure: actions.createUserFailure,
  concurrency: "merge",
  execute: async (data) => mapUser(asRecord(await http.post("/api/users", data))),
});

const updateUserEpic = createApiEpic({
  request: actions.updateUserRequest,
  success: actions.updateUserSuccess,
  failure: actions.updateUserFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapUser(asRecord(await http.put(`/api/users/${id}`, data))),
});

const fetchRolesEpic = createApiEpic({
  request: actions.fetchRolesRequest,
  success: actions.fetchRolesSuccess,
  failure: actions.fetchRolesFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/roles${buildQuery(filters)}`),
      mapRole,
    ),
});

const fetchRoleEpic = createApiEpic({
  request: actions.fetchRoleRequest,
  success: actions.fetchRoleSuccess,
  failure: actions.fetchRoleFailure,
  execute: async (id) => mapRole(asRecord(await http.get(`/api/roles/${id}`))),
});

const createRoleEpic = createApiEpic({
  request: actions.createRoleRequest,
  success: actions.createRoleSuccess,
  failure: actions.createRoleFailure,
  concurrency: "merge",
  execute: async (data) => mapRole(asRecord(await http.post("/api/roles", data))),
});

const updateRoleEpic = createApiEpic({
  request: actions.updateRoleRequest,
  success: actions.updateRoleSuccess,
  failure: actions.updateRoleFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapRole(asRecord(await http.put(`/api/roles/${id}`, data))),
});

const fetchRoleGroupsEpic = createApiEpic({
  request: actions.fetchRoleGroupsRequest,
  success: actions.fetchRoleGroupsSuccess,
  failure: actions.fetchRoleGroupsFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`/api/role-groups${buildQuery(filters)}`),
      mapRoleGroup,
    ),
});

const fetchRoleGroupEpic = createApiEpic({
  request: actions.fetchRoleGroupRequest,
  success: actions.fetchRoleGroupSuccess,
  failure: actions.fetchRoleGroupFailure,
  execute: async (id) =>
    mapRoleGroup(asRecord(await http.get(`/api/role-groups/${id}`))),
});

const createRoleGroupEpic = createApiEpic({
  request: actions.createRoleGroupRequest,
  success: actions.createRoleGroupSuccess,
  failure: actions.createRoleGroupFailure,
  concurrency: "merge",
  execute: async (data) =>
    mapRoleGroup(asRecord(await http.post("/api/role-groups", data))),
});

const updateRoleGroupEpic = createApiEpic({
  request: actions.updateRoleGroupRequest,
  success: actions.updateRoleGroupSuccess,
  failure: actions.updateRoleGroupFailure,
  concurrency: "merge",
  execute: async ({ id, data }) =>
    mapRoleGroup(asRecord(await http.put(`/api/role-groups/${id}`, data))),
});

const deleteRoleEpic = createApiEpic({
  request: actions.deleteRoleRequest,
  success: actions.deleteRoleSuccess,
  failure: actions.deleteRoleFailure,
  concurrency: "merge",
  execute: async (id) => {
    await http.delete(`/api/roles/${id}`);
    return id;
  },
});

const deleteRoleGroupEpic = createApiEpic({
  request: actions.deleteRoleGroupRequest,
  success: actions.deleteRoleGroupSuccess,
  failure: actions.deleteRoleGroupFailure,
  concurrency: "merge",
  execute: async (id) => {
    await http.delete(`/api/role-groups/${id}`);
    return id;
  },
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
  deleteRoleEpic,
  deleteRoleGroupEpic,
);
