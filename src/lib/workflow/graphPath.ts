import type { WorkflowStepDefinition } from "@/types/workflow";

export function isApprovalStep(step: WorkflowStepDefinition): boolean {
  return (step.nodeType ?? "approval") === "approval";
}

export function approvalStepsInOrder(steps: WorkflowStepDefinition[]): WorkflowStepDefinition[] {
  if (steps.length === 0) return [];

  const byId = new Map(steps.map((step) => [step.id, step]));
  const start = steps.find((step) => step.nodeType === "start");

  if (!start?.approveNextStepId) {
    return steps.filter(isApprovalStep).sort((a, b) => a.stepOrder - b.stepOrder);
  }

  const ordered: WorkflowStepDefinition[] = [];
  let currentId: string | undefined = start.approveNextStepId;
  let guard = 0;

  while (currentId && byId.has(currentId) && guard++ < steps.length + 2) {
    const current: WorkflowStepDefinition = byId.get(currentId)!;
    if (current.nodeType === "completed" || current.nodeType === "rejected") {
      break;
    }
    if (isApprovalStep(current)) {
      ordered.push(current);
    }
    currentId = current.approveNextStepId;
  }

  return ordered;
}
