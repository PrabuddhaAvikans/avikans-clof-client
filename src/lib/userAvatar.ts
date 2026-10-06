import { formatBytes } from "@/lib/utils";

export const AVATAR_ACCEPT = "image/png,image/jpeg,image/webp";
export const MAX_AVATAR_BYTES = 512 * 1024;

export function validateAvatarFile(file: File): void {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a PNG, JPG, or WEBP photo");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error(`Photo exceeds ${formatBytes(MAX_AVATAR_BYTES)}`);
  }
}

export function initialsForName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
