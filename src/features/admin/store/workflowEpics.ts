import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { workflowActions as actions } from "@/features/admin/store/workflowSlice";
import { http } from "@/services/apiClient";
import { asRecord } from "@/services/mappers/common";
import { mapCatalog } from "@/services/mappers/workflowMappers";

const fetchCatalogEpic = createApiEpic({
  request: actions.fetchCatalogRequest,
  success: actions.fetchCatalogSuccess,
  failure: actions.fetchCatalogFailure,
  execute: async () =>
    mapCatalog(asRecord(await http.get("/api/workflows/catalog"))),
});

const createDraftEpic = createApiEpic({
  request: actions.createDraftRequest,
  success: actions.createDraftSuccess,
  failure: actions.createDraftFailure,
  concurrency: "merge",
  execute: async (versionId) =>
    mapCatalog(
      asRecord(await http.post(`/api/workflows/versions/${versionId}/draft`)),
    ),
});

const saveDraftEpic = createApiEpic({
  request: actions.saveDraftRequest,
  success: actions.saveDraftSuccess,
  failure: actions.saveDraftFailure,
  concurrency: "merge",
  execute: async ({ id, steps }) =>
    mapCatalog(
      asRecord(
        await http.post(`/api/workflows/versions/${id}/save`, { steps }),
      ),
    ),
});

const applyDraftEpic = createApiEpic({
  request: actions.applyDraftRequest,
  success: actions.applyDraftSuccess,
  failure: actions.applyDraftFailure,
  concurrency: "merge",
  execute: async ({ id, steps }) =>
    mapCatalog(
      asRecord(
        await http.post(`/api/workflows/versions/${id}/apply`, { steps }),
      ),
    ),
});

const activateEpic = createApiEpic({
  request: actions.activateRequest,
  success: actions.activateSuccess,
  failure: actions.activateFailure,
  concurrency: "merge",
  execute: async (versionId) =>
    mapCatalog(
      asRecord(await http.post(`/api/workflows/versions/${versionId}/activate`)),
    ),
});

const deleteVersionEpic = createApiEpic({
  request: actions.deleteVersionRequest,
  success: actions.deleteVersionSuccess,
  failure: actions.deleteVersionFailure,
  concurrency: "merge",
  execute: async (versionId) =>
    mapCatalog(asRecord(await http.delete(`/api/workflows/versions/${versionId}`))),
});

const resetEpic = createApiEpic({
  request: actions.resetRequest,
  success: actions.resetSuccess,
  failure: actions.resetFailure,
  concurrency: "merge",
  execute: async () =>
    mapCatalog(asRecord(await http.post("/api/workflows/catalog/reset"))),
});

export const workflowEpic = combineEpics(
  fetchCatalogEpic,
  createDraftEpic,
  saveDraftEpic,
  applyDraftEpic,
  activateEpic,
  deleteVersionEpic,
  resetEpic,
);
