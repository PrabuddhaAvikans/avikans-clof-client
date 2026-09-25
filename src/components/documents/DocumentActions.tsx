import { Download, Printer } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { Button } from "@/components/ui/Button";
import {
  downloadCommercialDocument,
  printCommercialDocument,
  type CommercialDocument,
} from "@/lib/commercialDocument";

type DocumentActionsProps = {
  document: CommercialDocument;
};

export function DocumentActions({ document }: DocumentActionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        leftIcon={<Printer className="h-4 w-4" />}
        onClick={() => printCommercialDocument(document)}
      >
        Print
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        leftIcon={<Download className="h-4 w-4" />}
        onClick={() => {
          void downloadCommercialDocument(document)
            .then(() => toast.success(`${document.number} downloaded`))
            .catch(() => toast.error(`Couldn't download ${document.number}`));
        }}
      >
        Download
      </Button>
    </div>
  );
}
