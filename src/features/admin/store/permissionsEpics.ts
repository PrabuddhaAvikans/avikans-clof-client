import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { permissionsActions as actions } from "@/features/admin/store/permissionsSlice";
import { http } from "@/services/apiClient";
import { asRecord } from "@/services/mappers/common";
import { mapCatalog } from "@/services/mappers/permissionMappers";

const fetchCatalogEpic = createApiEpic({
  request: actions.fetchCatalogRequest,
  success: actions.fetchCatalogSuccess,
  failure: actions.fetchCatalogFailure,
  execute: async () => mapCatalog(asRecord(await http.get("/api/permissions"))),
});

export const permissionsEpic = combineEpics(fetchCatalogEpic);
