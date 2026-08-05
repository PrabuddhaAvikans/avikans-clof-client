import type { ReactNode } from "react";
import type { Permission } from "@/app/config/permissions";
import { usePermissions } from "@/hooks/usePermissions";
import { NoPermissionPage } from "@/features/shared/pages/NoPermissionPage";

export type RequirePermissionProps = {
  permission?: Permission;
  children: ReactNode;
};

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { canAccess } = usePermissions();

  if (!canAccess(permission)) {
    return <NoPermissionPage />;
  }

  return <>{children}</>;
}
