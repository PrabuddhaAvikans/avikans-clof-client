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

/** Anything that can be opened or downloaded in the UI. */
export type OpenableAttachment = {
  name?: string;
  fileName?: string;
  url?: string;
  type?: string;
  mimeType?: string;
  /** Local browser File from an uploader. */
  file?: File;
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

function attachmentDisplayName(attachment: OpenableAttachment): string {
  return attachment.name || attachment.fileName || attachment.file?.name || "attachment";
}

function attachmentMimeType(attachment: OpenableAttachment): string {
  if (attachment.mimeType) return attachment.mimeType;
  if (attachment.file?.type) return attachment.file.type;

  const kind = resolveAttachmentKind({
    type: attachment.type,
    fileName: attachmentDisplayName(attachment),
    mimeType: attachment.mimeType,
  });

  switch (kind) {
    case "pdf":
      return "application/pdf";
    case "image":
      return "image/svg+xml";
    case "spreadsheet":
      return "text/csv";
    case "document":
      return "text/plain";
    case "archive":
      return "application/octet-stream";
    default:
      return "text/plain";
  }
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Minimal valid PDF so mock attachments open in the browser. */
function buildDemoPdf(title: string): Blob {
  const safeTitle = title.replace(/[()\\]/g, " ").slice(0, 80);
  const stream = `BT /F1 18 Tf 72 720 Td (${safeTitle}) Tj T* /F1 12 Tf (ATSolution demo attachment) Tj ET`;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj",
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj`,
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += `${object}\n`;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function buildDemoBlob(attachment: OpenableAttachment): Blob {
  const name = attachmentDisplayName(attachment);
  const kind = resolveAttachmentKind({
    type: attachment.type,
    fileName: name,
    mimeType: attachment.mimeType ?? attachment.file?.type,
  });

  if (kind === "pdf") return buildDemoPdf(name);

  if (kind === "image") {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640">
  <rect width="100%" height="100%" fill="#f4f4f5"/>
  <text x="50%" y="48%" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="28" fill="#18181b">${escapeXml(name)}</text>
  <text x="50%" y="56%" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="14" fill="#71717a">ATSolution demo attachment</text>
</svg>`;
    return new Blob([svg], { type: "image/svg+xml" });
  }

  if (kind === "spreadsheet") {
    return new Blob(
      [`File,Type,Note\n"${name.replaceAll('"', '""')}",spreadsheet,ATSolution demo attachment\n`],
      { type: "text/csv" },
    );
  }

  if (kind === "archive") {
    return new Blob(
      [`ATSolution demo archive placeholder for ${name}\n`],
      { type: "application/octet-stream" },
    );
  }

  return new Blob(
    [
      `${name}\n\nThis is a demo attachment from ATSolution.\nOpen/download works for mock data until a real file store is connected.\n`,
    ],
    { type: attachmentMimeType(attachment) },
  );
}

export function isPreviewableAttachment(attachment: OpenableAttachment): boolean {
  const kind = resolveAttachmentKind({
    type: attachment.type,
    fileName: attachmentDisplayName(attachment),
    mimeType: attachment.mimeType ?? attachment.file?.type,
  });
  return kind === "pdf" || kind === "image" || kind === "document";
}

type ResolvedAttachmentUrl = {
  url: string;
  revoke: boolean;
};

function resolveAttachmentUrl(attachment: OpenableAttachment): ResolvedAttachmentUrl {
  if (attachment.url) {
    return { url: attachment.url, revoke: false };
  }
  if (attachment.file) {
    return { url: URL.createObjectURL(attachment.file), revoke: true };
  }
  return { url: URL.createObjectURL(buildDemoBlob(attachment)), revoke: true };
}

function triggerDownload(url: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function scheduleRevoke(url: string, revoke: boolean) {
  if (!revoke) return;
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function openInNewTab(url: string): boolean {
  // Avoid windowFeatures "noopener" — it makes window.open() return null even when
  // the tab opens, which falsely triggers download fallbacks.
  const opened = window.open(url, "_blank");
  if (opened) {
    opened.opener = null;
    return true;
  }

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return true;
}

/** Open previewable files in a new tab; otherwise download. */
export function openAttachment(attachment: OpenableAttachment): void {
  const name = attachmentDisplayName(attachment);
  const { url, revoke } = resolveAttachmentUrl(attachment);

  if (isPreviewableAttachment(attachment)) {
    const opened = openInNewTab(url);
    if (!opened) {
      triggerDownload(url, name);
    }
  } else {
    triggerDownload(url, name);
  }

  scheduleRevoke(url, revoke);
}

/** Always force a file download. */
export function downloadAttachment(attachment: OpenableAttachment): void {
  const name = attachmentDisplayName(attachment);
  const { url, revoke } = resolveAttachmentUrl(attachment);
  triggerDownload(url, name);
  scheduleRevoke(url, revoke);
}
