import type {
  WorkflowApprovalLevel,
  WorkflowCatalog,
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowInstanceStep,
  WorkflowModule,
  WorkflowNodeStatus,
  WorkflowNodeType,
  WorkflowRule,
  WorkflowStageKey,
  WorkflowStepDefinition,
  WorkflowVersion,
} from "@/types/workflow";

const STAGE_KEYS = new Set<WorkflowStageKey>([
  "quotation",
  "sales_order",
  "estimation",
  "costing",
  "production",
  "delivery",
  "completed",
]);

function mapModule(value: unknown): WorkflowModule {
  return value === "sales" ? "sales" : "costing";
}

function mapLevel(raw: Record<string, unknown>, index: number): WorkflowApprovalLevel {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? `Level ${index + 1}`),
    sequence: Number(raw.sequence ?? index + 1),
    assignedRoleId: String(raw.assignedRoleId ?? ""),
    assignedRoleName: raw.assignedRoleName == null ? undefined : String(raw.assignedRoleName),
    assignedUserId: raw.assignedUserId == null ? undefined : String(raw.assignedUserId),
    assignedUserName: raw.assignedUserName == null ? undefined : String(raw.assignedUserName),
    description: raw.description == null ? undefined : String(raw.description),
    isActive: raw.isActive !== false,
  };
}

export function mapStep(raw: Record<string, unknown>): WorkflowStepDefinition {
  return {
    id: String(raw.id),
    stepOrder: Number(raw.stepOrder ?? 0),
    stepName: String(raw.stepName ?? ""),
    approvalRoleId: String(raw.approvalRoleId ?? ""),
    approvalRoleName: String(raw.approvalRoleName ?? ""),
    assigneeUserId: raw.assigneeUserId == null ? undefined : String(raw.assigneeUserId),
    assigneeName: raw.assigneeName as string | undefined,
    approvalType: (raw.approvalType as WorkflowStepDefinition["approvalType"]) ?? "sequential",
    minApprovals: Number(raw.minApprovals ?? 1),
    nodeType: (raw.nodeType as WorkflowNodeType) ?? "approval",
    description: raw.description == null ? undefined : String(raw.description),
    status: (raw.status as WorkflowNodeStatus) ?? "active",
    positionX: raw.positionX == null ? undefined : Number(raw.positionX),
    positionY: raw.positionY == null ? undefined : Number(raw.positionY),
    approveNextStepId:
      raw.approveNextStepId == null ? undefined : String(raw.approveNextStepId),
    rejectNextStepId:
      raw.rejectNextStepId == null ? undefined : String(raw.rejectNextStepId),
    stageKey: STAGE_KEYS.has(raw.stageKey as WorkflowStageKey)
      ? (raw.stageKey as WorkflowStageKey)
      : undefined,
    approvalLevels: Array.isArray(raw.approvalLevels)
      ? raw.approvalLevels.map((item, index) => mapLevel(item as Record<string, unknown>, index))
      : undefined,
  };
}

export function mapDefinition(raw: Record<string, unknown>): WorkflowDefinition {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ""),
    description: String(raw.description ?? ""),
    module: mapModule(raw.module),
    isActive: Boolean(raw.isActive ?? true),
  };
}

export function mapVersion(raw: Record<string, unknown>): WorkflowVersion {
  return {
    id: String(raw.id),
    workflowDefinitionId: String(raw.workflowDefinitionId),
    versionNumber: Number(raw.versionNumber ?? 1),
    status: (raw.status as WorkflowVersion["status"]) ?? "draft",
    isDefault: Boolean(raw.isDefault),
    effectiveFrom: raw.effectiveFrom as string | undefined,
    effectiveTo: raw.effectiveTo as string | undefined,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    publishedAt: raw.publishedAt as string | undefined,
    steps: ((raw.steps as unknown[]) ?? []).map((item) =>
      mapStep(item as Record<string, unknown>),
    ),
  };
}

export function mapRule(raw: Record<string, unknown>): WorkflowRule {
  return {
    id: String(raw.id),
    workflowDefinitionId: String(raw.workflowDefinitionId),
    name: String(raw.name ?? ""),
    priority: Number(raw.priority ?? 0),
    enabled: Boolean(raw.enabled ?? true),
    conditions: (raw.conditions as WorkflowRule["conditions"]) ?? [],
    workflowVersionId: String(raw.workflowVersionId),
  };
}

export function mapCatalog(raw: Record<string, unknown>): WorkflowCatalog {
  return {
    definitions: ((raw.definitions as unknown[]) ?? []).map((item) =>
      mapDefinition(item as Record<string, unknown>),
    ),
    versions: ((raw.versions as unknown[]) ?? []).map((item) =>
      mapVersion(item as Record<string, unknown>),
    ),
    rules: ((raw.rules as unknown[]) ?? []).map((item) =>
      mapRule(item as Record<string, unknown>),
    ),
  };
}

export function mapInstanceStep(raw: Record<string, unknown>): WorkflowInstanceStep {
  return {
    id: String(raw.id),
    stepDefinitionId: String(raw.stepDefinitionId ?? ""),
    stepOrder: Number(raw.stepOrder ?? 0),
    stepName: String(raw.stepName ?? ""),
    roleId: raw.roleId == null ? undefined : String(raw.roleId),
    roleName: String(raw.roleName ?? ""),
    assigneeUserId: raw.assigneeUserId == null ? undefined : String(raw.assigneeUserId),
    assigneeName: String(raw.assigneeName ?? ""),
    status: (raw.status as WorkflowInstanceStep["status"]) ?? "waiting",
    startedAt: raw.startedAt as string | undefined,
    approvedAt: raw.approvedAt as string | undefined,
    approvedBy: raw.approvedBy as string | undefined,
    remarks: raw.remarks as string | undefined,
  };
}

export function mapInstance(raw: Record<string, unknown>): WorkflowInstance {
  return {
    id: String(raw.id),
    subjectType: (raw.subjectType as WorkflowInstance["subjectType"]) ?? "costing_request",
    subjectId: String(raw.subjectId ?? ""),
    workflowDefinitionId: String(raw.workflowDefinitionId),
    workflowDefinitionName: String(raw.workflowDefinitionName ?? ""),
    workflowVersionId: String(raw.workflowVersionId),
    workflowVersionNumber: Number(raw.workflowVersionNumber ?? 1),
    status: (raw.status as WorkflowInstance["status"]) ?? "not_started",
    currentStepOrder: Number(raw.currentStepOrder ?? 0),
    startedAt: String(raw.startedAt ?? new Date().toISOString()),
    completedAt: raw.completedAt as string | undefined,
    steps: ((raw.steps as unknown[]) ?? []).map((item) =>
      mapInstanceStep(item as Record<string, unknown>),
    ),
  };
}
