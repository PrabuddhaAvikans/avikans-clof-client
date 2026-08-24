import { Download, Paperclip, X } from 'lucide-react';
import {
  downloadAttachment,
  openAttachment,
} from '@/lib/attachment';
import { cn, formatBytes } from '@/lib/utils';
import { AttachmentIcon } from './AttachmentIcon';
import { IconButton } from './IconButton';

export type Attachment = {
  id: string;
  name: string;
  size?: number;
  url?: string;
  type?: string;
  mimeType?: string;
  file?: File;
};

export type AttachmentPanelProps = {
  attachments: Attachment[];
  onOpen?: (attachment: Attachment) => void;
  onDownload?: (attachment: Attachment) => void;
  onRemove?: (attachment: Attachment) => void;
  title?: string;
  className?: string;
  disabled?: boolean;
};

export function AttachmentPanel({
  attachments,
  onOpen,
  onDownload,
  onRemove,
  title = 'Attachments',
  className,
  disabled,
}: AttachmentPanelProps) {
  const handleOpen = (attachment: Attachment) => {
    if (disabled) return;
    if (onOpen) {
      onOpen(attachment);
      return;
    }
    openAttachment(attachment);
  };

  const handleDownload = (attachment: Attachment) => {
    if (disabled) return;
    if (onDownload) {
      onDownload(attachment);
      return;
    }
    downloadAttachment(attachment);
  };

  return (
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      <div className="border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          {title}
          <span className="ml-1 text-xs font-normal text-muted-foreground">({attachments.length})</span>
        </h3>
      </div>

      {attachments.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">No attachments</p>
      ) : (
        <ul className="divide-y divide-border">
          {attachments.map((attachment) => (
            <li
              key={attachment.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                disabled={disabled}
                onClick={() => handleOpen(attachment)}
                title={`Open ${attachment.name}`}
              >
                <AttachmentIcon
                  fileName={attachment.name}
                  type={attachment.type}
                  mimeType={attachment.mimeType}
                  className="shrink-0 text-muted-foreground"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground underline-offset-2 hover:underline cursor-pointer">
                    {attachment.name}
                  </p>
                  {attachment.size !== undefined && (
                    <p className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</p>
                  )}
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton
                  variant="ghost"
                  size="sm"
                  icon={<Download className="h-4 w-4" />}
                  aria-label={`Download ${attachment.name}`}
                  disabled={disabled}
                  onClick={() => handleDownload(attachment)}
                />
                {onRemove && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon={<X className="h-4 w-4" />}
                    aria-label={`Remove ${attachment.name}`}
                    disabled={disabled}
                    onClick={() => onRemove(attachment)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
