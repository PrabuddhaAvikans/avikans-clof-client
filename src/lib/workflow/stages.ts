import { COSTING_APPROVAL_WORKFLOW_ID, getWorkflowVersions, loadWorkflowCatalog } from "@/lib/workflow/catalog";
import type {
  WorkflowApprovalLevel,
  WorkflowCatalog,
  WorkflowStepDefinition,
  WorkflowVersion,
} from "@/types/workflow";

export function isStageStep(step: WorkflowStepDefinition): boolean {
  return step.nodeType === "stage";
}

export function orderedStages(steps: WorkflowStepDefinition[]): WorkflowStepDefinition[] {
  return steps.filter(isStageStep).sort((left, right) => left.stepOrder - right.stepOrder);
}

export function activeApprovalLevels(step: WorkflowStepDefinition | undefined): WorkflowApprovalLevel[] {
  if (!step?.approvalLevels) return [];
  return step.approvalLevels
    .filter((level) => level.isActive)
    .sort((left, right) => left.sequence - right.sequence);
}

export function costingStage(version: WorkflowVersion): WorkflowStepDefinition | undefined {
  return version.steps.find((step) => step.nodeType === "stage" && step.stageKey === "costing");
}

export function resolveCostingDefinitionId(catalog = loadWorkflowCatalog()): string {
  const sales =
    catalog.definitions.find((item) => item.module === "sales" && item.isActive) ??
    catalog.definitions.find((item) => item.module === "sales");
  if (!sales) return COSTING_APPROVAL_WORKFLOW_ID;

  const versions = getWorkflowVersions(sales.id, catalog);
  const version =
    versions.find((item) => item.isDefault) ?? versions.find((item) => item.status === "published");
  if (version && costingStage(version)) return sales.id;
  return COSTING_APPROVAL_WORKFLOW_ID;
}

export function findSalesDefinition(catalog: WorkflowCatalog) {
  return (
    catalog.definitions.find((item) => item.module === "sales" && item.isActive) ??
    catalog.definitions.find((item) => item.module === "sales") ??
    null
  );
}
