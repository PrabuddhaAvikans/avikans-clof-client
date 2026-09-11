import type { UploadedFile } from "@/components/ui/FileUploader";
import { generateId, nowIso } from "@/services/http";
import type { Attachment } from "@/types/common";

export function quotationAttachmentsToForm(
  attachments: Attachment[] | undefined,
): UploadedFile[] {
  return (attachments ?? []).map((attachment) => ({
    id: attachment.id,
    name: attachment.fileName,
    size: attachment.fileSize,
    mimeType: attachment.mimeType,
    url: attachment.url,
  }));
}

export function quotationAttachmentsFromForm(
  files: UploadedFile[] | undefined,
  existing: Attachment[] = [],
): Attachment[] {
  const existingById = new Map(existing.map((item) => [item.id, item]));

  return (files ?? []).map((item) => {
    if (item.file) {
      return {
        id: generateId("qatt"),
        fileName: item.file.name,
        fileSize: item.file.size,
        mimeType: item.file.type || "application/octet-stream",
        url: URL.createObjectURL(item.file),
        uploadedBy: "usr-001",
        uploadedAt: nowIso(),
      };
    }

    const previous = existingById.get(item.id);
    if (previous) return previous;

    return {
      id: item.id || generateId("qatt"),
      fileName: item.name ?? "Untitled",
      fileSize: item.size ?? 0,
      mimeType: item.mimeType ?? "application/octet-stream",
      url: item.url ?? "",
      uploadedBy: "usr-001",
      uploadedAt: nowIso(),
    };
  });
}
