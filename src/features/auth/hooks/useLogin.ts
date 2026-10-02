import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import type { RootState } from "@/app/store";
import { authActions, type AuthUser } from "@/app/store/authSlice";
import type { LoginCredentials } from "@/services";

export function useLogin() {
  return useEpicMutation<LoginCredentials, AuthUser>({
    request: authActions.loginRequest,
    selectMutation: (state: RootState) => state.auth.login,
  });
}
