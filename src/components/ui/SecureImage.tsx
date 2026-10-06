import { useEffect, useState, type ReactNode } from "react";
import { fetchSecureFileBlob } from "@/lib/secureFile";
import { cn } from "@/lib/utils";

export type SecureImageProps = {
  fileKey?: string | null;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
};

/**
 * Renders an image through the authenticated file API using only an opaque fileKey.
 * Never accepts or stores storage URLs / paths.
 */
export function SecureImage({
  fileKey,
  alt = "",
  className,
  fallback = null,
}: SecureImageProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const key = fileKey?.trim();
    if (!key) {
      setObjectUrl(null);
      setFailed(false);
      return;
    }

    let revoked = false;
    let createdUrl: string | null = null;
    setFailed(false);

    void (async () => {
      try {
        const blob = await fetchSecureFileBlob(key);
        if (revoked) return;
        createdUrl = URL.createObjectURL(blob);
        setObjectUrl(createdUrl);
      } catch {
        if (!revoked) {
          setObjectUrl(null);
          setFailed(true);
        }
      }
    })();

    return () => {
      revoked = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [fileKey]);

  if (!fileKey?.trim() || failed || !objectUrl) {
    return <>{fallback}</>;
  }

  return <img src={objectUrl} alt={alt} className={cn(className)} />;
}
