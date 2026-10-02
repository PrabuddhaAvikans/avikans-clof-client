import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { endOfDayManagementActions } from "@/features/end-of-day-management/store/endOfDayManagementSlice";
import type {
  BusinessPeriodListFilters,
  CloseDayCommand,
  MonthlyPeriodListFilters,
} from "@/services/interfaces/endOfDayManagementService";
import type {
  BusinessPeriod,
  CloseDayResult,
  CloseMonthResult,
  CreatePeriodAdjustmentInput,
  DayCloseWorkspace,
  MonthlyCloseWorkspace,
  MonthlyPeriod,
  PeriodAdjustment,
  EndOfDayManagementSettings,
  ReopenPeriodInput,
} from "@/types/end-of-day-management";
import type { PaginatedResponse } from "@/types/common";
import { DEFAULT_BRANCH_ID } from "@/lib/end-of-day-management/constants";

export function useCurrentDayClose(branchId = DEFAULT_BRANCH_ID) {
  return useEpicQuery<string | undefined, DayCloseWorkspace>({
    arg: branchId,
    getKey: () => "current",
    request: endOfDayManagementActions.fetchCurrentDayRequest,
    selectEntry: (state, key) => state.endOfDayManagement.dayWorkspaces[key],
  });
}

export function useDayCloseWorkspace(periodId: string) {
  return useEpicQuery<string, DayCloseWorkspace>({
    arg: periodId,
    enabled: Boolean(periodId),
    getKey: (value) => value,
    request: endOfDayManagementActions.fetchDayWorkspaceRequest,
    selectEntry: (state, key) => state.endOfDayManagement.dayWorkspaces[key],
  });
}

export function useCurrentMonthClose(branchId = DEFAULT_BRANCH_ID) {
  return useEpicQuery<string | undefined, MonthlyCloseWorkspace>({
    arg: branchId,
    getKey: () => "current",
    request: endOfDayManagementActions.fetchCurrentMonthRequest,
    selectEntry: (state, key) => state.endOfDayManagement.monthWorkspaces[key],
  });
}

export function useMonthCloseWorkspace(periodId: string) {
  return useEpicQuery<string, MonthlyCloseWorkspace>({
    arg: periodId,
    enabled: Boolean(periodId),
    getKey: (value) => value,
    request: endOfDayManagementActions.fetchMonthWorkspaceRequest,
    selectEntry: (state, key) => state.endOfDayManagement.monthWorkspaces[key],
  });
}

export function useBusinessPeriods(filters: BusinessPeriodListFilters) {
  return useEpicQuery<BusinessPeriodListFilters, PaginatedResponse<BusinessPeriod>>({
    arg: filters,
    request: endOfDayManagementActions.fetchDayListRequest,
    selectEntry: (state, key) => state.endOfDayManagement.dayLists[key],
  });
}

export function useMonthlyPeriods(filters: MonthlyPeriodListFilters) {
  return useEpicQuery<MonthlyPeriodListFilters, PaginatedResponse<MonthlyPeriod>>({
    arg: filters,
    request: endOfDayManagementActions.fetchMonthListRequest,
    selectEntry: (state, key) => state.endOfDayManagement.monthLists[key],
  });
}

export function useEndOfDayManagementSettings(branchId = DEFAULT_BRANCH_ID) {
  return useEpicQuery<string | undefined, EndOfDayManagementSettings>({
    arg: branchId,
    getKey: () => "settings",
    request: endOfDayManagementActions.fetchSettingsRequest,
    selectEntry: (state, key) => state.endOfDayManagement.settings[key],
  });
}

export function usePeriodAdjustments(branchId = DEFAULT_BRANCH_ID) {
  return useEpicQuery<string | undefined, PeriodAdjustment[]>({
    arg: branchId,
    getKey: () => "adjustments",
    request: endOfDayManagementActions.fetchAdjustmentsRequest,
    selectEntry: (state, key) => state.endOfDayManagement.adjustments[key],
  });
}

export function useRunDayValidation() {
  return useEpicMutation<string, DayCloseWorkspace>({
    request: endOfDayManagementActions.runDayValidationRequest,
    selectMutation: (state: RootState) => state.endOfDayManagement.runDayValidation,
  });
}

export function useCloseDay() {
  return useEpicMutation<{ id: string; options?: CloseDayCommand }, CloseDayResult>({
    request: endOfDayManagementActions.closeDayRequest,
    selectMutation: (state: RootState) => state.endOfDayManagement.closeDay,
  });
}

export function useReopenDay() {
  return useEpicMutation<
    { id: string; input: ReopenPeriodInput },
    BusinessPeriod
  >({
    request: endOfDayManagementActions.reopenDayRequest,
    selectMutation: (state: RootState) => state.endOfDayManagement.reopenDay,
  });
}

export function useRunMonthValidation() {
  return useEpicMutation<string, MonthlyCloseWorkspace>({
    request: endOfDayManagementActions.runMonthValidationRequest,
    selectMutation: (state: RootState) => state.endOfDayManagement.runMonthValidation,
  });
}

export function useCloseMonth() {
  return useEpicMutation<string, CloseMonthResult>({
    request: endOfDayManagementActions.closeMonthRequest,
    selectMutation: (state: RootState) => state.endOfDayManagement.closeMonth,
  });
}

export function useReopenMonth() {
  return useEpicMutation<{ id: string; input: ReopenPeriodInput }, MonthlyPeriod>({
    request: endOfDayManagementActions.reopenMonthRequest,
    selectMutation: (state: RootState) => state.endOfDayManagement.reopenMonth,
  });
}

export function useCreatePeriodAdjustment() {
  return useEpicMutation<CreatePeriodAdjustmentInput, PeriodAdjustment>({
    request: endOfDayManagementActions.createAdjustmentRequest,
    selectMutation: (state: RootState) => state.endOfDayManagement.createAdjustment,
  });
}
