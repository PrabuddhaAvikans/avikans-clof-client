import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import {
  createMutationEntry,
  emptyCache,
  setEntryFailure,
  setEntryLoading,
  setEntrySuccess,
  setMutationFailure,
  setMutationLoading,
  setMutationSuccess,
} from "@/app/store/async/reducers";
import type { AsyncEntry, MutationEntry } from "@/app/store/async/types";
import type { WorkflowCatalog, WorkflowStepDefinition } from "@/types/workflow";

export const WORKFLOW_CATALOG_KEY = "workflow-catalog";

export type ApplyWorkflowDraftArg = {
  id: string;
  steps: WorkflowStepDefinition[];
};

export type WorkflowState = {
  catalog: Record<string, AsyncEntry<WorkflowCatalog>>;
  createDraft: MutationEntry;
  saveDraft: MutationEntry;
  applyDraft: MutationEntry;
  activate: MutationEntry;
  deleteVersion: MutationEntry;
  reset: MutationEntry;
};

const initialState: WorkflowState = {
  catalog: emptyCache(),
  createDraft: createMutationEntry(),
  saveDraft: createMutationEntry(),
  applyDraft: createMutationEntry(),
  activate: createMutationEntry(),
  deleteVersion: createMutationEntry(),
  reset: createMutationEntry(),
};

function rememberCatalog(
  state: WorkflowState,
  action: PayloadAction<SuccessPayload<WorkflowCatalog>>,
) {
  state.catalog[WORKFLOW_CATALOG_KEY] = {
    data: action.payload.data,
    status: "succeeded",
    error: null,
  };
}

const workflowSlice = createSlice({
  name: "workflow",
  initialState,
  reducers: {
    fetchCatalogRequest(state, action: PayloadAction<RequestPayload<void>>) {
      if (action.payload.key) setEntryLoading(state.catalog, action.payload.key);
    },
    fetchCatalogSuccess(
      state,
      action: PayloadAction<SuccessPayload<WorkflowCatalog>>,
    ) {
      setEntrySuccess(state.catalog, action);
    },
    fetchCatalogFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.catalog, action);
    },

    createDraftRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.createDraft);
    },
    createDraftSuccess(
      state,
      action: PayloadAction<SuccessPayload<WorkflowCatalog>>,
    ) {
      setMutationSuccess(state.createDraft);
      rememberCatalog(state, action);
    },
    createDraftFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.createDraft, action);
    },

    saveDraftRequest(
      state,
      _action: PayloadAction<RequestPayload<ApplyWorkflowDraftArg>>,
    ) {
      setMutationLoading(state.saveDraft);
    },
    saveDraftSuccess(
      state,
      action: PayloadAction<SuccessPayload<WorkflowCatalog>>,
    ) {
      setMutationSuccess(state.saveDraft);
      rememberCatalog(state, action);
    },
    saveDraftFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.saveDraft, action);
    },

    applyDraftRequest(
      state,
      _action: PayloadAction<RequestPayload<ApplyWorkflowDraftArg>>,
    ) {
      setMutationLoading(state.applyDraft);
    },
    applyDraftSuccess(
      state,
      action: PayloadAction<SuccessPayload<WorkflowCatalog>>,
    ) {
      setMutationSuccess(state.applyDraft);
      rememberCatalog(state, action);
    },
    applyDraftFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.applyDraft, action);
    },

    activateRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.activate);
    },
    activateSuccess(
      state,
      action: PayloadAction<SuccessPayload<WorkflowCatalog>>,
    ) {
      setMutationSuccess(state.activate);
      rememberCatalog(state, action);
    },
    activateFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.activate, action);
    },

    deleteVersionRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.deleteVersion);
    },
    deleteVersionSuccess(
      state,
      action: PayloadAction<SuccessPayload<WorkflowCatalog>>,
    ) {
      setMutationSuccess(state.deleteVersion);
      rememberCatalog(state, action);
    },
    deleteVersionFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.deleteVersion, action);
    },

    resetRequest(state, _action: PayloadAction<RequestPayload<void>>) {
      setMutationLoading(state.reset);
    },
    resetSuccess(state, action: PayloadAction<SuccessPayload<WorkflowCatalog>>) {
      setMutationSuccess(state.reset);
      rememberCatalog(state, action);
    },
    resetFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.reset, action);
    },
  },
});

export const workflowActions = workflowSlice.actions;
export default workflowSlice.reducer;
