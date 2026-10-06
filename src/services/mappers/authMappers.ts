import type { AuthUser } from "@/app/store/authSlice";
import { isAuthPersisted } from "@/app/store/authStorage";
import { writeAuthToken } from "@/services/apiClient";
import { asRecord } from "@/services/mappers/common";

export function mapAuthUser(raw: unknown): AuthUser {
  const user = asRecord(raw);
  return {
    id: String(user.id),
    email: String(user.email ?? ""),
    firstName: String(user.firstName ?? ""),
    lastName: String(user.lastName ?? ""),
    displayName:
      String(user.displayName ?? "").trim() ||
      `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
    avatarFileKey: (user.avatarFileKey as string | undefined) || undefined,
    role: String(user.role ?? ""),
    permissions: (user.permissions as AuthUser["permissions"]) ?? [],
  };
}

/** Map login API payload and persist JWT. */
export function mapLoginResponse(raw: unknown): AuthUser {
  const result = asRecord(raw);
  writeAuthToken(String(result.token ?? ""), isAuthPersisted());
  return mapAuthUser(result.user);
}
