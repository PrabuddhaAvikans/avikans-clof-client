import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { periodCloseActions } from "@/features/period-close/store/periodCloseSlice";
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
import { DEFAULT_BRANCH_ID } from "@/lib/period-close/constants";

export function useCurrentDayClose(branchId = DEFAULT_BRANCH_ID) {
  return useEpicQuery<string | undefined, DayCloseWorkspace>({
    arg: branchId,
    getKey: () => "current",
    request: periodCloseActions.fetchCurrentDayRequest,
    selectEntry: (state, key) => state.periodClose.dayWorkspaces[key],
  });
}

export function useDayCloseWorkspace(periodId: string) {
  return useEpicQuery<string, DayCloseWorkspace>({
    arg: periodId,
    enabled: Boolean(periodId),
    getKey: (value) => value,
    request: periodCloseActions.fetchDayWorkspaceRequest,
    selectEntry: (state, key) => state.periodClose.dayWorkspaces[key],
  });
}

export function useCurrentMonthClose(branchId = DEFAULT_BRANCH_ID) {
  return useEpicQuery<string | undefined, MonthlyCloseWorkspace>({
    arg: branchId,
    getKey: () => "current",
    request: periodCloseActions.fetchCurrentMonthRequest,
    selectEntry: (state, key) => state.periodClose.monthWorkspaces[key],
  });
}

export function useMonthCloseWorkspace(periodId: string) {
  return useEpicQuery<string, MonthlyCloseWorkspace>({
    arg: periodId,
    enabled: Boolean(periodId),
    getKey: (value) => value,
    request: periodCloseActions.fetchMonthWorkspaceRequest,
    selectEntry: (state, key) => state.periodClose.monthWorkspaces[key],
  });
}

export function useBusinessPeriods(filters: BusinessPeriodListFilters) {
  return useEpicQuery<BusinessPeriodListFilters, PaginatedResponse<BusinessPeriod>>({
    arg: filters,
    request: periodCloseActions.fetchDayListRequest,
    selectEntry: (state, key) => state.periodClose.dayLists[key],
  });
}

export function useMonthlyPeriods(filters: MonthlyPeriodListFilters) {
  return useEpicQuery<MonthlyPeriodListFilters, PaginatedResponse<MonthlyPeriod>>({
    arg: filters,
    request: periodCloseActions.fetchMonthListRequest,
    selectEntry: (state, key) => state.periodClose.monthLists[key],
  });
}

export function usePeriodCloseSettings(branchId = DEFAULT_BRANCH_ID) {
  return useEpicQuery<string | undefined, PeriodCloseSettings>({
    arg: branchId,
    getKey: () => "settings",
    request: periodCloseActions.fetchSettingsRequest,
    selectEntry: (state, key) => state.periodClose.settings[key],
  });
}

export function usePeriodAdjustments(branchId = DEFAULT_BRANCH_ID) {
  return useEpicQuery<string | undefined, PeriodAdjustment[]>({
    arg: branchId,
    getKey: () => "adjustments",
    request: periodCloseActions.fetchAdjustmentsRequest,
    selectEntry: (state, key) => state.periodClose.adjustments[key],
  });
}

export function useRunDayValidation() {
  return useEpicMutation<string, DayCloseWorkspace>({
    request: periodCloseActions.runDayValidationRequest,
    selectMutation: (state: RootState) => state.periodClose.runDayValidation,
  });
}

export function useCloseDay() {
  return useEpicMutation<{ id: string; options?: CloseDayOptions }, CloseDayResult>({
    request: periodCloseActions.closeDayRequest,
    selectMutation: (state: RootState) => state.periodClose.closeDay,
  });
}

export function useReopenDay() {
  return useEpicMutation<
    { id: string; input: ReopenPeriodInput },
    BusinessPeriod
  >({
    request: periodCloseActions.reopenDayRequest,
    selectMutation: (state: RootState) => state.periodClose.reopenDay,
  });
}

export function useRunMonthValidation() {
  return useEpicMutation<string, MonthlyCloseWorkspace>({
    request: periodCloseActions.runMonthValidationRequest,
    selectMutation: (state: RootState) => state.periodClose.runMonthValidation,
  });
}

export function useCloseMonth() {
  return useEpicMutation<string, CloseMonthResult>({
    request: periodCloseActions.closeMonthRequest,
    selectMutation: (state: RootState) => state.periodClose.closeMonth,
  });
}

export function useReopenMonth() {
  return useEpicMutation<{ id: string; input: ReopenPeriodInput }, MonthlyPeriod>({
    request: periodCloseActions.reopenMonthRequest,
    selectMutation: (state: RootState) => state.periodClose.reopenMonth,
  });
}

export function useCreatePeriodAdjustment() {
  return useEpicMutation<CreatePeriodAdjustmentInput, PeriodAdjustment>({
    request: periodCloseActions.createAdjustmentRequest,
    selectMutation: (state: RootState) => state.periodClose.createAdjustment,
  });
}
