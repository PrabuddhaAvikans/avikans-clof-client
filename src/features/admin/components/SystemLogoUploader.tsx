import { useId, useRef, useState } from "react";
import { ImagePlus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  fileToLogoDataUrl,
  LOGO_ACCEPT,
  MAX_LOGO_BYTES,
} from "@/lib/systemLogo";
import { resolveSystemLogoUrl } from "@/lib/systemSettings";
import { cn, formatBytes } from "@/lib/utils";

type SystemLogoUploaderProps = {
  value: string;
  onChange: (logoUrl: string) => void;
  disabled?: boolean;
};

export function SystemLogoUploader({ value, onChange, disabled }: SystemLogoUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  const custom = Boolean(value);
  const previewSrc = resolveSystemLogoUrl(value);

  const applyFile = async (file: File | undefined) => {
    if (!file || disabled) return;
    setBusy(true);
    try {
      const logoUrl = await fileToLogoDataUrl(file);
      onChange(logoUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload logo");
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
            "flex h-20 w-40 shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed bg-card",
            dragOver ? "border-foreground/40" : "border-border",
            disabled ? "opacity-60" : "cursor-pointer",
          )}
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
        >
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="System logo preview"
              className={cn(
                "max-h-16 max-w-[9.5rem] object-contain",
                !custom && "mix-blend-multiply",
              )}
            />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-medium text-foreground">System logo</p>
            <StatusBadge variant={custom ? "success" : "neutral"} size="sm">
              {custom ? "Custom" : "Default"}
            </StatusBadge>
          </div>
          <p className="text-xs text-muted-foreground">
            Used in the sidebar, login screen, and quotations. PNG or SVG works best.
            Max {formatBytes(MAX_LOGO_BYTES)}.
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
              {custom ? "Replace logo" : "Upload logo"}
            </Button>
            {custom && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled || busy}
                leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                onClick={() => onChange("")}
              >
                Use default
              </Button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={LOGO_ACCEPT}
        disabled={disabled || busy}
        className="sr-only"
        onChange={(event) => {
          void applyFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
