import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { endOfDayManagementActions as actions } from "@/features/end-of-day-management/store/endOfDayManagementSlice";
import { buildQuery, http } from "@/services/apiClient";
import { mapPaginatedResponse } from "@/services/mappers/common";
import { mapUnknown } from "@/services/mappers/endOfDayManagementMappers";
import type {
  BusinessPeriod,
  CloseDayResult,
  CloseMonthResult,
  DayCloseWorkspace,
  MonthlyCloseWorkspace,
  MonthlyPeriod,
  PeriodAdjustment,
  EndOfDayManagementSettings,
} from "@/types/end-of-day-management";

const BASE = "/api/end-of-day-management";

const fetchDayListEpic = createApiEpic({
  request: actions.fetchDayListRequest,
  success: actions.fetchDayListSuccess,
  failure: actions.fetchDayListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`${BASE}/days${buildQuery(filters)}`),
      (item) => mapUnknown<BusinessPeriod>(item),
    ),
});

const fetchMonthListEpic = createApiEpic({
  request: actions.fetchMonthListRequest,
  success: actions.fetchMonthListSuccess,
  failure: actions.fetchMonthListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(`${BASE}/months${buildQuery(filters)}`),
      (item) => mapUnknown<MonthlyPeriod>(item),
    ),
});

const fetchCurrentDayEpic = createApiEpic({
  request: actions.fetchCurrentDayRequest,
  success: actions.fetchCurrentDaySuccess,
  failure: actions.fetchCurrentDayFailure,
  execute: async (branchId) =>
    mapUnknown<DayCloseWorkspace>(
      await http.get(`${BASE}/days/current${buildQuery({ branchId })}`),
    ),
});

const fetchDayWorkspaceEpic = createApiEpic({
  request: actions.fetchDayWorkspaceRequest,
  success: actions.fetchDayWorkspaceSuccess,
  failure: actions.fetchDayWorkspaceFailure,
  execute: async (id) =>
    mapUnknown<DayCloseWorkspace>(await http.get(`${BASE}/days/${id}`)),
});

const fetchCurrentMonthEpic = createApiEpic({
  request: actions.fetchCurrentMonthRequest,
  success: actions.fetchCurrentMonthSuccess,
  failure: actions.fetchCurrentMonthFailure,
  execute: async (branchId) =>
    mapUnknown<MonthlyCloseWorkspace>(
      await http.get(`${BASE}/months/current${buildQuery({ branchId })}`),
    ),
});

const fetchMonthWorkspaceEpic = createApiEpic({
  request: actions.fetchMonthWorkspaceRequest,
  success: actions.fetchMonthWorkspaceSuccess,
  failure: actions.fetchMonthWorkspaceFailure,
  execute: async (id) =>
    mapUnknown<MonthlyCloseWorkspace>(await http.get(`${BASE}/months/${id}`)),
});

const fetchSettingsEpic = createApiEpic({
  request: actions.fetchSettingsRequest,
  success: actions.fetchSettingsSuccess,
  failure: actions.fetchSettingsFailure,
  execute: async (branchId) =>
    mapUnknown<EndOfDayManagementSettings>(
      await http.get(`${BASE}/settings${buildQuery({ branchId })}`),
    ),
});

const fetchAdjustmentsEpic = createApiEpic({
  request: actions.fetchAdjustmentsRequest,
  success: actions.fetchAdjustmentsSuccess,
  failure: actions.fetchAdjustmentsFailure,
  execute: async (branchId) =>
    mapUnknown<PeriodAdjustment[]>(
      await http.get(`${BASE}/adjustments${buildQuery({ branchId })}`),
    ),
});

const runDayValidationEpic = createApiEpic({
  request: actions.runDayValidationRequest,
  success: actions.runDayValidationSuccess,
  failure: actions.runDayValidationFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapUnknown<DayCloseWorkspace>(
      await http.post(`${BASE}/days/${id}/validate`, {}),
    ),
});

const closeDayEpic = createApiEpic({
  request: actions.closeDayRequest,
  success: actions.closeDaySuccess,
  failure: actions.closeDayFailure,
  concurrency: "merge",
  execute: async ({ id, options }) =>
    mapUnknown<CloseDayResult>(
      await http.post(`${BASE}/days/${id}/close`, options ?? {}),
    ),
});

const reopenDayEpic = createApiEpic({
  request: actions.reopenDayRequest,
  success: actions.reopenDaySuccess,
  failure: actions.reopenDayFailure,
  concurrency: "merge",
  execute: async ({ id, input }) =>
    mapUnknown<BusinessPeriod>(
      await http.post(`${BASE}/days/${id}/reopen`, input),
    ),
});

const runMonthValidationEpic = createApiEpic({
  request: actions.runMonthValidationRequest,
  success: actions.runMonthValidationSuccess,
  failure: actions.runMonthValidationFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapUnknown<MonthlyCloseWorkspace>(
      await http.post(`${BASE}/months/${id}/validate`),
    ),
});

const closeMonthEpic = createApiEpic({
  request: actions.closeMonthRequest,
  success: actions.closeMonthSuccess,
  failure: actions.closeMonthFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapUnknown<CloseMonthResult>(await http.post(`${BASE}/months/${id}/close`)),
});

const reopenMonthEpic = createApiEpic({
  request: actions.reopenMonthRequest,
  success: actions.reopenMonthSuccess,
  failure: actions.reopenMonthFailure,
  concurrency: "merge",
  execute: async ({ id, input }) =>
    mapUnknown<MonthlyPeriod>(
      await http.post(`${BASE}/months/${id}/reopen`, input),
    ),
});

const createAdjustmentEpic = createApiEpic({
  request: actions.createAdjustmentRequest,
  success: actions.createAdjustmentSuccess,
  failure: actions.createAdjustmentFailure,
  concurrency: "merge",
  execute: async (input) =>
    mapUnknown<PeriodAdjustment>(await http.post(`${BASE}/adjustments`, input)),
});

export const endOfDayManagementEpic = combineEpics(
  fetchDayListEpic,
  fetchMonthListEpic,
  fetchCurrentDayEpic,
  fetchDayWorkspaceEpic,
  fetchCurrentMonthEpic,
  fetchMonthWorkspaceEpic,
  fetchSettingsEpic,
  fetchAdjustmentsEpic,
  runDayValidationEpic,
  closeDayEpic,
  reopenDayEpic,
  runMonthValidationEpic,
  closeMonthEpic,
  reopenMonthEpic,
  createAdjustmentEpic,
);
