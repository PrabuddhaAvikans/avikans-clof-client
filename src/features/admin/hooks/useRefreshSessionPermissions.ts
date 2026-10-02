import { useCallback } from "react";
import { useDispatch } from "react-redux";
import type { UnknownAction } from "@reduxjs/toolkit";
import { registerDeferred } from "@/app/store/async/deferred";
import type { AppDispatch } from "@/app/store";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { usersActions } from "@/features/admin/store/usersSlice";
import type { PermissionAssignment, User } from "@/types/user";

export function useRefreshSessionPermissions() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, signInUser, signOutUser } = useAuthSession();

  return useCallback(async () => {
    if (!user) return;

    const profileDeferred = registerDeferred<User>();
    dispatch(
      usersActions.fetchUserRequest({
        arg: user.id,
        key: user.id,
        requestId: profileDeferred.requestId,
      }) as UnknownAction,
    );
    const profile = await profileDeferred.promise;

    if (profile.status !== "active") {
      signOutUser();
      return;
    }

    const assignmentDeferred = registerDeferred<PermissionAssignment>();
    dispatch(
      usersActions.fetchUserPermissionsRequest({
        arg: user.id,
        key: user.id,
        requestId: assignmentDeferred.requestId,
      }) as UnknownAction,
    );
    const assignment = await assignmentDeferred.promise;

    signInUser({
      id: profile.id,
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      displayName: profile.displayName,
      role: profile.roleName,
      permissions: assignment.effectivePermissions,
    });
  }, [dispatch, signInUser, signOutUser, user]);
}
