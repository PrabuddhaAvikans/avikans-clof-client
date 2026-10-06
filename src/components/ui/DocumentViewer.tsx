import { Download, ExternalLink, X } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/Button";
import { FilePreview } from "@/components/ui/FilePreview";
import { Modal } from "@/components/ui/Modal";
import { downloadSecureFile, openSecureFile } from "@/lib/secureFile";

export type DocumentViewerProps = {
  open: boolean;
  onClose: () => void;
  fileKey?: string | null;
  fileName?: string;
  contentType?: string;
};

/**
 * Modal document viewer that streams content via opaque fileKey only.
 */
export function DocumentViewer({
  open,
  onClose,
  fileKey,
  fileName = "Document",
  contentType,
}: DocumentViewerProps) {
  const key = fileKey?.trim();

  return (
    <Modal open={open} onClose={onClose} title={fileName} size="xl">
      <div className="space-y-3">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<ExternalLink className="h-4 w-4" />}
            disabled={!key}
            onClick={() => {
              if (!key) return;
              void openSecureFile(key).catch(() =>
                toast.error("Could not open file"),
              );
            }}
          >
            Open
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Download className="h-4 w-4" />}
            disabled={!key}
            onClick={() => {
              if (!key) return;
              void downloadSecureFile(key, fileName).catch(() =>
                toast.error("Could not download file"),
              );
            }}
          >
            Download
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<X className="h-4 w-4" />}
            onClick={onClose}
          >
            Close
          </Button>
        </div>
        <FilePreview fileKey={key} fileName={fileName} contentType={contentType} />
      </div>
    </Modal>
  );
}
