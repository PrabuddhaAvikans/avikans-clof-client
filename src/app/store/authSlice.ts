import { createSlice } from "@reduxjs/toolkit";
import type { Permission } from "@/app/config/permissions";
import { readStoredAuthUser } from "@/app/store/authStorage";

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
}

const storedUser = readStoredAuthUser();

const initialState: AuthState = storedUser
  ? { isAuthenticated: true, user: storedUser }
  : { isAuthenticated: false, user: null };

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
  },
});

export const { signIn, signOut } = authSlice.actions;

export default authSlice.reducer;
