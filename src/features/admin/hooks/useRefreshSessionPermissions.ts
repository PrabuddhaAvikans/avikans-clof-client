import { useCallback } from "react";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { userService } from "@/services";

export function useRefreshSessionPermissions() {
  const { user, signInUser, signOutUser } = useAuthSession();

  return useCallback(async () => {
    if (!user) return;

    const profile = await userService.getById(user.id);
    if (profile.status !== "active") {
      signOutUser();
      return;
    }

    const assignment = await userService.getPermissionAssignment(user.id);
    signInUser({
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      role: profile.roleName,
      permissions: assignment.effectivePermissions,
    });
  }, [signInUser, signOutUser, user]);
}
