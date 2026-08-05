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
  InventoryFormData,
  InventoryListFilters,
  StockMovementFilters,
} from "@/services";
import type {
  InventoryItem,
  StockMovement,
  StockMovementTypeValue,
} from "@/types/inventory";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<InventoryItem>;
type MovementsData = PaginatedResponse<StockMovement>;
type UpdateArg = { id: string; data: Partial<InventoryFormData> };
type RecordMovementArg = {
  inventoryItemId: string;
  type: StockMovementTypeValue;
  quantity: number;
  reference?: { referenceType: string; referenceId: string; notes?: string };
};

export type InventoryState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<InventoryItem>>;
  lowStock: Record<string, AsyncEntry<InventoryItem[]>>;
  movements: Record<string, AsyncEntry<MovementsData>>;
  create: MutationEntry;
  update: MutationEntry;
  recordMovement: MutationEntry;
};

const initialState: InventoryState = {
  lists: emptyCache(),
  details: emptyCache(),
  lowStock: emptyCache(),
  movements: emptyCache(),
  create: createMutationEntry(),
  update: createMutationEntry(),
  recordMovement: createMutationEntry(),
};

function upsertDetail(state: InventoryState, item: InventoryItem): void {
  state.details[item.id] = {
    data: item,
    status: "succeeded",
    error: null,
  };
}

function invalidateCaches(state: InventoryState): void {
  invalidateEntries(state.lists);
  invalidateEntries(state.lowStock);
  invalidateEntries(state.movements);
}

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    fetchListRequest(state, action: PayloadAction<RequestPayload<InventoryListFilters>>) {
      if (action.payload.key) setEntryLoading(state.lists, action.payload.key);
    },
    fetchListSuccess(state, action: PayloadAction<SuccessPayload<ListData>>) {
      setEntrySuccess(state.lists, action);
    },
    fetchListFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.lists, action);
    },

    fetchDetailRequest(state, action: PayloadAction<RequestPayload<string>>) {
      if (action.payload.key) setEntryLoading(state.details, action.payload.key);
    },
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<InventoryItem>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    fetchLowStockRequest(state, action: PayloadAction<RequestPayload<null>>) {
      if (action.payload.key) setEntryLoading(state.lowStock, action.payload.key);
    },
    fetchLowStockSuccess(state, action: PayloadAction<SuccessPayload<InventoryItem[]>>) {
      setEntrySuccess(state.lowStock, action);
    },
    fetchLowStockFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.lowStock, action);
    },

    fetchMovementsRequest(
      state,
      action: PayloadAction<RequestPayload<StockMovementFilters>>,
    ) {
      if (action.payload.key) setEntryLoading(state.movements, action.payload.key);
    },
    fetchMovementsSuccess(state, action: PayloadAction<SuccessPayload<MovementsData>>) {
      setEntrySuccess(state.movements, action);
    },
    fetchMovementsFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.movements, action);
    },

    createRequest(state, _action: PayloadAction<RequestPayload<InventoryFormData>>) {
      setMutationLoading(state.create);
    },
    createSuccess(state, action: PayloadAction<SuccessPayload<InventoryItem>>) {
      setMutationSuccess(state.create);
      upsertDetail(state, action.payload.data);
      invalidateCaches(state);
    },
    createFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.create, action);
    },

    updateRequest(state, _action: PayloadAction<RequestPayload<UpdateArg>>) {
      setMutationLoading(state.update);
    },
    updateSuccess(state, action: PayloadAction<SuccessPayload<InventoryItem>>) {
      setMutationSuccess(state.update);
      upsertDetail(state, action.payload.data);
      invalidateCaches(state);
    },
    updateFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.update, action);
    },

    recordMovementRequest(
      state,
      _action: PayloadAction<RequestPayload<RecordMovementArg>>,
    ) {
      setMutationLoading(state.recordMovement);
    },
    recordMovementSuccess(state, _action: PayloadAction<SuccessPayload<StockMovement>>) {
      setMutationSuccess(state.recordMovement);
      invalidateCaches(state);
      invalidateEntries(state.details);
    },
    recordMovementFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.recordMovement, action);
    },

    invalidateAll(state) {
      invalidateCaches(state);
      invalidateEntries(state.details);
    },
  },
});

export const inventoryActions = inventorySlice.actions;
export default inventorySlice.reducer;
