import { useCallback, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Star, X } from 'lucide-react';
import { openAttachment } from '@/lib/attachment';
import { cn, formatBytes } from '@/lib/utils';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { StatusBadge } from './StatusBadge';

export type UploadedImage = {
  id: string;
  file?: File;
  previewUrl: string;
  isPrimary?: boolean;
};

export type ImageUploaderProps = {
  value?: UploadedImage[];
  onChange?: (images: UploadedImage[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
};

function createUploadedImage(file: File, isPrimary = false): UploadedImage {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    previewUrl: URL.createObjectURL(file),
    isPrimary,
  };
}

export function ImageUploader({
  value = [],
  onChange,
  accept = 'image/*',
  maxSize,
  multiple = true,
  disabled,
  label = 'Upload images',
  hint,
  error,
  className,
}: ImageUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();

  const displayError = error ?? localError;

  const updateImages = useCallback(
    (next: UploadedImage[]) => {
      const hasPrimary = next.some((img) => img.isPrimary);
      if (next.length > 0 && !hasPrimary) {
        next[0] = { ...next[0]!, isPrimary: true };
      }
      onChange?.(next);
    },
    [onChange],
  );

  const validateAndAdd = useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming).filter((f) => f.type.startsWith('image/'));
      const valid: UploadedImage[] = [];
      let validationError: string | undefined;

      for (const file of files) {
        if (maxSize && file.size > maxSize) {
          validationError = `"${file.name}" exceeds maximum size of ${formatBytes(maxSize)}`;
          continue;
        }
        valid.push(createUploadedImage(file, value.length === 0 && valid.length === 0));
      }

      setLocalError(validationError);
      if (valid.length === 0) return;

      if (multiple) {
        updateImages([...value, ...valid]);
      } else {
        value.forEach((img) => URL.revokeObjectURL(img.previewUrl));
        updateImages([valid[0]!]);
      }
    },
    [maxSize, multiple, updateImages, value],
  );

  const removeImage = (id: string) => {
    const removed = value.find((img) => img.id === id);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    updateImages(value.filter((img) => img.id !== id));
  };

  const setPrimary = (id: string) => {
    updateImages(value.map((img) => ({ ...img, isPrimary: img.id === id })));
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) return;
    const next = [...value];
    const temp = next[index]!;
    next[index] = next[nextIndex]!;
    next[nextIndex] = temp;
    updateImages(next);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {label && <p className="text-sm font-medium text-foreground">{label}</p>}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!disabled) validateAndAdd(e.dataTransfer.files);
        }}
        className={cn(
          'rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-6 text-center transition-colors',
          dragOver && 'border-primary bg-accent/30',
          disabled && 'cursor-not-allowed opacity-50',
          displayError && 'border-destructive',
        )}
      >
        <ImagePlus className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm text-foreground">
          Drag images here, or{' '}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="inline h-auto p-0 text-primary underline-offset-4 hover:underline"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            browse
          </Button>
        </p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            if (e.target.files) validateAndAdd(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {displayError && <p className="text-xs text-destructive">{displayError}</p>}

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((image, index) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-card"
            >
              <button
                type="button"
                className="block w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() =>
                  openAttachment({
                    name: image.file?.name ?? "Product image",
                    url: image.previewUrl,
                    mimeType: image.file?.type || "image/*",
                    type: "image",
                    file: image.file,
                  })
                }
                title="Open image"
              >
                <img
                  src={image.previewUrl}
                  alt={image.file?.name ?? "Product image"}
                  className="aspect-square w-full object-cover"
                />
              </button>
              {image.isPrimary && (
                <StatusBadge variant="primary" size="sm" className="absolute left-2 top-2">
                  Primary
                </StatusBadge>
              )}
              {!disabled && (
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-foreground/60 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex gap-0.5">
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={<ArrowUp className="h-3.5 w-3.5 text-primary-foreground" />}
                      aria-label="Move up"
                      disabled={index === 0}
                      onClick={() => moveImage(index, -1)}
                      className="text-primary-foreground hover:bg-foreground/20"
                    />
                    <IconButton
                      variant="ghost"
                      size="sm"
                      icon={<ArrowDown className="h-3.5 w-3.5 text-primary-foreground" />}
                      aria-label="Move down"
                      disabled={index === value.length - 1}
                      onClick={() => moveImage(index, 1)}
                      className="text-primary-foreground hover:bg-foreground/20"
                    />
                    {!image.isPrimary && (
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={<Star className="h-3.5 w-3.5 text-primary-foreground" />}
                        aria-label="Set as primary"
                        onClick={() => setPrimary(image.id)}
                        className="text-primary-foreground hover:bg-foreground/20"
                      />
                    )}
                  </div>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon={<X className="h-3.5 w-3.5 text-primary-foreground" />}
                    aria-label={`Remove ${image.file?.name ?? "image"}`}
                    onClick={() => removeImage(image.id)}
                    className="text-primary-foreground hover:bg-foreground/20"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
