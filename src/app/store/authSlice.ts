import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Permission } from "@/app/config/permissions";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import {
  createMutationEntry,
  setMutationFailure,
  setMutationLoading,
  setMutationSuccess,
} from "@/app/store/async/reducers";
import type { MutationEntry } from "@/app/store/async/types";
import { readStoredAuthUser } from "@/app/store/authStorage";
import type { LoginCredentials } from "@/services/interfaces/authService";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  permissions: Permission[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: MutationEntry;
}

const storedUser = readStoredAuthUser();

const initialState: AuthState = storedUser
  ? { isAuthenticated: true, user: storedUser, login: createMutationEntry() }
  : { isAuthenticated: false, user: null, login: createMutationEntry() };

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    signOut(state) {
      state.isAuthenticated = false;
      state.user = null;
    },
    signIn(state, action: { payload: AuthUser }) {
      state.isAuthenticated = true;
      state.user = action.payload;
    },

    loginRequest(state, _action: PayloadAction<RequestPayload<LoginCredentials>>) {
      setMutationLoading(state.login);
    },
    loginSuccess(state, _action: PayloadAction<SuccessPayload<AuthUser>>) {
      setMutationSuccess(state.login);
    },
    loginFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.login, action);
    },
  },
});

export const { signIn, signOut } = authSlice.actions;
export const authActions = authSlice.actions;

export default authSlice.reducer;
