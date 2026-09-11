import type { AuthUser } from "@/app/store/authSlice";

const AUTH_STORAGE_KEY = "avikans.auth.user";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function readStoredAuthUser(): AuthUser | null {
  if (!canUseStorage()) return null;

  try {
    const raw =
      window.localStorage.getItem(AUTH_STORAGE_KEY) ??
      window.sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const user = JSON.parse(raw) as AuthUser;
    if (!user?.id || !user.email) return null;
    return user;
  } catch {
    return null;
  }
}

export function writeStoredAuthUser(user: AuthUser, persist: boolean): void {
  if (!canUseStorage()) return;

  const raw = JSON.stringify(user);
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
  const storage = persist ? window.localStorage : window.sessionStorage;
  storage.setItem(AUTH_STORAGE_KEY, raw);
}

export function clearStoredAuthUser(): void {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function isAuthPersisted(): boolean {
  if (!canUseStorage()) return false;
  return window.localStorage.getItem(AUTH_STORAGE_KEY) != null;
}
