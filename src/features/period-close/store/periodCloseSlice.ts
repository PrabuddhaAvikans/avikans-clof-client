import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import {
  createMutationEntry,
  emptyCache,
  invalidateEntries,
  setEntryFailure,
  setEntryLoading,
  setEntrySuccess,
  setMutationFailure,
  setMutationLoading,
  setMutationSuccess,
} from "@/app/store/async/reducers";
import type { AsyncEntry, MutationEntry } from "@/app/store/async/types";
import type {
  BusinessPeriodListFilters,
  CloseDayOptions,
  MonthlyPeriodListFilters,
} from "@/services/interfaces/periodCloseService";
import type {
  BusinessPeriod,
  CloseDayResult,
  CloseMonthResult,
  CreatePeriodAdjustmentInput,
  DayCloseWorkspace,
  MonthlyCloseWorkspace,
  MonthlyPeriod,
  PeriodAdjustment,
  PeriodCloseSettings,
  ReopenPeriodInput,
} from "@/types/period-close";
import type { PaginatedResponse } from "@/types/common";

type DayListData = PaginatedResponse<BusinessPeriod>;
type MonthListData = PaginatedResponse<MonthlyPeriod>;
type ReopenArg = { id: string; input: ReopenPeriodInput };
type CloseDayArg = { id: string; options?: CloseDayOptions };

export type PeriodCloseState = {
  dayLists: Record<string, AsyncEntry<DayListData>>;
  monthLists: Record<string, AsyncEntry<MonthListData>>;
  dayWorkspaces: Record<string, AsyncEntry<DayCloseWorkspace>>;
  monthWorkspaces: Record<string, AsyncEntry<MonthlyCloseWorkspace>>;
  settings: Record<string, AsyncEntry<PeriodCloseSettings>>;
  adjustments: Record<string, AsyncEntry<PeriodAdjustment[]>>;
  runDayValidation: MutationEntry;
  closeDay: MutationEntry;
  reopenDay: MutationEntry;
  runMonthValidation: MutationEntry;
  closeMonth: MutationEntry;
  reopenMonth: MutationEntry;
  createAdjustment: MutationEntry;
};

const initialState: PeriodCloseState = {
  dayLists: emptyCache(),
  monthLists: emptyCache(),
  dayWorkspaces: emptyCache(),
  monthWorkspaces: emptyCache(),
  settings: emptyCache(),
  adjustments: emptyCache(),
  runDayValidation: createMutationEntry(),
  closeDay: createMutationEntry(),
  reopenDay: createMutationEntry(),
  runMonthValidation: createMutationEntry(),
  closeMonth: createMutationEntry(),
  reopenMonth: createMutationEntry(),
  createAdjustment: createMutationEntry(),
};

function upsertDayWorkspace(
  state: PeriodCloseState,
  workspace: DayCloseWorkspace,
  keys: string[] = ["current", workspace.period.id],
): void {
  for (const key of keys) {
    state.dayWorkspaces[key] = {
      data: workspace,
      status: "succeeded",
      error: null,
    };
  }
}

function upsertMonthWorkspace(
  state: PeriodCloseState,
  workspace: MonthlyCloseWorkspace,
  keys: string[] = ["current", workspace.period.id],
): void {
  for (const key of keys) {
    state.monthWorkspaces[key] = {
      data: workspace,
      status: "succeeded",
      error: null,
    };
  }
}

const periodCloseSlice = createSlice({
  name: "periodClose",
  initialState,
  reducers: {
    fetchDayListRequest(
      state,
      action: PayloadAction<RequestPayload<BusinessPeriodListFilters>>,
    ) {
      if (action.payload.key) setEntryLoading(state.dayLists, action.payload.key);
    },
    fetchDayListSuccess(state, action: PayloadAction<SuccessPayload<DayListData>>) {
      setEntrySuccess(state.dayLists, action);
    },
    fetchDayListFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.dayLists, action);
    },

    fetchMonthListRequest(
      state,
      action: PayloadAction<RequestPayload<MonthlyPeriodListFilters>>,
    ) {
      if (action.payload.key) setEntryLoading(state.monthLists, action.payload.key);
    },
    fetchMonthListSuccess(
      state,
      action: PayloadAction<SuccessPayload<MonthListData>>,
    ) {
      setEntrySuccess(state.monthLists, action);
    },
    fetchMonthListFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.monthLists, action);
    },

    fetchCurrentDayRequest(
      state,
      action: PayloadAction<RequestPayload<string | undefined>>,
    ) {
      if (action.payload.key) setEntryLoading(state.dayWorkspaces, action.payload.key);
    },
    fetchCurrentDaySuccess(
      state,
      action: PayloadAction<SuccessPayload<DayCloseWorkspace>>,
    ) {
      setEntrySuccess(state.dayWorkspaces, action);
      upsertDayWorkspace(state, action.payload.data);
    },
    fetchCurrentDayFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.dayWorkspaces, action);
    },

    fetchDayWorkspaceRequest(state, action: PayloadAction<RequestPayload<string>>) {
      if (action.payload.key) setEntryLoading(state.dayWorkspaces, action.payload.key);
    },
    fetchDayWorkspaceSuccess(
      state,
      action: PayloadAction<SuccessPayload<DayCloseWorkspace>>,
    ) {
      setEntrySuccess(state.dayWorkspaces, action);
      upsertDayWorkspace(state, action.payload.data, [action.payload.data.period.id]);
    },
    fetchDayWorkspaceFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.dayWorkspaces, action);
    },

    fetchCurrentMonthRequest(
      state,
      action: PayloadAction<RequestPayload<string | undefined>>,
    ) {
      if (action.payload.key) setEntryLoading(state.monthWorkspaces, action.payload.key);
    },
    fetchCurrentMonthSuccess(
      state,
      action: PayloadAction<SuccessPayload<MonthlyCloseWorkspace>>,
    ) {
      setEntrySuccess(state.monthWorkspaces, action);
      upsertMonthWorkspace(state, action.payload.data);
    },
    fetchCurrentMonthFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.monthWorkspaces, action);
    },

    fetchMonthWorkspaceRequest(
      state,
      action: PayloadAction<RequestPayload<string>>,
    ) {
      if (action.payload.key) setEntryLoading(state.monthWorkspaces, action.payload.key);
    },
    fetchMonthWorkspaceSuccess(
      state,
      action: PayloadAction<SuccessPayload<MonthlyCloseWorkspace>>,
    ) {
      setEntrySuccess(state.monthWorkspaces, action);
      upsertMonthWorkspace(state, action.payload.data, [
        action.payload.data.period.id,
      ]);
    },
    fetchMonthWorkspaceFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.monthWorkspaces, action);
    },

    fetchSettingsRequest(
      state,
      action: PayloadAction<RequestPayload<string | undefined>>,
    ) {
      if (action.payload.key) setEntryLoading(state.settings, action.payload.key);
    },
    fetchSettingsSuccess(
      state,
      action: PayloadAction<SuccessPayload<PeriodCloseSettings>>,
    ) {
      setEntrySuccess(state.settings, action);
    },
    fetchSettingsFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.settings, action);
    },

    fetchAdjustmentsRequest(
      state,
      action: PayloadAction<RequestPayload<string | undefined>>,
    ) {
      if (action.payload.key) setEntryLoading(state.adjustments, action.payload.key);
    },
    fetchAdjustmentsSuccess(
      state,
      action: PayloadAction<SuccessPayload<PeriodAdjustment[]>>,
    ) {
      setEntrySuccess(state.adjustments, action);
    },
    fetchAdjustmentsFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.adjustments, action);
    },

    runDayValidationRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.runDayValidation);
    },
    runDayValidationSuccess(
      state,
      action: PayloadAction<SuccessPayload<DayCloseWorkspace>>,
    ) {
      setMutationSuccess(state.runDayValidation);
      upsertDayWorkspace(state, action.payload.data);
    },
    runDayValidationFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.runDayValidation, action);
    },

    closeDayRequest(state, _action: PayloadAction<RequestPayload<CloseDayArg>>) {
      setMutationLoading(state.closeDay);
    },
    closeDaySuccess(state, action: PayloadAction<SuccessPayload<CloseDayResult>>) {
      setMutationSuccess(state.closeDay);
      invalidateEntries(state.dayLists);
      invalidateEntries(state.dayWorkspaces);
      invalidateEntries(state.monthWorkspaces);
    },
    closeDayFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.closeDay, action);
    },

    reopenDayRequest(state, _action: PayloadAction<RequestPayload<ReopenArg>>) {
      setMutationLoading(state.reopenDay);
    },
    reopenDaySuccess(state, _action: PayloadAction<SuccessPayload<BusinessPeriod>>) {
      setMutationSuccess(state.reopenDay);
      invalidateEntries(state.dayLists);
      invalidateEntries(state.dayWorkspaces);
    },
    reopenDayFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.reopenDay, action);
    },

    runMonthValidationRequest(
      state,
      _action: PayloadAction<RequestPayload<string>>,
    ) {
      setMutationLoading(state.runMonthValidation);
    },
    runMonthValidationSuccess(
      state,
      action: PayloadAction<SuccessPayload<MonthlyCloseWorkspace>>,
    ) {
      setMutationSuccess(state.runMonthValidation);
      upsertMonthWorkspace(state, action.payload.data);
    },
    runMonthValidationFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.runMonthValidation, action);
    },

    closeMonthRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.closeMonth);
    },
    closeMonthSuccess(
      state,
      action: PayloadAction<SuccessPayload<CloseMonthResult>>,
    ) {
      setMutationSuccess(state.closeMonth);
      invalidateEntries(state.monthLists);
      invalidateEntries(state.monthWorkspaces);
      invalidateEntries(state.dayWorkspaces);
    },
    closeMonthFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.closeMonth, action);
    },

    reopenMonthRequest(state, _action: PayloadAction<RequestPayload<ReopenArg>>) {
      setMutationLoading(state.reopenMonth);
    },
    reopenMonthSuccess(
      state,
      _action: PayloadAction<SuccessPayload<MonthlyPeriod>>,
    ) {
      setMutationSuccess(state.reopenMonth);
      invalidateEntries(state.monthLists);
      invalidateEntries(state.monthWorkspaces);
    },
    reopenMonthFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.reopenMonth, action);
    },

    createAdjustmentRequest(
      state,
      _action: PayloadAction<RequestPayload<CreatePeriodAdjustmentInput>>,
    ) {
      setMutationLoading(state.createAdjustment);
    },
    createAdjustmentSuccess(
      state,
      _action: PayloadAction<SuccessPayload<PeriodAdjustment>>,
    ) {
      setMutationSuccess(state.createAdjustment);
      invalidateEntries(state.adjustments);
      invalidateEntries(state.dayWorkspaces);
    },
    createAdjustmentFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.createAdjustment, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.dayLists);
      invalidateEntries(state.monthLists);
      invalidateEntries(state.dayWorkspaces);
      invalidateEntries(state.monthWorkspaces);
      invalidateEntries(state.settings);
      invalidateEntries(state.adjustments);
    },
  },
});

export const periodCloseActions = periodCloseSlice.actions;
export default periodCloseSlice.reducer;
