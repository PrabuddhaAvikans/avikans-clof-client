import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import type { RootState } from "@/app/store";
import type { ApplyWorkflowDraftArg } from "@/features/admin/store/workflowSlice";
import { workflowActions } from "@/features/admin/store/workflowSlice";
import type { WorkflowCatalog } from "@/types/workflow";

export function useCreateWorkflowDraft() {
  return useEpicMutation<string, WorkflowCatalog>({
    request: workflowActions.createDraftRequest,
    selectMutation: (state: RootState) => state.workflow.createDraft,
  });
}

export function useSaveWorkflowDraft() {
  return useEpicMutation<ApplyWorkflowDraftArg, WorkflowCatalog>({
    request: workflowActions.saveDraftRequest,
    selectMutation: (state: RootState) => state.workflow.saveDraft,
  });
}

export function useApplyWorkflowDraft() {
  return useEpicMutation<ApplyWorkflowDraftArg, WorkflowCatalog>({
    request: workflowActions.applyDraftRequest,
    selectMutation: (state: RootState) => state.workflow.applyDraft,
  });
}

export function useActivateWorkflowVersion() {
  return useEpicMutation<string, WorkflowCatalog>({
    request: workflowActions.activateRequest,
    selectMutation: (state: RootState) => state.workflow.activate,
  });
}

export function useDeleteWorkflowVersion() {
  return useEpicMutation<string, WorkflowCatalog>({
    request: workflowActions.deleteVersionRequest,
    selectMutation: (state: RootState) => state.workflow.deleteVersion,
  });
}

export function useResetWorkflowCatalog() {
  return useEpicMutation<void, WorkflowCatalog>({
    request: workflowActions.resetRequest,
    selectMutation: (state: RootState) => state.workflow.reset,
  });
}
