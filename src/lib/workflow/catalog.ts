import type {
  WorkflowCatalog,
  WorkflowDefinition,
  WorkflowRule,
  WorkflowStepDefinition,
  WorkflowVersion,
} from "@/types/workflow";

export const WORKFLOW_CATALOG_UPDATED_EVENT = "ats-workflow-catalog-updated";
export const COSTING_APPROVAL_WORKFLOW_ID = "wf-costing";

const STORAGE_KEY = "ats.workflowCatalog";
const LEGACY_STORAGE_KEY = "ats.workflowConfig";

let memoryCache: WorkflowCatalog | null = null;

function clone<T>(value: T): T {
  return structuredClone(value);
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function step(
  id: string,
  order: number,
  roleId: string,
  roleName: string,
  assigneeUserId: string,
  assigneeName: string,
): WorkflowStepDefinition {
  return {
    id,
    stepOrder: order,
    stepName: roleName,
    approvalRoleId: roleId,
    approvalRoleName: roleName,
    assigneeUserId,
    assigneeName,
    approvalType: "sequential",
    minApprovals: 1,
  };
}

const SEED_DEFINITION: WorkflowDefinition = {
  id: COSTING_APPROVAL_WORKFLOW_ID,
  name: "Costing Approval",
  description: "Sequential costing approval. Apply a flow for new orders; running orders keep their version.",
  module: "costing",
  isActive: true,
};

function seedVersions(createdAt: string): WorkflowVersion[] {
  return [
    {
      id: "wfv-costing-1",
      workflowDefinitionId: COSTING_APPROVAL_WORKFLOW_ID,
      versionNumber: 1,
      status: "published",
      isDefault: true,
      createdAt,
      publishedAt: createdAt,
      steps: [
        step("wfs-v1-1", 1, "rol-003", "Production Manager", "usr-004", "Nuwan Wickramasinghe"),
        step("wfs-v1-2", 2, "rol-002", "Sales Manager", "usr-002", "Chamari Perera"),
        step("wfs-v1-3", 3, "rol-001", "Administrator", "usr-001", "Prabuddha Jayawardhana"),
      ],
    },
  ];
}

export function getDefaultWorkflowCatalog(): WorkflowCatalog {
  const createdAt = "2025-01-01T00:00:00.000Z";
  return {
    definitions: [clone(SEED_DEFINITION)],
    versions: seedVersions(createdAt),
    rules: [],
  };
}

function migrateLegacyCatalog(): WorkflowCatalog | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      workflows?: Array<{
        id?: string;
        levels?: Array<{
          id?: string;
          roleId?: string;
          label?: string;
          assigneeName?: string;
          assigneeUserId?: string;
        }>;
      }>;
    };
    const costing = parsed.workflows?.find((item) => item.id === "costing_approval") ?? parsed.workflows?.[0];
    const levels = costing?.levels ?? [];
    if (levels.length === 0) return null;

    const catalog = getDefaultWorkflowCatalog();
    const version1 = catalog.versions.find((item) => item.id === "wfv-costing-1");
    if (!version1) return catalog;
    version1.steps = levels.map((level, index) =>
      step(
        level.id || `wfs-legacy-${index + 1}`,
        index + 1,
        level.roleId || "",
        level.label || `Step ${index + 1}`,
        level.assigneeUserId || "",
        level.assigneeName || "",
      ),
    );
    return catalog;
  } catch {
    return null;
  }
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeStep(value: unknown, index: number): WorkflowStepDefinition | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<WorkflowStepDefinition>;
  const approvalRoleName = asString(raw.approvalRoleName || raw.stepName, "").trim();
  if (!approvalRoleName) return null;
  return {
    id: asString(raw.id, createId("wfs")),
    stepOrder: asNumber(raw.stepOrder, index + 1),
    stepName: asString(raw.stepName, approvalRoleName) || approvalRoleName,
    approvalRoleId: asString(raw.approvalRoleId),
    approvalRoleName,
    assigneeUserId: asString(raw.assigneeUserId) || undefined,
    assigneeName: asString(raw.assigneeName) || undefined,
    approvalType: raw.approvalType === "any" || raw.approvalType === "all" ? raw.approvalType : "sequential",
    minApprovals: Math.max(1, asNumber(raw.minApprovals, 1)),
  };
}

function normalizeCatalog(parsed: Partial<WorkflowCatalog>): WorkflowCatalog {
  const defaults = getDefaultWorkflowCatalog();
  const definitions =
    Array.isArray(parsed.definitions) && parsed.definitions.length > 0
      ? parsed.definitions.map((item) => ({
          id: asString(item.id, COSTING_APPROVAL_WORKFLOW_ID),
          name: asString(item.name, SEED_DEFINITION.name),
          description: asString(item.description, SEED_DEFINITION.description),
          module: "costing" as const,
          isActive: asBoolean(item.isActive, true),
        }))
      : defaults.definitions;

  const versions = Array.isArray(parsed.versions)
    ? parsed.versions
        .map((item) => {
          const steps = Array.isArray(item.steps)
            ? item.steps
                .map((stepItem, index) => normalizeStep(stepItem, index))
                .filter((stepItem): stepItem is WorkflowStepDefinition => Boolean(stepItem))
                .sort((left, right) => left.stepOrder - right.stepOrder)
            : [];
          if (steps.length === 0) return null;
          const status =
            item.status === "draft" || item.status === "published" || item.status === "retired"
              ? item.status
              : "draft";
          const normalized: WorkflowVersion = {
            id: asString(item.id, createId("wfv")),
            workflowDefinitionId: asString(item.workflowDefinitionId, COSTING_APPROVAL_WORKFLOW_ID),
            versionNumber: asNumber(item.versionNumber, 1),
            status,
            isDefault: asBoolean(item.isDefault, false),
            createdAt: asString(item.createdAt, nowIso()),
            steps,
          };
          const effectiveFrom = asString(item.effectiveFrom);
          const effectiveTo = asString(item.effectiveTo);
          const publishedAt = asString(item.publishedAt);
          if (effectiveFrom) normalized.effectiveFrom = effectiveFrom;
          if (effectiveTo) normalized.effectiveTo = effectiveTo;
          if (publishedAt) normalized.publishedAt = publishedAt;
          return normalized;
        })
        .filter((item): item is WorkflowVersion => item !== null)
    : [];

  if (versions.length === 0) return defaults;

  const hasDefault = versions.some((item) => item.isDefault && item.status === "published");
  if (!hasDefault) {
    const latestPublished = [...versions]
      .filter((item) => item.status === "published")
      .sort((left, right) => right.versionNumber - left.versionNumber)[0];
    if (latestPublished) latestPublished.isDefault = true;
  }

  return { definitions, versions, rules: [] };
}

export function loadWorkflowCatalog(): WorkflowCatalog {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined" || typeof localStorage === "undefined") {
    memoryCache = getDefaultWorkflowCatalog();
    return memoryCache;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = migrateLegacyCatalog() ?? getDefaultWorkflowCatalog();
      return memoryCache;
    }
    memoryCache = normalizeCatalog(JSON.parse(raw) as Partial<WorkflowCatalog>);
    return memoryCache;
  } catch {
    memoryCache = getDefaultWorkflowCatalog();
    return memoryCache;
  }
}

export function reloadWorkflowCatalog(): WorkflowCatalog {
  memoryCache = null;
  return loadWorkflowCatalog();
}

export function saveWorkflowCatalog(catalog: WorkflowCatalog): WorkflowCatalog {
  const next = normalizeCatalog(catalog);
  memoryCache = next;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WORKFLOW_CATALOG_UPDATED_EVENT));
  }
  return clone(next);
}

export function resetWorkflowCatalog(): WorkflowCatalog {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
  memoryCache = getDefaultWorkflowCatalog();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WORKFLOW_CATALOG_UPDATED_EVENT));
  }
  return clone(memoryCache);
}

export function getWorkflowDefinition(
  definitionId = COSTING_APPROVAL_WORKFLOW_ID,
  catalog = loadWorkflowCatalog(),
): WorkflowDefinition | null {
  return catalog.definitions.find((item) => item.id === definitionId) ?? null;
}

export function getWorkflowVersions(
  definitionId = COSTING_APPROVAL_WORKFLOW_ID,
  catalog = loadWorkflowCatalog(),
): WorkflowVersion[] {
  return catalog.versions
    .filter((item) => item.workflowDefinitionId === definitionId)
    .sort((left, right) => right.versionNumber - left.versionNumber);
}

export function getWorkflowVersion(
  versionId: string,
  catalog = loadWorkflowCatalog(),
): WorkflowVersion | null {
  return catalog.versions.find((item) => item.id === versionId) ?? null;
}

export function getWorkflowRules(
  definitionId = COSTING_APPROVAL_WORKFLOW_ID,
  catalog = loadWorkflowCatalog(),
): WorkflowRule[] {
  return catalog.rules
    .filter((item) => item.workflowDefinitionId === definitionId)
    .sort((left, right) => left.priority - right.priority);
}

export function getDraftVersion(
  definitionId = COSTING_APPROVAL_WORKFLOW_ID,
  catalog = loadWorkflowCatalog(),
): WorkflowVersion | null {
  return (
    getWorkflowVersions(definitionId, catalog).find((item) => item.status === "draft") ?? null
  );
}

export function createDraftFromVersion(sourceVersionId: string): WorkflowVersion {
  const catalog = loadWorkflowCatalog();
  const source = getWorkflowVersion(sourceVersionId, catalog);
  if (!source) throw new Error("Source workflow version was not found.");

  const existingDraft = getDraftVersion(source.workflowDefinitionId, catalog);
  const nextNumber =
    Math.max(0, ...catalog.versions
      .filter((item) => item.workflowDefinitionId === source.workflowDefinitionId)
      .map((item) => item.versionNumber)) + 1;

  const draft: WorkflowVersion = {
    id: existingDraft?.id ?? createId("wfv"),
    workflowDefinitionId: source.workflowDefinitionId,
    versionNumber: existingDraft?.versionNumber ?? nextNumber,
    status: "draft",
    isDefault: false,
    createdAt: existingDraft?.createdAt ?? nowIso(),
    steps: source.steps.map((item, index) => ({
      ...item,
      id: createId("wfs"),
      stepOrder: index + 1,
    })),
  };

  const versions = catalog.versions.filter((item) => item.id !== draft.id);
  versions.push(draft);
  saveWorkflowCatalog({ ...catalog, versions });
  return clone(draft);
}

export function saveDraftVersion(draft: WorkflowVersion): WorkflowVersion {
  if (draft.status !== "draft") {
    throw new Error("Only a draft version can be edited.");
  }
  if (draft.steps.length === 0) {
    throw new Error("A workflow version needs at least one approval step.");
  }
  if (draft.steps.some((item) => !item.approvalRoleId || !item.approvalRoleName.trim())) {
    throw new Error("Each step needs a role from role management.");
  }

  const catalog = loadWorkflowCatalog();
  const existing = getWorkflowVersion(draft.id, catalog);
  if (!existing || existing.status !== "draft") {
    throw new Error("Draft version was not found.");
  }

  const nextDraft: WorkflowVersion = {
    ...existing,
    ...draft,
    status: "draft",
    isDefault: false,
    steps: draft.steps.map((item, index) => ({
      ...item,
      id: item.id || createId("wfs"),
      stepOrder: index + 1,
      stepName: item.stepName || item.approvalRoleName,
      approvalType: item.approvalType || "sequential",
      minApprovals: item.minApprovals || 1,
    })),
  };

  saveWorkflowCatalog({
    ...catalog,
    versions: catalog.versions.map((item) => (item.id === nextDraft.id ? nextDraft : item)),
  });
  return clone(nextDraft);
}

export function publishWorkflowVersion(versionId: string, makeDefault = true): WorkflowCatalog {
  const catalog = loadWorkflowCatalog();
  const version = getWorkflowVersion(versionId, catalog);
  if (!version) throw new Error("Workflow version was not found.");
  if (version.status === "published" && version.isDefault) return catalog;
  if (version.steps.length === 0) {
    throw new Error("Publish requires at least one approval step.");
  }

  const publishedAt = nowIso();
  const versions = catalog.versions.map((item) => {
    if (item.id === version.id) {
      return {
        ...item,
        status: "published" as const,
        isDefault: makeDefault,
        publishedAt: item.publishedAt ?? publishedAt,
      };
    }
    if (
      makeDefault &&
      item.workflowDefinitionId === version.workflowDefinitionId &&
      item.isDefault
    ) {
      return {
        ...item,
        isDefault: false,
      };
    }
    return item;
  });

  return saveWorkflowCatalog({ ...catalog, versions });
}

export function applyWorkflowDraft(draft: WorkflowVersion): WorkflowCatalog {
  const saved = saveDraftVersion(draft);
  return publishWorkflowVersion(saved.id, true);
}

export function activateWorkflowVersion(versionId: string): WorkflowCatalog {
  const catalog = loadWorkflowCatalog();
  const version = getWorkflowVersion(versionId, catalog);
  if (!version) throw new Error("Workflow version was not found.");
  if (version.status === "draft") {
    throw new Error("Apply the draft to activate this new flow.");
  }
  if (version.steps.length === 0) {
    throw new Error("A workflow version needs at least one approval step.");
  }
  if (version.isDefault && version.status === "published") return catalog;

  const publishedAt = nowIso();
  const versions = catalog.versions.map((item) => {
    if (item.id === version.id) {
      return {
        ...item,
        status: "published" as const,
        isDefault: true,
        publishedAt: item.publishedAt ?? publishedAt,
      };
    }
    if (item.workflowDefinitionId === version.workflowDefinitionId && item.isDefault) {
      return { ...item, isDefault: false };
    }
    return item;
  });

  return saveWorkflowCatalog({ ...catalog, versions });
}

export function saveWorkflowRules(
  definitionId: string,
  rules: WorkflowRule[],
): WorkflowCatalog {
  const catalog = loadWorkflowCatalog();
  return saveWorkflowCatalog({
    ...catalog,
    rules: [
      ...catalog.rules.filter((item) => item.workflowDefinitionId !== definitionId),
      ...rules.map((item, index) => ({
        ...item,
        id: item.id || createId("wfr"),
        workflowDefinitionId: definitionId,
        priority: item.priority || (index + 1) * 10,
      })),
    ],
  });
}

export function createWorkflowStep(partial?: Partial<WorkflowStepDefinition>): WorkflowStepDefinition {
  return {
    id: createId("wfs"),
    stepOrder: 1,
    stepName: "",
    approvalRoleId: "",
    approvalRoleName: "",
    assigneeUserId: "",
    assigneeName: "",
    approvalType: "sequential",
    minApprovals: 1,
    ...partial,
  };
}

export function createWorkflowRule(definitionId: string, versionId: string): WorkflowRule {
  return {
    id: createId("wfr"),
    workflowDefinitionId: definitionId,
    name: "New rule",
    priority: 100,
    enabled: true,
    conditions: [{ field: "orderAmount", operator: "gte", value: 0 }],
    workflowVersionId: versionId,
  };
}
