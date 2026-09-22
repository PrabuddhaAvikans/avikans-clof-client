export type WorkflowModule = "costing";

export type WorkflowVersionStatus = "draft" | "published" | "retired";

export type WorkflowInstanceStatus =
  | "not_started"
  | "in_progress"
  | "approved"
  | "rejected"
  | "cancelled"
  | "changes_requested";

export type WorkflowStepStatus = "waiting" | "pending" | "approved" | "rejected" | "skipped";

export type WorkflowApprovalType = "sequential" | "any" | "all";

export type WorkflowConditionField =
  | "orderAmount"
  | "customerType"
  | "productType"
  | "quotationType"
  | "department"
  | "branch"
  | "orderPriority"
  | "discountPercent"
  | "orderKind";

export type WorkflowConditionOperator = "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "in";

export type WorkflowSubjectType = "costing_request";

export interface WorkflowCondition {
  field: WorkflowConditionField;
  operator: WorkflowConditionOperator;
  value: string | number;
}

export interface WorkflowStepDefinition {
  id: string;
  stepOrder: number;
  stepName: string;
  approvalRoleId: string;
  approvalRoleName: string;
  assigneeUserId?: string;
  assigneeName?: string;
  approvalType: WorkflowApprovalType;
  minApprovals: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  module: WorkflowModule;
  isActive: boolean;
}

export interface WorkflowVersion {
  id: string;
  workflowDefinitionId: string;
  versionNumber: number;
  status: WorkflowVersionStatus;
  isDefault: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdAt: string;
  publishedAt?: string;
  steps: WorkflowStepDefinition[];
}

export interface WorkflowRule {
  id: string;
  workflowDefinitionId: string;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: WorkflowCondition[];
  workflowVersionId: string;
}

export interface WorkflowCatalog {
  definitions: WorkflowDefinition[];
  versions: WorkflowVersion[];
  rules: WorkflowRule[];
}

export interface WorkflowInstanceStep {
  id: string;
  stepDefinitionId: string;
  stepOrder: number;
  stepName: string;
  roleId?: string;
  roleName: string;
  assigneeUserId?: string;
  assigneeName: string;
  status: WorkflowStepStatus;
  startedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  remarks?: string;
}

export interface WorkflowInstance {
  id: string;
  subjectType: WorkflowSubjectType;
  subjectId: string;
  workflowDefinitionId: string;
  workflowDefinitionName: string;
  workflowVersionId: string;
  workflowVersionNumber: number;
  status: WorkflowInstanceStatus;
  currentStepOrder: number;
  startedAt: string;
  completedAt?: string;
  steps: WorkflowInstanceStep[];
}

export interface WorkflowSelectionContext {
  orderAmount: number;
  customerType?: string;
  productType?: string;
  quotationType?: string;
  department?: string;
  branch?: string;
  orderPriority?: string;
  discountPercent?: number;
  orderKind?: "custom" | "standard";
  at?: string;
}
