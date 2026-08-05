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
  SalesOrderFormData,
  SalesOrderListFilters,
} from "@/services";
import type { SalesOrder } from "@/types/sales-order";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<SalesOrder>;

type AssignArg = { id: string; userId: string };
type UpdateArg = { id: string; data: Partial<SalesOrderFormData> };
type CancelArg = { id: string; reason?: string };

export type SalesOrdersState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<SalesOrder>>;
  create: MutationEntry;
  update: MutationEntry;
  confirm: MutationEntry;
  cancel: MutationEntry;
  remove: MutationEntry;
  assign: MutationEntry;
};

const initialState: SalesOrdersState = {
  lists: emptyCache(),
  details: emptyCache(),
  create: createMutationEntry(),
  update: createMutationEntry(),
  confirm: createMutationEntry(),
  cancel: createMutationEntry(),
  remove: createMutationEntry(),
  assign: createMutationEntry(),
};

function upsertDetail(state: SalesOrdersState, order: SalesOrder): void {
  state.details[order.id] = {
    data: order,
    status: "succeeded",
    error: null,
  };
}

const salesOrdersSlice = createSlice({
  name: "salesOrders",
  initialState,
  reducers: {
    fetchListRequest(state, action: PayloadAction<RequestPayload<SalesOrderListFilters>>) {
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
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<SalesOrder>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    createRequest(state, _action: PayloadAction<RequestPayload<SalesOrderFormData>>) {
      setMutationLoading(state.create);
    },
    createSuccess(state, action: PayloadAction<SuccessPayload<SalesOrder>>) {
      setMutationSuccess(state.create);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    createFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.create, action);
    },

    updateRequest(state, _action: PayloadAction<RequestPayload<UpdateArg>>) {
      setMutationLoading(state.update);
    },
    updateSuccess(state, action: PayloadAction<SuccessPayload<SalesOrder>>) {
      setMutationSuccess(state.update);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    updateFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.update, action);
    },

    confirmRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.confirm);
    },
    confirmSuccess(state, action: PayloadAction<SuccessPayload<SalesOrder>>) {
      setMutationSuccess(state.confirm);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    confirmFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.confirm, action);
    },

    cancelRequest(state, _action: PayloadAction<RequestPayload<CancelArg>>) {
      setMutationLoading(state.cancel);
    },
    cancelSuccess(state, action: PayloadAction<SuccessPayload<SalesOrder>>) {
      setMutationSuccess(state.cancel);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    cancelFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.cancel, action);
    },

    deleteRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.remove);
    },
    deleteSuccess(state, action: PayloadAction<SuccessPayload<string>>) {
      setMutationSuccess(state.remove);
      delete state.details[action.payload.data];
      invalidateEntries(state.lists);
    },
    deleteFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.remove, action);
    },

    assignRequest(state, _action: PayloadAction<RequestPayload<AssignArg>>) {
      setMutationLoading(state.assign);
    },
    assignSuccess(state, action: PayloadAction<SuccessPayload<SalesOrder>>) {
      setMutationSuccess(state.assign);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    assignFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.assign, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.lists);
      invalidateEntries(state.details);
    },
  },
});

export const salesOrdersActions = salesOrdersSlice.actions;
export default salesOrdersSlice.reducer;
