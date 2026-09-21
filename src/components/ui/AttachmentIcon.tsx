import {
  File,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Paperclip,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  resolveAttachmentKind,
  type AttachmentIconSource,
  type AttachmentKind,
} from '@/lib/attachment';

export type AttachmentIconProps = AttachmentIconSource & {
  className?: string;
};

const KIND_ICONS: Record<AttachmentKind, LucideIcon> = {
  pdf: File,
  spreadsheet: FileSpreadsheet,
  document: FileText,
  archive: FileArchive,
  image: FileImage,
  other: Paperclip,
};

export function AttachmentIcon({
  type,
  fileName,
  mimeType,
  className,
}: AttachmentIconProps) {
  const kind = resolveAttachmentKind({ type, fileName, mimeType });
  const Icon = KIND_ICONS[kind];

  return (
    <span title={fileName}>
      <Icon className={cn('h-4 w-4', className)} aria-hidden />
    </span>
  );
}
