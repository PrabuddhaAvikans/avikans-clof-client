import { useEffect, useState } from "react";
import { FileWarning, Loader2 } from "lucide-react";
import { fetchSecureFileBlob } from "@/lib/secureFile";
import { cn } from "@/lib/utils";
import { SecureImage } from "@/components/ui/SecureImage";

export type FilePreviewProps = {
  fileKey?: string | null;
  fileName?: string;
  contentType?: string;
  className?: string;
};

function isImage(contentType?: string, fileName?: string): boolean {
  if (contentType?.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(fileName ?? "");
}

function isPdf(contentType?: string, fileName?: string): boolean {
  if (contentType === "application/pdf") return true;
  return /\.pdf$/i.test(fileName ?? "");
}

/**
 * Inline preview for a secure file by opaque fileKey only.
 */
export function FilePreview({
  fileKey,
  fileName,
  contentType,
  className,
}: FilePreviewProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const key = fileKey?.trim() || "";
  const showImage = isImage(contentType, fileName);
  const showPdf = isPdf(contentType, fileName);

  useEffect(() => {
    if (!key || showImage) {
      setObjectUrl(null);
      setError(null);
      setLoading(false);
      return;
    }

    let revoked = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const blob = await fetchSecureFileBlob(key);
        if (revoked) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      } catch {
        if (!revoked) setError("Unable to preview this file.");
      } finally {
        if (!revoked) setLoading(false);
      }
    })();

    return () => {
      revoked = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [key, showImage]);

  if (!key) {
    return (
      <div className={cn("flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground", className)}>
        <FileWarning className="h-4 w-4" />
        No file selected
      </div>
    );
  }

  if (showImage) {
    return (
      <SecureImage
        fileKey={key}
        alt={fileName || "Preview"}
        className={cn("max-h-[70vh] w-full object-contain", className)}
        fallback={
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <FileWarning className="h-4 w-4" />
            Unable to load image
          </div>
        }
      />
    );
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading preview…
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div className={cn("flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground", className)}>
        <FileWarning className="h-4 w-4" />
        {error || "Preview is not available for this file type."}
      </div>
    );
  }

  if (showPdf) {
    return (
      <iframe
        title={fileName || "PDF preview"}
        src={objectUrl}
        className={cn("h-[70vh] w-full rounded-md border border-border bg-card", className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground", className)}>
      <FileWarning className="h-4 w-4" />
      Preview is not available for this file type. Use download instead.
    </div>
  );
}
