import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { periodCloseActions } from "@/features/period-close/store/periodCloseSlice";
import { periodCloseService } from "@/services";

const fetchDayListEpic = createAsyncEpic({
  request: periodCloseActions.fetchDayListRequest,
  success: periodCloseActions.fetchDayListSuccess,
  failure: periodCloseActions.fetchDayListFailure,
  handler: (filters) => periodCloseService.listDayPeriods(filters),
});

const fetchMonthListEpic = createAsyncEpic({
  request: periodCloseActions.fetchMonthListRequest,
  success: periodCloseActions.fetchMonthListSuccess,
  failure: periodCloseActions.fetchMonthListFailure,
  handler: (filters) => periodCloseService.listMonthlyPeriods(filters),
});

const fetchCurrentDayEpic = createAsyncEpic({
  request: periodCloseActions.fetchCurrentDayRequest,
  success: periodCloseActions.fetchCurrentDaySuccess,
  failure: periodCloseActions.fetchCurrentDayFailure,
  handler: (branchId) => periodCloseService.getCurrentDay(branchId),
});

const fetchDayWorkspaceEpic = createAsyncEpic({
  request: periodCloseActions.fetchDayWorkspaceRequest,
  success: periodCloseActions.fetchDayWorkspaceSuccess,
  failure: periodCloseActions.fetchDayWorkspaceFailure,
  handler: (id) => periodCloseService.getDayWorkspace(id),
});

const fetchCurrentMonthEpic = createAsyncEpic({
  request: periodCloseActions.fetchCurrentMonthRequest,
  success: periodCloseActions.fetchCurrentMonthSuccess,
  failure: periodCloseActions.fetchCurrentMonthFailure,
  handler: (branchId) => periodCloseService.getCurrentMonth(branchId),
});

const fetchMonthWorkspaceEpic = createAsyncEpic({
  request: periodCloseActions.fetchMonthWorkspaceRequest,
  success: periodCloseActions.fetchMonthWorkspaceSuccess,
  failure: periodCloseActions.fetchMonthWorkspaceFailure,
  handler: (id) => periodCloseService.getMonthWorkspace(id),
});

const fetchSettingsEpic = createAsyncEpic({
  request: periodCloseActions.fetchSettingsRequest,
  success: periodCloseActions.fetchSettingsSuccess,
  failure: periodCloseActions.fetchSettingsFailure,
  handler: (branchId) => periodCloseService.getSettings(branchId),
});

const fetchAdjustmentsEpic = createAsyncEpic({
  request: periodCloseActions.fetchAdjustmentsRequest,
  success: periodCloseActions.fetchAdjustmentsSuccess,
  failure: periodCloseActions.fetchAdjustmentsFailure,
  handler: (branchId) => periodCloseService.listAdjustments(branchId),
});

const runDayValidationEpic = createAsyncEpic({
  request: periodCloseActions.runDayValidationRequest,
  success: periodCloseActions.runDayValidationSuccess,
  failure: periodCloseActions.runDayValidationFailure,
  handler: (id) => periodCloseService.runDayValidation(id),
  mode: "merge",
});

const closeDayEpic = createAsyncEpic({
  request: periodCloseActions.closeDayRequest,
  success: periodCloseActions.closeDaySuccess,
  failure: periodCloseActions.closeDayFailure,
  handler: ({ id, options }) => periodCloseService.closeDay(id, options),
  mode: "merge",
});

const reopenDayEpic = createAsyncEpic({
  request: periodCloseActions.reopenDayRequest,
  success: periodCloseActions.reopenDaySuccess,
  failure: periodCloseActions.reopenDayFailure,
  handler: ({ id, input }) => periodCloseService.reopenDay(id, input),
  mode: "merge",
});

const runMonthValidationEpic = createAsyncEpic({
  request: periodCloseActions.runMonthValidationRequest,
  success: periodCloseActions.runMonthValidationSuccess,
  failure: periodCloseActions.runMonthValidationFailure,
  handler: (id) => periodCloseService.runMonthValidation(id),
  mode: "merge",
});

const closeMonthEpic = createAsyncEpic({
  request: periodCloseActions.closeMonthRequest,
  success: periodCloseActions.closeMonthSuccess,
  failure: periodCloseActions.closeMonthFailure,
  handler: (id) => periodCloseService.closeMonth(id),
  mode: "merge",
});

const reopenMonthEpic = createAsyncEpic({
  request: periodCloseActions.reopenMonthRequest,
  success: periodCloseActions.reopenMonthSuccess,
  failure: periodCloseActions.reopenMonthFailure,
  handler: ({ id, input }) => periodCloseService.reopenMonth(id, input),
  mode: "merge",
});

const createAdjustmentEpic = createAsyncEpic({
  request: periodCloseActions.createAdjustmentRequest,
  success: periodCloseActions.createAdjustmentSuccess,
  failure: periodCloseActions.createAdjustmentFailure,
  handler: (input) => periodCloseService.createAdjustment(input),
  mode: "merge",
});

export const periodCloseEpic = combineEpics(
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
