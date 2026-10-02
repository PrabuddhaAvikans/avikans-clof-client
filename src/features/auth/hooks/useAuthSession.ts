import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/app/store";
import {
  signIn,
  signOut,
  type AuthUser,
} from "@/app/store/authSlice";
import {
  clearStoredAuthUser,
  isAuthPersisted,
  writeStoredAuthUser,
} from "@/app/store/authStorage";
import { clearAuthToken, getAuthToken, writeAuthToken } from "@/services/apiClient";

export function useAuthSession() {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
  const user = useSelector((state: RootState) => state.auth.user);

  const signInUser = useCallback(
    (nextUser: AuthUser, persist = isAuthPersisted()) => {
      writeStoredAuthUser(nextUser, persist);
      const token = getAuthToken();
      if (token) {
        writeAuthToken(token, persist);
      }
      dispatch(signIn(nextUser));
    },
    [dispatch],
  );

  const signOutUser = useCallback(() => {
    clearStoredAuthUser();
    clearAuthToken();
    dispatch(signOut());
  }, [dispatch]);

  return {
    isAuthenticated,
    user,
    signInUser,
    signOutUser,
  };
}
