import type { AuthUser } from "@/app/store/authSlice";
import { isAuthPersisted } from "@/app/store/authStorage";
import { writeAuthToken } from "@/services/apiClient";
import { asRecord } from "@/services/mappers/common";

export function mapAuthUser(raw: unknown): AuthUser {
  const user = asRecord(raw) as unknown as AuthUser;
  return {
    id: String(user.id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
    role: user.role,
    permissions: user.permissions ?? [],
  };
}

/** Map login API payload and persist JWT. */
export function mapLoginResponse(raw: unknown): AuthUser {
  const result = asRecord(raw);
  writeAuthToken(String(result.token ?? ""), isAuthPersisted());
  return mapAuthUser(result.user);
}
