import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { systemSettingsActions as actions } from "@/features/admin/store/systemSettingsSlice";
import { http } from "@/services/apiClient";
import { asRecord } from "@/services/mappers/common";
import { mapSystemSettings } from "@/services/mappers/systemSettingsMappers";

const fetchEpic = createApiEpic({
  request: actions.fetchRequest,
  success: actions.fetchSuccess,
  failure: actions.fetchFailure,
  execute: async () =>
    mapSystemSettings(asRecord(await http.get("/api/system-settings"))),
});

const updateEpic = createApiEpic({
  request: actions.updateRequest,
  success: actions.updateSuccess,
  failure: actions.updateFailure,
  concurrency: "merge",
  execute: async (partial) =>
    mapSystemSettings(asRecord(await http.put("/api/system-settings", partial))),
});

export const systemSettingsEpic = combineEpics(fetchEpic, updateEpic);
