import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  FailurePayload,
  RequestPayload,
  SuccessPayload,
} from "@/app/store/async/createAsyncEpic";
import {
  emptyCache,
  setEntryFailure,
  setEntryLoading,
  setEntrySuccess,
} from "@/app/store/async/reducers";
import type { AsyncEntry } from "@/app/store/async/types";
import type { PermissionCatalogDto } from "@/services/mappers/permissionMappers";

export type PermissionsState = {
  catalog: Record<string, AsyncEntry<PermissionCatalogDto>>;
};

const initialState: PermissionsState = {
  catalog: emptyCache(),
};

const permissionsSlice = createSlice({
  name: "permissions",
  initialState,
  reducers: {
    fetchCatalogRequest(state, action: PayloadAction<RequestPayload<void>>) {
      if (action.payload.key) setEntryLoading(state.catalog, action.payload.key);
    },
    fetchCatalogSuccess(
      state,
      action: PayloadAction<SuccessPayload<PermissionCatalogDto>>,
    ) {
      setEntrySuccess(state.catalog, action);
    },
    fetchCatalogFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.catalog, action);
    },
  },
});

export const permissionsActions = permissionsSlice.actions;
export default permissionsSlice.reducer;
