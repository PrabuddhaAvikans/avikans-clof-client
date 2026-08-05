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
  QuotationContactInput,
  QuotationFormData,
  QuotationListFilters,
} from "@/services";
import type { Quotation } from "@/types/quotation";
import type { SalesOrder } from "@/types/sales-order";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<Quotation>;

type UpdateArg = { id: string; data: Partial<QuotationFormData> };
type AddContactArg = { id: string; data: QuotationContactInput };

export type QuotationsState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<Quotation>>;
  create: MutationEntry;
  update: MutationEntry;
  send: MutationEntry;
  convert: MutationEntry;
  remove: MutationEntry;
  addContact: MutationEntry;
};

const initialState: QuotationsState = {
  lists: emptyCache(),
  details: emptyCache(),
  create: createMutationEntry(),
  update: createMutationEntry(),
  send: createMutationEntry(),
  convert: createMutationEntry(),
  remove: createMutationEntry(),
  addContact: createMutationEntry(),
};

function upsertDetail(state: QuotationsState, quotation: Quotation): void {
  state.details[quotation.id] = {
    data: quotation,
    status: "succeeded",
    error: null,
  };
}

const quotationsSlice = createSlice({
  name: "quotations",
  initialState,
  reducers: {
    fetchListRequest(state, action: PayloadAction<RequestPayload<QuotationListFilters>>) {
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
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<Quotation>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    createRequest(state, _action: PayloadAction<RequestPayload<QuotationFormData>>) {
      setMutationLoading(state.create);
    },
    createSuccess(state, action: PayloadAction<SuccessPayload<Quotation>>) {
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
    updateSuccess(state, action: PayloadAction<SuccessPayload<Quotation>>) {
      setMutationSuccess(state.update);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    updateFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.update, action);
    },

    sendRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.send);
    },
    sendSuccess(state, action: PayloadAction<SuccessPayload<Quotation>>) {
      setMutationSuccess(state.send);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    sendFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.send, action);
    },

    convertRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.convert);
    },
    convertSuccess(state, _action: PayloadAction<SuccessPayload<SalesOrder>>) {
      setMutationSuccess(state.convert);
      invalidateEntries(state.lists);
      invalidateEntries(state.details);
    },
    convertFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.convert, action);
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

    addContactRequest(state, _action: PayloadAction<RequestPayload<AddContactArg>>) {
      setMutationLoading(state.addContact);
    },
    addContactSuccess(state, action: PayloadAction<SuccessPayload<Quotation>>) {
      setMutationSuccess(state.addContact);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    addContactFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.addContact, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.lists);
      invalidateEntries(state.details);
    },
  },
});

export const quotationsActions = quotationsSlice.actions;
export default quotationsSlice.reducer;
