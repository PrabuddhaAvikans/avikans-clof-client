import { CheckCircle2, CircleX, MoreHorizontal, Play, ShieldCheck } from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { WorkflowCanvasNode, WorkflowNodeData } from "./workflowGraph";

function NodeMenu({
  stepId,
  readOnly,
  canDelete,
  onMenuAction,
}: {
  stepId: string;
  readOnly: boolean;
  canDelete: boolean;
  onMenuAction?: WorkflowNodeData["onMenuAction"];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (readOnly || !onMenuAction) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-40 rounded-lg border border-border bg-card p-1 shadow-md"
        >
          {(
            [
              ["edit", "Edit"],
              ["duplicate", "Duplicate"],
              ["add-next", "Add Next Step"],
              ...(canDelete ? [["delete", "Delete"] as const] : []),
            ] as const
          ).map(([action, label]) => (
            <button
              key={action}
              type="button"
              role="menuitem"
              className={cn(
                "flex w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-muted",
                action === "delete" && "text-destructive",
              )}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                onMenuAction(action, stepId);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TerminalCard({
  title,
  subtitle,
  icon,
  selected,
  tone,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  selected?: boolean;
  tone: "neutral" | "success" | "danger";
}) {
  return (
    <div
      className={cn(
        "min-w-[160px] rounded-xl border bg-card px-4 py-3 shadow-xs",
        selected ? "border-dashed border-foreground" : "border-border",
        tone === "success" && "border-success/40",
        tone === "danger" && "border-destructive/40",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            tone === "neutral" && "bg-muted text-foreground",
            tone === "success" && "bg-success/10 text-success",
            tone === "danger" && "bg-destructive/10 text-destructive",
          )}
        >
          {icon}
        </span>
        <div>
          <div className="text-sm font-semibold text-card-foreground">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

export function StartNode({ data, selected }: NodeProps<WorkflowCanvasNode>) {
  return (
    <div className="relative">
      <TerminalCard
        title={data.step.stepName || "Start"}
        subtitle="Entry point"
        icon={<Play className="h-4 w-4" />}
        selected={selected}
        tone="neutral"
      />
      <Handle
        id="approve"
        type="source"
        position={Position.Right}
        className="!h-2.5 !w-2.5 !border-border !bg-foreground"
      />
    </div>
  );
}

export function CompletedNode({ data, selected }: NodeProps<WorkflowCanvasNode>) {
  return (
    <div className="relative">
      <Handle
        id="target"
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-border !bg-foreground"
      />
      <TerminalCard
        title={data.step.stepName || "Completed"}
        subtitle="Approved path"
        icon={<CheckCircle2 className="h-4 w-4" />}
        selected={selected}
        tone="success"
      />
    </div>
  );
}

export function RejectedNode({ data, selected }: NodeProps<WorkflowCanvasNode>) {
  return (
    <div className="relative">
      <Handle
        id="target"
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-border !bg-foreground"
      />
      <TerminalCard
        title={data.step.stepName || "Rejected"}
        subtitle="Reject path"
        icon={<CircleX className="h-4 w-4" />}
        selected={selected}
        tone="danger"
      />
    </div>
  );
}

export function ApprovalNode({ data, selected }: NodeProps<WorkflowCanvasNode>) {
  const step = data.step;
  return (
    <div
      className={cn(
        "relative min-w-[220px] rounded-xl border bg-card px-4 py-3 shadow-xs",
        selected ? "border-dashed border-foreground" : "border-border",
      )}
    >
      <Handle
        id="target"
        type="target"
        position={Position.Left}
        className="!h-2.5 !w-2.5 !border-border !bg-foreground"
      />
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-info/10 text-info">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-card-foreground">
              {step.stepName || "Approval Step"}
            </div>
            <div className="text-xs text-muted-foreground">
              {step.approvalRoleName || "Unassigned role"}
            </div>
          </div>
        </div>
        <NodeMenu
          stepId={step.id}
          readOnly={data.readOnly}
          canDelete
          onMenuAction={data.onMenuAction}
        />
      </div>
      {step.description ? (
        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{step.description}</p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          {step.assigneeName?.trim() || "Unassigned"}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {step.status || "active"}
        </span>
      </div>
      <Handle
        id="approve"
        type="source"
        position={Position.Right}
        className="!top-[40%] !h-2.5 !w-2.5 !border-border !bg-foreground"
      />
      <Handle
        id="reject"
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-border !bg-muted-foreground"
      />
    </div>
  );
}
