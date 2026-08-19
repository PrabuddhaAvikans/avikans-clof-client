import { Download, Paperclip, X } from 'lucide-react';
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
};

export type AttachmentPanelProps = {
  attachments: Attachment[];
  onDownload?: (attachment: Attachment) => void;
  onRemove?: (attachment: Attachment) => void;
  title?: string;
  className?: string;
  disabled?: boolean;
};

export function AttachmentPanel({
  attachments,
  onDownload,
  onRemove,
  title = 'Attachments',
  className,
  disabled,
}: AttachmentPanelProps) {
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
              <div className="flex min-w-0 items-center gap-2">
                <AttachmentIcon
                  fileName={attachment.name}
                  type={attachment.type}
                  mimeType={attachment.mimeType}
                  className="shrink-0 text-muted-foreground"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{attachment.name}</p>
                  {attachment.size !== undefined && (
                    <p className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {onDownload && (
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon={<Download className="h-4 w-4" />}
                    aria-label={`Download ${attachment.name}`}
                    disabled={disabled}
                    onClick={() => onDownload(attachment)}
                  />
                )}
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
