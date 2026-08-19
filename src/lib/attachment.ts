export type AttachmentKind =
  | "pdf"
  | "spreadsheet"
  | "document"
  | "archive"
  | "image"
  | "other";

export type AttachmentIconSource = {
  type?: string;
  fileName?: string;
  mimeType?: string;
};

const SPREADSHEET_EXTS = new Set(["xlsx", "xls", "csv", "ods"]);
const DOCUMENT_EXTS = new Set(["doc", "docx", "txt", "rtf", "odt"]);
const ARCHIVE_EXTS = new Set(["zip", "rar", "7z", "tar", "gz"]);
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"]);

function normalizeToken(value?: string): string {
  return value?.trim().toLowerCase() ?? "";
}

export function getFileExtension(fileName?: string): string {
  if (!fileName) return "";
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot < 0 || lastDot === fileName.length - 1) return "";
  return fileName.slice(lastDot + 1).toLowerCase();
}

function kindFromToken(token: string): AttachmentKind | undefined {
  if (!token || token === "other") return undefined;
  if (token === "pdf") return "pdf";
  if (token === "spreadsheet" || SPREADSHEET_EXTS.has(token)) return "spreadsheet";
  if (token === "document" || DOCUMENT_EXTS.has(token)) return "document";
  if (token === "archive" || ARCHIVE_EXTS.has(token)) return "archive";
  if (token === "image" || IMAGE_EXTS.has(token)) return "image";
  return undefined;
}

function kindFromMimeType(mimeType?: string): AttachmentKind | undefined {
  const mime = normalizeToken(mimeType);
  if (!mime) return undefined;
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime === "text/csv"
  ) {
    return "spreadsheet";
  }
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("tar")
  ) {
    return "archive";
  }
  if (
    mime.includes("word") ||
    mime.includes("msword") ||
    mime.startsWith("text/")
  ) {
    return "document";
  }
  return undefined;
}

export function resolveAttachmentKind({
  type,
  fileName,
  mimeType,
}: AttachmentIconSource): AttachmentKind {
  return (
    kindFromToken(normalizeToken(type)) ??
    kindFromToken(getFileExtension(fileName)) ??
    kindFromMimeType(mimeType) ??
    "other"
  );
}
