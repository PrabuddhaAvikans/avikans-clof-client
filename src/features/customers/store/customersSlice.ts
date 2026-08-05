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
import type { CustomerFormData, CustomerListFilters } from "@/services";
import type { Customer } from "@/types/customer";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<Customer>;
type UpdateArg = { id: string; data: Partial<CustomerFormData> };

export type CustomersState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<Customer>>;
  create: MutationEntry;
  update: MutationEntry;
  remove: MutationEntry;
};

const initialState: CustomersState = {
  lists: emptyCache(),
  details: emptyCache(),
  create: createMutationEntry(),
  update: createMutationEntry(),
  remove: createMutationEntry(),
};

function upsertDetail(state: CustomersState, customer: Customer): void {
  state.details[customer.id] = {
    data: customer,
    status: "succeeded",
    error: null,
  };
}

const customersSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {
    fetchListRequest(state, action: PayloadAction<RequestPayload<CustomerListFilters>>) {
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
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<Customer>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    createRequest(state, _action: PayloadAction<RequestPayload<CustomerFormData>>) {
      setMutationLoading(state.create);
    },
    createSuccess(state, action: PayloadAction<SuccessPayload<Customer>>) {
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
    updateSuccess(state, action: PayloadAction<SuccessPayload<Customer>>) {
      setMutationSuccess(state.update);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    updateFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.update, action);
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

    invalidateAll(state) {
      invalidateEntries(state.lists);
      invalidateEntries(state.details);
    },
  },
});

export const customersActions = customersSlice.actions;
export default customersSlice.reducer;
