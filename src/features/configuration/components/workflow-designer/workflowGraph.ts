import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import { createWorkflowStep } from "@/lib/workflow";
import type { WorkflowNodeType, WorkflowStepDefinition } from "@/types/workflow";

export type WorkflowNodeData = {
  step: WorkflowStepDefinition;
  readOnly: boolean;
  onMenuAction?: (action: "edit" | "duplicate" | "add-next" | "delete", stepId: string) => void;
};

export type WorkflowCanvasNode = Node<WorkflowNodeData, WorkflowNodeType>;

export function ensureTerminalNodes(steps: WorkflowStepDefinition[]): WorkflowStepDefinition[] {
  const next = [...steps];
  const hasStart = next.some((step) => step.nodeType === "start");
  const hasCompleted = next.some((step) => step.nodeType === "completed");
  const hasRejected = next.some((step) => step.nodeType === "rejected");

  if (!hasStart) {
    next.unshift(
      createWorkflowStep({
        stepName: "Start",
        nodeType: "start",
        approvalRoleId: "",
        approvalRoleName: "",
        positionX: 80,
        positionY: 240,
      }),
    );
  }
  if (!hasCompleted) {
    next.push(
      createWorkflowStep({
        stepName: "Completed",
        nodeType: "completed",
        approvalRoleId: "",
        approvalRoleName: "",
        positionX: 1040,
        positionY: 240,
      }),
    );
  }
  if (!hasRejected) {
    next.push(
      createWorkflowStep({
        stepName: "Rejected",
        nodeType: "rejected",
        approvalRoleId: "",
        approvalRoleName: "",
        positionX: 560,
        positionY: 360,
      }),
    );
  }

  return next.map((step, index) => ({ ...step, stepOrder: index + 1 }));
}

export function stepsToFlow(
  steps: WorkflowStepDefinition[],
  options: {
    readOnly: boolean;
    onMenuAction?: WorkflowNodeData["onMenuAction"];
  },
): { nodes: WorkflowCanvasNode[]; edges: Edge[] } {
  const nodes: WorkflowCanvasNode[] = steps.map((step, index) => ({
    id: step.id,
    type: step.nodeType ?? "approval",
    position: {
      x: step.positionX ?? 120 + index * 240,
      y: step.positionY ?? (step.nodeType === "rejected" ? 360 : 160),
    },
    data: {
      step,
      readOnly: options.readOnly,
      onMenuAction: options.onMenuAction,
    },
    draggable: !options.readOnly,
    selectable: true,
  }));

  const edges: Edge[] = [];
  for (const step of steps) {
    if (step.approveNextStepId) {
      edges.push({
        id: `${step.id}->approve->${step.approveNextStepId}`,
        source: step.id,
        target: step.approveNextStepId,
        sourceHandle: "approve",
        targetHandle: "target",
        label: step.nodeType === "start" ? undefined : "Approve",
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: { stroke: "var(--foreground)", strokeWidth: 1.5 },
        labelStyle: { fill: "var(--foreground)", fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: "var(--card)" },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
      });
    }
    if (step.rejectNextStepId) {
      edges.push({
        id: `${step.id}->reject->${step.rejectNextStepId}`,
        source: step.id,
        target: step.rejectNextStepId,
        sourceHandle: "reject",
        targetHandle: "target",
        label: "Reject",
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
        style: {
          stroke: "var(--muted-foreground)",
          strokeWidth: 1.5,
          strokeDasharray: "6 4",
        },
        labelStyle: { fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 600 },
        labelBgStyle: { fill: "var(--card)" },
        labelBgPadding: [4, 6] as [number, number],
        labelBgBorderRadius: 4,
      });
    }
  }

  return { nodes, edges };
}

export function applyNodePositions(
  steps: WorkflowStepDefinition[],
  nodes: WorkflowCanvasNode[],
): WorkflowStepDefinition[] {
  const positions = new Map(nodes.map((node) => [node.id, node.position]));
  return steps.map((step) => {
    const position = positions.get(step.id);
    if (!position) return step;
    return {
      ...step,
      positionX: Math.round(position.x),
      positionY: Math.round(position.y),
    };
  });
}

export function applyConnection(
  steps: WorkflowStepDefinition[],
  sourceId: string,
  targetId: string,
  handle?: string | null,
): WorkflowStepDefinition[] {
  const outcome = handle === "reject" ? "reject" : "approve";
  return steps.map((step) => {
    if (step.id !== sourceId) return step;
    if (outcome === "reject") {
      return { ...step, rejectNextStepId: targetId };
    }
    return { ...step, approveNextStepId: targetId };
  });
}

export function removeConnectionsTo(
  steps: WorkflowStepDefinition[],
  stepId: string,
): WorkflowStepDefinition[] {
  return steps.map((step) => ({
    ...step,
    approveNextStepId: step.approveNextStepId === stepId ? undefined : step.approveNextStepId,
    rejectNextStepId: step.rejectNextStepId === stepId ? undefined : step.rejectNextStepId,
  }));
}

export function createApprovalStep(
  steps: WorkflowStepDefinition[],
  options?: { afterStepId?: string; positionX?: number; positionY?: number },
): WorkflowStepDefinition[] {
  const rejected = steps.find((step) => step.nodeType === "rejected");
  const completed = steps.find((step) => step.nodeType === "completed");
  const approvals = steps.filter((step) => (step.nodeType ?? "approval") === "approval");
  const index = approvals.length;
  const newStep = createWorkflowStep({
    stepName: `Approval Step ${index + 1}`,
    nodeType: "approval",
    positionX: options?.positionX ?? 320 + index * 240,
    positionY: options?.positionY ?? 80,
    rejectNextStepId: rejected?.id,
    approveNextStepId: completed?.id,
  });

  let next = [...steps, newStep];

  if (options?.afterStepId) {
    next = next.map((step) =>
      step.id === options.afterStepId
        ? { ...step, approveNextStepId: newStep.id }
        : step,
    );
  } else {
    const start = next.find((step) => step.nodeType === "start");
    if (start && !start.approveNextStepId) {
      next = next.map((step) =>
        step.id === start.id ? { ...step, approveNextStepId: newStep.id } : step,
      );
    }
  }

  return next.map((step, order) => ({ ...step, stepOrder: order + 1 }));
}

export function duplicateStep(
  steps: WorkflowStepDefinition[],
  stepId: string,
): WorkflowStepDefinition[] {
  const source = steps.find((step) => step.id === stepId);
  if (!source || source.nodeType !== "approval") return steps;

  const copy = createWorkflowStep({
    stepName: `${source.stepName} (copy)`,
    approvalRoleId: source.approvalRoleId,
    approvalRoleName: source.approvalRoleName,
    assigneeUserId: source.assigneeUserId,
    assigneeName: source.assigneeName,
    approvalType: source.approvalType,
    minApprovals: source.minApprovals,
    nodeType: "approval",
    description: source.description,
    status: source.status,
    positionX: (source.positionX ?? 320) + 40,
    positionY: (source.positionY ?? 80) + 40,
    approveNextStepId: source.approveNextStepId,
    rejectNextStepId: source.rejectNextStepId,
  });

  return [...steps, copy].map((step, order) => ({ ...step, stepOrder: order + 1 }));
}
