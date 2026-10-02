import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { authActions as actions } from "@/app/store/authSlice";
import { http } from "@/services/apiClient";
import { mapLoginResponse } from "@/services/mappers/authMappers";

const loginEpic = createApiEpic({
  request: actions.loginRequest,
  success: actions.loginSuccess,
  failure: actions.loginFailure,
  concurrency: "merge",
  execute: async (credentials) =>
    mapLoginResponse(await http.post("/api/auth/login", credentials)),
});

export const authEpic = combineEpics(loginEpic);
