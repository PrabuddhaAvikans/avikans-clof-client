import type { AuthUser } from "@/app/store/authSlice";
import { delay } from "@/services/http";
import type { AuthService } from "@/services/interfaces/authService";
import { resolveEffectivePermissions } from "@/lib/effectivePermissions";
import {
  findActiveUserByEmail,
  getRoleCatalog,
  recordUserLogin,
} from "@/services/mock/mockUserService";

export const DEMO_LOGIN_EMAIL = "prabuddha@avikans.com";
export const DEMO_LOGIN_PASSWORD = "Avikans@123";

function toAuthUser(
  user: NonNullable<ReturnType<typeof findActiveUserByEmail>>,
): AuthUser {
  const { roles, roleGroups } = getRoleCatalog();
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    role: user.roleName,
    permissions: resolveEffectivePermissions(user, roles, roleGroups),
  };
}

export const mockAuthService: AuthService = {
  async login({ email, password }) {
    await delay();

    const user = findActiveUserByEmail(email);
    if (!user || password !== DEMO_LOGIN_PASSWORD) {
      throw {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password.",
        traceId: crypto.randomUUID(),
      };
    }

    recordUserLogin(user.id);
    return toAuthUser(user);
  },
};
