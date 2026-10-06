import { useEffect, useId, useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  AVATAR_ACCEPT,
  MAX_AVATAR_BYTES,
  validateAvatarFile,
} from "@/lib/userAvatar";
import { cn, formatBytes } from "@/lib/utils";

type UserAvatarUploaderProps = {
  avatarFileKey?: string | null;
  displayName: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
};

export function UserAvatarUploader({
  avatarFileKey,
  displayName,
  disabled,
  onUpload,
  onRemove,
}: UserAvatarUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const custom = Boolean(avatarFileKey || localPreview);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const applyFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setBusy(true);
    try {
      validateAvatarFile(file);
      const preview = URL.createObjectURL(file);
      setLocalPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return preview;
      });
      await onUpload(file);
      toast.success("Profile photo updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload profile photo");
      setLocalPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    if (disabled) return;
    setBusy(true);
    try {
      await onRemove();
      setLocalPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return null;
      });
      toast.success("Profile photo removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove profile photo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap items-start gap-3">
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void applyFile(event.dataTransfer.files[0]);
          }}
          className={cn(
            "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed bg-card",
            dragOver ? "border-foreground/40" : "border-border",
            disabled ? "opacity-60" : "cursor-pointer",
          )}
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
        >
          {localPreview ? (
            <img
              src={localPreview}
              alt={`${displayName || "User"} profile`}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserAvatar
              name={displayName}
              avatarFileKey={avatarFileKey}
              size="md"
              className="h-20 w-20 text-base"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-medium text-foreground">Profile photo</p>
            <StatusBadge variant={custom ? "success" : "neutral"} size="sm">
              {custom ? "Custom" : "Initials"}
            </StatusBadge>
          </div>
          <p className="text-xs text-muted-foreground">
            Stored securely on the server. PNG, JPG, or WEBP. Max{" "}
            {formatBytes(MAX_AVATAR_BYTES)}.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || busy}
              leftIcon={<Upload className="h-3.5 w-3.5" />}
              onClick={() => inputRef.current?.click()}
            >
              {custom ? "Replace photo" : "Upload photo"}
            </Button>
            {custom && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || busy}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => void handleRemove()}
              >
                Remove photo
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={AVATAR_ACCEPT}
        disabled={disabled || busy}
        className="sr-only"
        onChange={(event) => {
          void applyFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {!custom && (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <ImagePlus className="h-3.5 w-3.5" aria-hidden />
          Drag and drop a photo onto the circle, or browse to upload.
        </p>
      )}
    </div>
  );
}
