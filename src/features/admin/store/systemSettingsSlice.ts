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
import type { SystemSettings } from "@/lib/systemSettings";

export type SystemSettingsState = {
  current: Record<string, AsyncEntry<SystemSettings>>;
  update: MutationEntry;
};

const initialState: SystemSettingsState = {
  current: emptyCache(),
  update: createMutationEntry(),
};

const systemSettingsSlice = createSlice({
  name: "systemSettings",
  initialState,
  reducers: {
    fetchRequest(state, action: PayloadAction<RequestPayload<void>>) {
      if (action.payload.key) setEntryLoading(state.current, action.payload.key);
    },
    fetchSuccess(state, action: PayloadAction<SuccessPayload<SystemSettings>>) {
      setEntrySuccess(state.current, action);
    },
    fetchFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.current, action);
    },

    updateRequest(
      state,
      _action: PayloadAction<RequestPayload<Partial<SystemSettings>>>,
    ) {
      setMutationLoading(state.update);
    },
    updateSuccess(state, action: PayloadAction<SuccessPayload<SystemSettings>>) {
      setMutationSuccess(state.update);
      const key = action.payload.key ?? "__default__";
      state.current[key] = {
        data: action.payload.data,
        status: "succeeded",
        error: null,
      };
    },
    updateFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.update, action);
    },
  },
});

export const systemSettingsActions = systemSettingsSlice.actions;
export default systemSettingsSlice.reducer;
