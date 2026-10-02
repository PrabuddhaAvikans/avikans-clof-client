import type { WorkflowApprovalLevel, WorkflowStepDefinition } from "@/types/workflow";

export function approvalAssigneeLabel(level: WorkflowApprovalLevel): string {
  return level.assignedUserName || level.assignedRoleName || "Unassigned";
}

export function isConfigurableStage(step: WorkflowStepDefinition): boolean {
  return step.nodeType === "stage" && step.stageKey !== "completed";
}

export function orderedStageSteps(steps: WorkflowStepDefinition[]): WorkflowStepDefinition[] {
  return steps
    .filter((step) => step.nodeType === "stage")
    .sort((left, right) => left.stepOrder - right.stepOrder);
}

export function levelCount(step: WorkflowStepDefinition): number {
  return (step.approvalLevels ?? []).filter((level) => level.isActive).length;
}

export function renumberLevels(levels: WorkflowApprovalLevel[]): WorkflowApprovalLevel[] {
  return levels.map((level, index) => ({ ...level, sequence: index + 1 }));
}

function withLevels(
  steps: WorkflowStepDefinition[],
  stageId: string,
  levels: WorkflowApprovalLevel[],
): WorkflowStepDefinition[] {
  return steps.map((step) =>
    step.id === stageId ? { ...step, approvalLevels: renumberLevels(levels) } : step,
  );
}

export function createApprovalLevel(partial?: Partial<WorkflowApprovalLevel>): WorkflowApprovalLevel {
  return {
    id: `wal-${crypto.randomUUID().slice(0, 8)}`,
    name: partial?.name?.trim() || "Approval Level",
    sequence: partial?.sequence ?? 1,
    assignedRoleId: partial?.assignedRoleId ?? "",
    assignedRoleName: partial?.assignedRoleName,
    assignedUserId: partial?.assignedUserId,
    assignedUserName: partial?.assignedUserName,
    description: partial?.description,
    isActive: partial?.isActive ?? true,
  };
}

export function addApprovalLevel(
  steps: WorkflowStepDefinition[],
  stageId: string,
  level: WorkflowApprovalLevel,
): WorkflowStepDefinition[] {
  const stage = steps.find((step) => step.id === stageId);
  if (!stage || !isConfigurableStage(stage)) return steps;
  return withLevels(steps, stageId, [...(stage.approvalLevels ?? []), level]);
}

export function updateApprovalLevel(
  steps: WorkflowStepDefinition[],
  stageId: string,
  level: WorkflowApprovalLevel,
): WorkflowStepDefinition[] {
  const stage = steps.find((step) => step.id === stageId);
  if (!stage) return steps;
  return withLevels(
    steps,
    stageId,
    (stage.approvalLevels ?? []).map((item) => (item.id === level.id ? level : item)),
  );
}

export function deleteApprovalLevel(
  steps: WorkflowStepDefinition[],
  stageId: string,
  levelId: string,
): WorkflowStepDefinition[] {
  const stage = steps.find((step) => step.id === stageId);
  if (!stage) return steps;
  return withLevels(
    steps,
    stageId,
    (stage.approvalLevels ?? []).filter((item) => item.id !== levelId),
  );
}

export function moveApprovalLevel(
  steps: WorkflowStepDefinition[],
  stageId: string,
  levelId: string,
  direction: -1 | 1,
): WorkflowStepDefinition[] {
  const stage = steps.find((step) => step.id === stageId);
  if (!stage) return steps;
  const levels = [...(stage.approvalLevels ?? [])].sort((left, right) => left.sequence - right.sequence);
  const index = levels.findIndex((item) => item.id === levelId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= levels.length) return steps;
  const [item] = levels.splice(index, 1);
  levels.splice(nextIndex, 0, item);
  return withLevels(steps, stageId, levels);
}
