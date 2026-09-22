import type { ApprovalLevel, CostingRequest } from "@/types/costing";
import type { SalesOrder } from "@/types/sales-order";
import type { WorkflowInstance, WorkflowSelectionContext } from "@/types/workflow";
import { COSTING_APPROVAL_WORKFLOW_ID } from "@/lib/workflow/catalog";
import {
  freezeExistingApprovalLevels,
  getWorkflowInstance,
  getWorkflowInstanceBySubject,
  instanceStepsToApprovalLevels,
  selectWorkflowVersion,
  startFirstWorkflowStep,
  startWorkflowInstance,
} from "@/lib/workflow/engine";

export function costingWorkflowContext(
  request: Pick<CostingRequest, "proposedPrice" | "quotationId">,
  order?: SalesOrder,
): WorkflowSelectionContext {
  const subtotal = order?.subtotal ?? 0;
  const discountAmount = order?.discountAmount ?? 0;
  const hasCustom = order?.lineItems.some((item) => item.isCustomized) ?? false;

  return {
    orderAmount: request.proposedPrice || order?.totalAmount || 0,
    orderPriority: order?.priority,
    discountPercent: subtotal > 0 ? (discountAmount / subtotal) * 100 : 0,
    orderKind: hasCustom ? "custom" : "standard",
    quotationType: request.quotationId || order?.quotationId ? "from_quotation" : "direct",
  };
}

export function applyWorkflowInstanceToCosting(
  request: CostingRequest,
  instance: WorkflowInstance,
): CostingRequest {
  return {
    ...request,
    workflowDefinitionId: instance.workflowDefinitionId,
    workflowVersionId: instance.workflowVersionId,
    workflowInstanceId: instance.id,
    workflowVersionNumber: instance.workflowVersionNumber,
    workflowName: instance.workflowDefinitionName,
    approvalLevels: instanceStepsToApprovalLevels(instance),
  };
}

export function previewCostingApprovalLevels(
  request: Pick<CostingRequest, "proposedPrice" | "quotationId">,
  order?: SalesOrder,
): ApprovalLevel[] {
  const version = selectWorkflowVersion(
    COSTING_APPROVAL_WORKFLOW_ID,
    costingWorkflowContext(request, order),
  );
  return version.steps.map((step, index) => ({
    id: `preview-${step.id}`,
    role: step.approvalRoleName,
    assigneeName: step.assigneeName?.trim() || "Unassigned",
    status: index === 0 ? "waiting" : "waiting",
  }));
}

export function ensureCostingWorkflow(
  request: CostingRequest,
  options: {
    order?: SalesOrder;
    startFirstStep: boolean;
    allApproved?: boolean;
  },
): CostingRequest {
  const existingInstance =
    (request.workflowInstanceId ? getWorkflowInstance(request.workflowInstanceId) : null) ??
    getWorkflowInstanceBySubject("costing_request", request.id);

  if (existingInstance) {
    let instance = existingInstance;
    if (options.startFirstStep && instance.status === "not_started") {
      instance = startFirstWorkflowStep(instance.id);
    }
    return applyWorkflowInstanceToCosting(request, instance);
  }

  const startedSnapshot = request.approvalLevels.some(
    (level) =>
      level.status === "pending" || level.status === "approved" || level.status === "rejected",
  );

  if (startedSnapshot) {
    return applyWorkflowInstanceToCosting(
      request,
      freezeExistingApprovalLevels(request.id, request.approvalLevels, {
        definitionId: request.workflowDefinitionId,
        definitionName: request.workflowName,
        versionId: request.workflowVersionId,
        versionNumber: request.workflowVersionNumber,
      }),
    );
  }

  if (!options.startFirstStep && !options.allApproved) {
    return {
      ...request,
      workflowDefinitionId: undefined,
      workflowVersionId: undefined,
      workflowInstanceId: undefined,
      workflowVersionNumber: undefined,
      workflowName: undefined,
      approvalLevels: previewCostingApprovalLevels(request, options.order),
    };
  }

  const instance = startWorkflowInstance({
    subjectType: "costing_request",
    subjectId: request.id,
    context: costingWorkflowContext(request, options.order),
    startFirstStep: options.startFirstStep,
    allApproved: options.allApproved,
  });
  return applyWorkflowInstanceToCosting(request, instance);
}
