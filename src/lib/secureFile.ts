import { http } from "@/services/apiClient";

export type SecureFileRef = {
  fileKey: string;
  fileName: string;
  contentType: string;
  size: number;
  entityType?: string | null;
  entityId?: string | null;
  attachmentType?: string | null;
};

export function fileContentPath(fileKey: string): string {
  return `/api/files/${encodeURIComponent(fileKey)}/content`;
}

export function fileDownloadPath(fileKey: string): string {
  return `/api/files/${encodeURIComponent(fileKey)}/download`;
}

export function fileMetadataPath(fileKey: string): string {
  return `/api/files/${encodeURIComponent(fileKey)}`;
}

export async function fetchSecureFileBlob(fileKey: string): Promise<Blob> {
  return http.getBlob(fileContentPath(fileKey));
}

export async function downloadSecureFile(fileKey: string, fileName?: string): Promise<void> {
  const blob = await http.getBlob(fileDownloadPath(fileKey));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName || "download";
  link.click();
  URL.revokeObjectURL(url);
}

export async function openSecureFile(fileKey: string): Promise<void> {
  const blob = await fetchSecureFileBlob(fileKey);
  const url = URL.createObjectURL(blob);
  const opened = window.open(url, "_blank");
  if (opened) {
    opened.opener = null;
  } else {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function uploadSecureFile(
  file: File,
  options?: {
    entityType?: string;
    entityId?: string;
    attachmentType?: string;
  },
): Promise<SecureFileRef> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.entityType) formData.append("entityType", options.entityType);
  if (options?.entityId) formData.append("entityId", options.entityId);
  if (options?.attachmentType) formData.append("attachmentType", options.attachmentType);

  const raw = (await http.postForm("/api/files", formData)) as Record<string, unknown>;
  return mapSecureFile(raw);
}

export function mapSecureFile(raw: Record<string, unknown>): SecureFileRef {
  return {
    fileKey: String(raw.fileKey ?? raw.hashKey ?? ""),
    fileName: String(raw.fileName ?? raw.originalFileName ?? "file"),
    contentType: String(raw.contentType ?? "application/octet-stream"),
    size: Number(raw.size ?? raw.fileSize ?? 0),
    entityType: (raw.entityType as string | null | undefined) ?? null,
    entityId: (raw.entityId as string | null | undefined) ?? null,
    attachmentType: (raw.attachmentType as string | null | undefined) ?? null,
  };
}
