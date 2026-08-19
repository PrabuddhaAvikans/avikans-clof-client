import { useCallback, useId, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { AttachmentIcon } from './AttachmentIcon';
import { Button } from './Button';
import { IconButton } from './IconButton';

export type UploadedFile = {
  id: string;
  file: File;
};

export type FileUploaderProps = {
  value?: UploadedFile[];
  onChange?: (files: UploadedFile[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
};

function createUploadedFile(file: File): UploadedFile {
  return { id: `${file.name}-${file.size}-${file.lastModified}`, file };
}

export function FileUploader({
  value = [],
  onChange,
  accept,
  maxSize,
  multiple = false,
  disabled,
  label = 'Upload files',
  hint,
  error,
  className,
}: FileUploaderProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();

  const displayError = error ?? localError;

  const validateAndAdd = useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming);
      const valid: UploadedFile[] = [];
      let validationError: string | undefined;

      for (const file of files) {
        if (maxSize && file.size > maxSize) {
          validationError = `"${file.name}" exceeds maximum size of ${formatBytes(maxSize)}`;
          continue;
        }
        valid.push(createUploadedFile(file));
      }

      setLocalError(validationError);

      if (valid.length === 0) return;

      if (multiple) {
        onChange?.([...value, ...valid]);
      } else {
        onChange?.([valid[0]!]);
      }
    },
    [maxSize, multiple, onChange, value],
  );

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    if (disabled) return;
    validateAndAdd(event.dataTransfer.files);
  };

  const removeFile = (id: string) => {
    onChange?.(value.filter((f) => f.id !== id));
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
        onDrop={handleDrop}
        className={cn(
          'rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition-colors',
          dragOver && 'border-primary bg-accent/30',
          disabled && 'cursor-not-allowed opacity-50',
          displayError && 'border-destructive',
        )}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
        <p className="mt-2 text-sm text-foreground">
          Drag and drop files here, or{' '}
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
        {maxSize && (
          <p className="mt-1 text-xs text-muted-foreground">
            Max size: {formatBytes(maxSize)}
          </p>
        )}
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
        <ul className="space-y-2">
          {value.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <AttachmentIcon
                  fileName={item.file.name}
                  mimeType={item.file.type}
                  className="shrink-0 text-muted-foreground"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</p>
                </div>
              </div>
              {!disabled && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<X className="h-4 w-4" />}
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => removeFile(item.id)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
