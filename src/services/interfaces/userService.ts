import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { EntityStatus } from "@/types/common";
import type {
  PermissionAssignment,
  Role,
  RoleGroup,
  User,
} from "@/types/user";

export interface UserListFilters extends PaginatedRequest {
  roleId?: string;
  roleGroupId?: string;
  status?: EntityStatus;
  department?: string;
}

export interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: string;
  roleGroupIds: string[];
  department?: string;
  jobTitle?: string;
  status: EntityStatus;
}

export interface UserService {
  list(filters: UserListFilters): Promise<PaginatedResponse<User>>;
  getById(id: string): Promise<User>;
  create(data: UserFormData): Promise<User>;
  update(id: string, data: Partial<UserFormData>): Promise<User>;
  delete(id: string): Promise<void>;
  getPermissionAssignment(userId: string): Promise<PermissionAssignment>;
}

export interface RoleListFilters extends PaginatedRequest {
  status?: EntityStatus;
}

export interface RoleFormData {
  name: string;
  description?: string;
  permissions: Role["permissions"];
  status: EntityStatus;
}

export interface RoleGroupFormData {
  name: string;
  description?: string;
  roleIds: string[];
  status: EntityStatus;
}

export interface RoleService {
  listRoles(filters: RoleListFilters): Promise<PaginatedResponse<Role>>;
  getRoleById(id: string): Promise<Role>;
  createRole(data: RoleFormData): Promise<Role>;
  updateRole(id: string, data: Partial<RoleFormData>): Promise<Role>;
  deleteRole(id: string): Promise<void>;
  listRoleGroups(filters: RoleListFilters): Promise<PaginatedResponse<RoleGroup>>;
  getRoleGroupById(id: string): Promise<RoleGroup>;
  createRoleGroup(data: RoleGroupFormData): Promise<RoleGroup>;
  updateRoleGroup(id: string, data: Partial<RoleGroupFormData>): Promise<RoleGroup>;
  deleteRoleGroup(id: string): Promise<void>;
}
