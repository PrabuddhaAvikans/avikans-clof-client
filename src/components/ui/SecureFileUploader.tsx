import { useState } from "react";
import { FileUploader, type UploadedFile } from "@/components/ui/FileUploader";
import { uploadSecureFile, type SecureFileRef } from "@/lib/secureFile";

export type SecureFileUploaderProps = {
  value?: SecureFileRef[];
  onChange?: (files: SecureFileRef[]) => void;
  entityType?: string;
  entityId?: string;
  attachmentType?: string;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  className?: string;
};

/**
 * Uploads files through POST /api/files and stores only opaque fileKey metadata.
 */
export function SecureFileUploader({
  value = [],
  onChange,
  entityType,
  entityId,
  attachmentType,
  accept,
  maxSize = 10 * 1024 * 1024,
  multiple = false,
  disabled,
  label = "Upload files",
  hint = "Files are stored securely. Only a file key is kept in the client.",
  className,
}: SecureFileUploaderProps) {
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const displayValue: UploadedFile[] = value.map((file) => ({
    id: file.fileKey,
    name: file.fileName,
    size: file.size,
    mimeType: file.contentType,
    fileKey: file.fileKey,
  }));

  return (
    <FileUploader
      value={displayValue}
      accept={accept}
      maxSize={maxSize}
      multiple={multiple}
      disabled={disabled || busy}
      label={label}
      hint={hint}
      error={error}
      className={className}
      onChange={(files) => {
        const kept = value.filter((file) =>
          files.some((item) => item.fileKey === file.fileKey),
        );
        const nextPending = files.filter((file) => file.file && !file.fileKey);

        if (nextPending.length === 0) {
          onChange?.(kept);
          return;
        }

        setBusy(true);
        setError(undefined);
        void (async () => {
          try {
            const uploaded: SecureFileRef[] = [];
            for (const item of nextPending) {
              if (!item.file) continue;
              uploaded.push(
                await uploadSecureFile(item.file, {
                  entityType,
                  entityId,
                  attachmentType,
                }),
              );
            }
            onChange?.(multiple ? [...kept, ...uploaded] : uploaded.slice(0, 1));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
            onChange?.(kept);
          } finally {
            setBusy(false);
          }
        })();
      }}
    />
  );
}
