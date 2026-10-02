import {
  Calculator,
  CheckCircle2,
  CircleX,
  ClipboardList,
  Factory,
  FileText,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { WorkflowApprovalLevel, WorkflowStageKey, WorkflowStepDefinition } from "@/types/workflow";
import { approvalAssigneeLabel, levelCount } from "./stageFlow";

export type StageFlowNodeData = {
  kind: "stage" | "level" | "returned";
  stage?: WorkflowStepDefinition;
  level?: WorkflowApprovalLevel;
  expanded?: boolean;
  readOnly?: boolean;
  onToggle?: (stageId: string) => void;
  onManage?: (stageId: string) => void;
  onDeleteLevel?: (stageId: string, levelId: string, levelName: string) => void;
};

export type StageFlowCanvasNode = Node<StageFlowNodeData, "stage" | "level" | "returned">;

const STAGE_ICONS: Record<WorkflowStageKey, ReactNode> = {
  quotation: <FileText className="h-4 w-4" />,
  sales_order: <ClipboardList className="h-4 w-4" />,
  estimation: <Package className="h-4 w-4" />,
  costing: <Calculator className="h-4 w-4" />,
  production: <Factory className="h-4 w-4" />,
  delivery: <Truck className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
};

const STAGE_TONES: Record<WorkflowStageKey, string> = {
  quotation: "bg-info/10 text-info",
  sales_order: "bg-teal/10 text-teal",
  estimation: "bg-warning/10 text-warning",
  costing: "bg-primary/10 text-primary",
  production: "bg-success/10 text-success",
  delivery: "bg-info/10 text-info",
  completed: "bg-success/10 text-success",
};

function FlowCard({
  selected,
  tone = "default",
  icon,
  iconClass,
  title,
  subtitle,
  footer,
  children,
}: {
  selected?: boolean;
  tone?: "default" | "success" | "danger" | "info";
  icon: ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-[268px] rounded-xl border-2 border-dashed bg-card px-3.5 py-3 shadow-xs",
        selected
          ? "border-solid border-foreground shadow-sm"
          : tone === "success"
            ? "border-success/70"
            : tone === "danger"
              ? "border-destructive/70"
              : tone === "info"
                ? "border-info/70"
                : "border-foreground/45",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-foreground/20",
            iconClass,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-card-foreground">{title}</div>
          <div className="mt-0.5 text-xs leading-5 text-muted-foreground">{subtitle}</div>
          {children}
        </div>
      </div>
      {footer}
    </div>
  );
}

export function StageNode({ data, selected }: NodeProps<StageFlowCanvasNode>) {
  const stage = data.stage!;
  const key = (stage.stageKey ?? "sales_order") as WorkflowStageKey;
  const count = levelCount(stage);
  const configurable = key !== "completed";

  return (
    <div className="relative">
      {key !== "quotation" ? (
        <Handle
          id="target"
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-foreground !bg-card"
        />
      ) : null}
      <FlowCard
        selected={selected}
        tone={key === "completed" ? "success" : "default"}
        icon={STAGE_ICONS[key] ?? <ClipboardList className="h-4 w-4" />}
        iconClass={STAGE_TONES[key] ?? "bg-muted text-foreground"}
        title={stage.stepName}
        subtitle={
          key === "completed"
            ? "End of flow"
            : count === 0
              ? "No approval required"
              : data.expanded
                ? "Approval path open"
                : `${count} approval ${count === 1 ? "level" : "levels"}`
        }
        footer={
          configurable ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-2.5">
              {count > 0 ? (
                <button
                  type="button"
                  className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                  onClick={(event) => {
                    event.stopPropagation();
                    data.onToggle?.(stage.id);
                  }}
                >
                  {data.expanded ? "Collapse" : "Expand"}
                </button>
              ) : null}
              <button
                type="button"
                className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted"
                onClick={(event) => {
                  event.stopPropagation();
                  data.onManage?.(stage.id);
                }}
              >
                {data.readOnly ? "View approvals" : "Manage approvals"}
              </button>
            </div>
          ) : null
        }
      />
      {key !== "completed" ? (
        <>
          <Handle
            id="next"
            type="source"
            position={Position.Right}
            className="!h-3 !w-3 !border-2 !border-foreground !bg-card"
          />
          <Handle
            id="source"
            type="source"
            position={Position.Bottom}
            className="!h-3 !w-3 !border-2 !border-foreground !bg-card"
          />
        </>
      ) : null}
    </div>
  );
}

export function LevelNode({ data, selected }: NodeProps<StageFlowCanvasNode>) {
  const level = data.level!;
  const stage = data.stage!;

  return (
    <div className="relative">
      <Handle
        id="target"
        type="target"
        position={Position.Top}
            className="!h-3 !w-3 !border-2 !border-foreground !bg-card"
      />
      <FlowCard
        selected={selected}
        tone="info"
        icon={<ShieldCheck className="h-4 w-4" />}
        iconClass="bg-info/10 text-info"
        title={`Level ${level.sequence}`}
        subtitle={level.name}
        footer={
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate text-[11px] text-muted-foreground">
              {approvalAssigneeLabel(level)}
            </span>
            {!data.readOnly ? (
              <button
                type="button"
                className="text-[11px] font-medium text-destructive hover:underline"
                onClick={(event) => {
                  event.stopPropagation();
                  data.onDeleteLevel?.(stage.id, level.id, level.name);
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        }
      >
        <div className="mt-2 flex gap-1.5">
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
            Approve
          </span>
          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
            Reject
          </span>
        </div>
      </FlowCard>
      <Handle
        id="approve"
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-success !bg-card"
      />
      <Handle
        id="reject"
        type="source"
        position={Position.Right}
        className="!top-1/2 !h-3 !w-3 !border-2 !border-destructive !bg-card"
      />
    </div>
  );
}

export function ReturnedNode({ selected }: NodeProps<StageFlowCanvasNode>) {
  return (
    <div className="relative">
      <Handle
        id="target"
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-destructive !bg-card"
      />
      <FlowCard
        selected={selected}
        tone="danger"
        icon={<CircleX className="h-4 w-4" />}
        iconClass="bg-destructive/10 text-destructive"
        title="Returned"
        subtitle="Back to stage for correction"
      />
    </div>
  );
}
