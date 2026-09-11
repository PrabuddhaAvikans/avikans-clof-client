import type { AuthUser } from "@/app/store/authSlice";

export type LoginCredentials = {
  email: string;
  password: string;
};

export interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthUser>;
}
