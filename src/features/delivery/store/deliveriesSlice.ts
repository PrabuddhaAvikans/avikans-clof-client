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
import type { DeliveryFormData, DeliveryListFilters } from "@/services";
import type { Delivery, ProofOfDelivery } from "@/types/delivery";
import type { PaginatedResponse } from "@/types/common";

type ListData = PaginatedResponse<Delivery>;
type UpdateArg = { id: string; data: Partial<DeliveryFormData> };
type ProofArg = { id: string; proof: Omit<ProofOfDelivery, "id"> };

export type DeliveriesState = {
  lists: Record<string, AsyncEntry<ListData>>;
  details: Record<string, AsyncEntry<Delivery>>;
  create: MutationEntry;
  update: MutationEntry;
  dispatch: MutationEntry;
  recordProof: MutationEntry;
};

const initialState: DeliveriesState = {
  lists: emptyCache(),
  details: emptyCache(),
  create: createMutationEntry(),
  update: createMutationEntry(),
  dispatch: createMutationEntry(),
  recordProof: createMutationEntry(),
};

function upsertDetail(state: DeliveriesState, delivery: Delivery): void {
  state.details[delivery.id] = {
    data: delivery,
    status: "succeeded",
    error: null,
  };
}

const deliveriesSlice = createSlice({
  name: "deliveries",
  initialState,
  reducers: {
    fetchListRequest(state, action: PayloadAction<RequestPayload<DeliveryListFilters>>) {
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
    fetchDetailSuccess(state, action: PayloadAction<SuccessPayload<Delivery>>) {
      setEntrySuccess(state.details, action);
    },
    fetchDetailFailure(state, action: PayloadAction<FailurePayload>) {
      setEntryFailure(state.details, action);
    },

    createRequest(state, _action: PayloadAction<RequestPayload<DeliveryFormData>>) {
      setMutationLoading(state.create);
    },
    createSuccess(state, action: PayloadAction<SuccessPayload<Delivery>>) {
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
    updateSuccess(state, action: PayloadAction<SuccessPayload<Delivery>>) {
      setMutationSuccess(state.update);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    updateFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.update, action);
    },

    dispatchRequest(state, _action: PayloadAction<RequestPayload<string>>) {
      setMutationLoading(state.dispatch);
    },
    dispatchSuccess(state, action: PayloadAction<SuccessPayload<Delivery>>) {
      setMutationSuccess(state.dispatch);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    dispatchFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.dispatch, action);
    },

    recordProofRequest(state, _action: PayloadAction<RequestPayload<ProofArg>>) {
      setMutationLoading(state.recordProof);
    },
    recordProofSuccess(state, action: PayloadAction<SuccessPayload<Delivery>>) {
      setMutationSuccess(state.recordProof);
      upsertDetail(state, action.payload.data);
      invalidateEntries(state.lists);
    },
    recordProofFailure(state, action: PayloadAction<FailurePayload>) {
      setMutationFailure(state.recordProof, action);
    },

    invalidateAll(state) {
      invalidateEntries(state.lists);
      invalidateEntries(state.details);
    },
  },
});

export const deliveriesActions = deliveriesSlice.actions;
export default deliveriesSlice.reducer;
