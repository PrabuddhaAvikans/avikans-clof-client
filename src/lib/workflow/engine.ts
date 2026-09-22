import type { ApprovalLevel } from "@/types/costing";
import type {
  WorkflowInstance,
  WorkflowInstanceStep,
  WorkflowSelectionContext,
  WorkflowSubjectType,
  WorkflowVersion,
} from "@/types/workflow";
import {
  COSTING_APPROVAL_WORKFLOW_ID,
  getWorkflowDefinition,
  getWorkflowVersions,
  loadWorkflowCatalog,
} from "@/lib/workflow/catalog";

const INSTANCE_STORAGE_KEY = "ats.workflowInstances";
const INSTANCE_UPDATED_EVENT = "ats-workflow-instances-updated";

let instanceCache: WorkflowInstance[] | null = null;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function isVersionEffective(version: WorkflowVersion, at: string): boolean {
  if (version.effectiveFrom && at < version.effectiveFrom) return false;
  if (version.effectiveTo && at > version.effectiveTo) return false;
  return true;
}

function loadInstances(): WorkflowInstance[] {
  if (instanceCache) return instanceCache;
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    instanceCache = [];
    return instanceCache;
  }
  try {
    const raw = localStorage.getItem(INSTANCE_STORAGE_KEY);
    instanceCache = raw ? (JSON.parse(raw) as WorkflowInstance[]) : [];
    if (!Array.isArray(instanceCache)) instanceCache = [];
    return instanceCache;
  } catch {
    instanceCache = [];
    return instanceCache;
  }
}

function persistInstances(instances: WorkflowInstance[]): WorkflowInstance[] {
  instanceCache = instances;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(INSTANCE_STORAGE_KEY, JSON.stringify(instances));
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INSTANCE_UPDATED_EVENT));
  }
  return instances;
}

function upsertInstance(instance: WorkflowInstance): WorkflowInstance {
  const instances = loadInstances();
  const index = instances.findIndex((item) => item.id === instance.id);
  if (index >= 0) {
    instances[index] = instance;
  } else {
    instances.unshift(instance);
  }
  persistInstances(instances);
  return clone(instance);
}

export function getWorkflowInstance(id: string): WorkflowInstance | null {
  return clone(loadInstances().find((item) => item.id === id) ?? null);
}

export function getWorkflowInstanceBySubject(
  subjectType: WorkflowSubjectType,
  subjectId: string,
): WorkflowInstance | null {
  return clone(
    loadInstances().find((item) => item.subjectType === subjectType && item.subjectId === subjectId) ??
      null,
  );
}

export function selectWorkflowVersion(
  definitionId: string,
  context: WorkflowSelectionContext,
): WorkflowVersion {
  const catalog = loadWorkflowCatalog();
  const at = context.at ?? nowIso();
  const versions = getWorkflowVersions(definitionId, catalog);
  const published = versions.filter(
    (item) => item.status === "published" && isVersionEffective(item, at),
  );

  const fallback =
    versions.find((item) => item.isDefault) ??
    published.find((item) => item.isDefault) ??
    published.sort((left, right) => right.versionNumber - left.versionNumber)[0];
  if (!fallback) {
    throw new Error("No published workflow version is available for this order.");
  }
  return clone(fallback);
}

function snapshotSteps(
  version: WorkflowVersion,
  options: { startFirstStep: boolean; allApproved: boolean },
): WorkflowInstanceStep[] {
  return version.steps
    .slice()
    .sort((left, right) => left.stepOrder - right.stepOrder)
    .map((step, index) => {
      let status: WorkflowInstanceStep["status"] = "waiting";
      if (options.allApproved) status = "approved";
      else if (options.startFirstStep && index === 0) status = "pending";

      return {
        id: createId("wis"),
        stepDefinitionId: step.id,
        stepOrder: step.stepOrder || index + 1,
        stepName: step.stepName || step.approvalRoleName,
        roleId: step.approvalRoleId,
        roleName: step.approvalRoleName,
        assigneeUserId: step.assigneeUserId,
        assigneeName: step.assigneeName?.trim() || "Unassigned",
        status,
        startedAt: status === "pending" ? nowIso() : undefined,
        approvedAt: status === "approved" ? nowIso() : undefined,
      };
    });
}

export function startWorkflowInstance(options: {
  subjectType: WorkflowSubjectType;
  subjectId: string;
  definitionId?: string;
  context: WorkflowSelectionContext;
  startFirstStep?: boolean;
  allApproved?: boolean;
}): WorkflowInstance {
  const existing = getWorkflowInstanceBySubject(options.subjectType, options.subjectId);
  if (existing && existing.status !== "cancelled") {
    return existing;
  }

  const definitionId = options.definitionId ?? COSTING_APPROVAL_WORKFLOW_ID;
  const definition = getWorkflowDefinition(definitionId);
  const version = selectWorkflowVersion(definitionId, options.context);
  const startFirstStep = options.startFirstStep ?? true;
  const allApproved = options.allApproved ?? false;
  const steps = snapshotSteps(version, { startFirstStep, allApproved });
  const started = allApproved || startFirstStep;

  const instance: WorkflowInstance = {
    id: createId("wi"),
    subjectType: options.subjectType,
    subjectId: options.subjectId,
    workflowDefinitionId: definitionId,
    workflowDefinitionName: definition?.name ?? "Workflow",
    workflowVersionId: version.id,
    workflowVersionNumber: version.versionNumber,
    status: allApproved ? "approved" : started ? "in_progress" : "not_started",
    currentStepOrder: allApproved ? steps.length : startFirstStep ? 1 : 0,
    startedAt: nowIso(),
    completedAt: allApproved ? nowIso() : undefined,
    steps,
  };

  return upsertInstance(instance);
}

export function startFirstWorkflowStep(instanceId: string): WorkflowInstance {
  const instance = getWorkflowInstance(instanceId);
  if (!instance) throw new Error("Workflow instance was not found.");
  if (instance.status === "approved" || instance.status === "rejected") return instance;

  if (instance.steps.every((step) => step.status === "waiting") && instance.steps[0]) {
    instance.steps[0].status = "pending";
    instance.steps[0].startedAt = nowIso();
    instance.status = "in_progress";
    instance.currentStepOrder = instance.steps[0].stepOrder;
  }
  return upsertInstance(instance);
}

export function approveWorkflowStep(
  instanceId: string,
  options?: { comment?: string; userName?: string },
): WorkflowInstance {
  const instance = getWorkflowInstance(instanceId);
  if (!instance) throw new Error("Workflow instance was not found.");
  if (instance.status === "approved" || instance.status === "rejected") return instance;

  const current = instance.steps.find((step) => step.status === "pending");
  if (!current) {
    return startFirstWorkflowStep(instanceId);
  }

  current.status = "approved";
  current.approvedAt = nowIso();
  current.approvedBy = options?.userName || "Current User";
  current.remarks = options?.comment;

  const next = instance.steps.find(
    (step) => step.stepOrder > current.stepOrder && step.status === "waiting",
  );
  if (next) {
    next.status = "pending";
    next.startedAt = nowIso();
    instance.status = "in_progress";
    instance.currentStepOrder = next.stepOrder;
  } else {
    instance.status = "approved";
    instance.completedAt = nowIso();
    instance.currentStepOrder = current.stepOrder;
  }

  return upsertInstance(instance);
}

export function rejectWorkflowStep(
  instanceId: string,
  options?: { comment?: string; userName?: string },
): WorkflowInstance {
  const instance = getWorkflowInstance(instanceId);
  if (!instance) throw new Error("Workflow instance was not found.");

  const current =
    instance.steps.find((step) => step.status === "pending") ??
    instance.steps.find((step) => step.status === "waiting");
  if (current) {
    current.status = "rejected";
    current.approvedAt = nowIso();
    current.approvedBy = options?.userName || "Current User";
    current.remarks = options?.comment;
    instance.currentStepOrder = current.stepOrder;
  }

  instance.status = "rejected";
  instance.completedAt = nowIso();
  return upsertInstance(instance);
}

export function requestWorkflowChanges(
  instanceId: string,
  options?: { comment?: string; userName?: string },
): WorkflowInstance {
  const instance = getWorkflowInstance(instanceId);
  if (!instance) throw new Error("Workflow instance was not found.");
  instance.status = "changes_requested";
  const current = instance.steps.find((step) => step.status === "pending");
  if (current) {
    current.remarks = options?.comment;
    current.approvedBy = options?.userName || "Current User";
  }
  return upsertInstance(instance);
}

export function instanceStepsToApprovalLevels(instance: WorkflowInstance): ApprovalLevel[] {
  return instance.steps.map((step) => ({
    id: step.id,
    role: step.roleName,
    assigneeName: step.assigneeName,
    status:
      step.status === "approved" ||
      step.status === "rejected" ||
      step.status === "pending" ||
      step.status === "waiting"
        ? step.status
        : "waiting",
  }));
}

export function freezeExistingApprovalLevels(
  subjectId: string,
  levels: ApprovalLevel[],
  meta?: {
    definitionId?: string;
    definitionName?: string;
    versionId?: string;
    versionNumber?: number;
  },
): WorkflowInstance {
  const existing = getWorkflowInstanceBySubject("costing_request", subjectId);
  if (existing) return existing;

  const started = levels.some((level) => level.status !== "waiting");
  const allApproved = levels.length > 0 && levels.every((level) => level.status === "approved");
  const rejected = levels.some((level) => level.status === "rejected");
  const pending = levels.find((level) => level.status === "pending");

  const instance: WorkflowInstance = {
    id: createId("wi"),
    subjectType: "costing_request",
    subjectId,
    workflowDefinitionId: meta?.definitionId ?? COSTING_APPROVAL_WORKFLOW_ID,
    workflowDefinitionName: meta?.definitionName ?? "Costing Approval",
    workflowVersionId: meta?.versionId ?? "legacy-snapshot",
    workflowVersionNumber: meta?.versionNumber ?? 0,
    status: allApproved
      ? "approved"
      : rejected
        ? "rejected"
        : started
          ? "in_progress"
          : "not_started",
    currentStepOrder: pending?.id
      ? levels.findIndex((level) => level.id === pending.id) + 1
      : allApproved
        ? levels.length
        : 0,
    startedAt: nowIso(),
    completedAt: allApproved || rejected ? nowIso() : undefined,
    steps: levels.map((level, index) => ({
      id: level.id || createId("wis"),
      stepDefinitionId: level.id,
      stepOrder: index + 1,
      stepName: level.role,
      roleName: level.role,
      assigneeName: level.assigneeName,
      status: level.status,
    })),
  };

  return upsertInstance(instance);
}
