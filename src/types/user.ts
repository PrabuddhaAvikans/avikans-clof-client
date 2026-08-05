import type { EntityStatus } from "@/types/common";
import type { Permission } from "@/app/config/permissions";

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  userCount: number;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RoleGroup {
  id: string;
  name: string;
  description?: string;
  roleIds: string[];
  roleNames: string[];
  userCount: number;
  status: EntityStatus;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  phone?: string;
  avatarUrl?: string;
  roleId: string;
  roleName: string;
  roleGroupIds: string[];
  roleGroupNames: string[];
  department?: string;
  jobTitle?: string;
  status: EntityStatus;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionAssignment {
  userId: string;
  roleId: string;
  additionalPermissions: Permission[];
  revokedPermissions: Permission[];
  effectivePermissions: Permission[];
}
