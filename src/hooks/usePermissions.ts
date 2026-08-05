import { useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import type { Permission } from "@/app/config/permissions";
import type { RootState } from "@/app/store";

export function usePermissions() {
  const permissions = useSelector(
    (state: RootState) => state.auth.user?.permissions ?? [],
  );
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );

  const permissionSet = useMemo(() => new Set<Permission>(permissions), [permissions]);

  const hasPermission = useCallback(
    (permission: Permission): boolean => permissionSet.has(permission),
    [permissionSet],
  );

  const hasAnyPermission = useCallback(
    (required: Permission[]): boolean =>
      required.some((permission) => permissionSet.has(permission)),
    [permissionSet],
  );

  const canAccess = useCallback(
    (permission?: Permission): boolean => {
      if (!isAuthenticated) {
        return false;
      }

      if (!permission) {
        return true;
      }

      return permissionSet.has(permission);
    },
    [isAuthenticated, permissionSet],
  );

  return {
    permissions,
    isAuthenticated,
    hasPermission,
    hasAnyPermission,
    canAccess,
  };
}
