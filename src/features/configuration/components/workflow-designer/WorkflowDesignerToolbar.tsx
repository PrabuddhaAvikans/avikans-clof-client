import { Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { workflowCanvasControls } from "./StageFlowCanvas";

type WorkflowDesignerToolbarProps = {
  canEdit: boolean;
  busy: boolean;
  isEditing: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
  onCancel: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onEditFlow: () => void;
};

export function WorkflowDesignerToolbar({
  canEdit,
  busy,
  isEditing,
  expanded,
  onToggleExpanded,
  onCancel,
  onSaveDraft,
  onPublish,
  onEditFlow,
}: WorkflowDesignerToolbarProps) {
  const runControl = (action: "zoomIn" | "zoomOut") => {
    workflowCanvasControls()?.[action]();
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
      <Button size="sm" variant="outline" onClick={onToggleExpanded}>
        {expanded ? "Collapse approvals" : "Expand approvals"}
      </Button>
      {canEdit && !isEditing ? (
        <Button size="sm" variant="outline" onClick={onEditFlow} disabled={busy}>
          Edit flow
        </Button>
      ) : null}

      <div className="ml-auto flex items-center gap-1">
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Zoom out"
          icon={<ZoomOut className="h-4 w-4" />}
          onClick={() => runControl("zoomOut")}
        />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label="Zoom in"
          icon={<ZoomIn className="h-4 w-4" />}
          onClick={() => runControl("zoomIn")}
        />
        {canEdit && isEditing ? (
          <>
            <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>
              Cancel
            </Button>
            <Button size="sm" variant="outline" onClick={onSaveDraft} disabled={busy}>
              Save Draft
            </Button>
            <Button size="sm" onClick={onPublish} disabled={busy}>
              Publish
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
