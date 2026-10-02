import type { Attachment, PaginatedResponse } from "@/types/common";

export function mapPaginatedResponse<T>(
  raw: unknown,
  mapItem: (item: Record<string, unknown>) => T,
): PaginatedResponse<T> {
  const page = (raw ?? {}) as {
    items?: unknown[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
  return {
    items: (page.items ?? []).map((item) =>
      mapItem(item as Record<string, unknown>),
    ),
    totalCount: page.totalCount ?? 0,
    page: page.page ?? 1,
    pageSize: page.pageSize ?? 20,
    totalPages: page.totalPages ?? 1,
  };
}

export function asRecord(raw: unknown): Record<string, unknown> {
  return (raw ?? {}) as Record<string, unknown>;
}

/** Maps nullable API ids to client strings (empty when absent). */
export function mapOptionalId(value: unknown): string {
  return value == null || value === "" ? "" : String(value);
}

/** Empty client id → null for nullable Guid? API fields. */
export function toApiOptionalId(value: string | undefined | null): string | null {
  if (value == null || value === "") return null;
  return value;
}

/**
 * Backend AttachmentDto uses name/size/contentType;
 * client Attachment uses fileName/fileSize/mimeType (+ uploaded*).
 */
export function mapAttachment(raw: Record<string, unknown>): Attachment {
  return {
    id: String(raw.id ?? ""),
    fileName: String(raw.name ?? raw.fileName ?? ""),
    fileSize: Number(raw.size ?? raw.fileSize ?? 0),
    mimeType: String(raw.contentType ?? raw.mimeType ?? "application/octet-stream"),
    url: String(raw.url ?? ""),
    uploadedBy: String(raw.uploadedBy ?? ""),
    uploadedAt: String(raw.uploadedAt ?? ""),
  };
}

export function toApiAttachment(attachment: Attachment): Record<string, unknown> {
  const guidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return {
    id: guidPattern.test(attachment.id) ? attachment.id : crypto.randomUUID(),
    name: attachment.fileName,
    size: attachment.fileSize,
    contentType: attachment.mimeType,
    url: attachment.url || null,
  };
}
