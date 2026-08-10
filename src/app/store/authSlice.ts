import { createSlice } from "@reduxjs/toolkit";
import { ALL_PERMISSIONS, type Permission } from "@/app/config/permissions";

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

const mockAdminUser: AuthUser = {
  id: "usr-001",
  email: "prabuddha.jayawardhana@avikans.com",
  firstName: "Prabuddha",
  lastName: "Jayawardhana",
  displayName: "Prabuddha Jayawardhana",
  role: "Admin",
  permissions: [...ALL_PERMISSIONS],
};

const initialState: AuthState = {
  isAuthenticated: true,
  user: mockAdminUser,
};

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
