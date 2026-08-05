import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { deliveriesActions } from "@/features/delivery/store/deliveriesSlice";
import { deliveryService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: deliveriesActions.fetchListRequest,
  success: deliveriesActions.fetchListSuccess,
  failure: deliveriesActions.fetchListFailure,
  handler: (filters) => deliveryService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: deliveriesActions.fetchDetailRequest,
  success: deliveriesActions.fetchDetailSuccess,
  failure: deliveriesActions.fetchDetailFailure,
  handler: (id) => deliveryService.getById(id),
});

const createEpic = createAsyncEpic({
  request: deliveriesActions.createRequest,
  success: deliveriesActions.createSuccess,
  failure: deliveriesActions.createFailure,
  handler: (data) => deliveryService.create(data),
  mode: "merge",
});

const updateEpic = createAsyncEpic({
  request: deliveriesActions.updateRequest,
  success: deliveriesActions.updateSuccess,
  failure: deliveriesActions.updateFailure,
  handler: ({ id, data }) => deliveryService.update(id, data),
  mode: "merge",
});

const dispatchEpic = createAsyncEpic({
  request: deliveriesActions.dispatchRequest,
  success: deliveriesActions.dispatchSuccess,
  failure: deliveriesActions.dispatchFailure,
  handler: (id) => deliveryService.dispatchDelivery(id),
  mode: "merge",
});

const recordProofEpic = createAsyncEpic({
  request: deliveriesActions.recordProofRequest,
  success: deliveriesActions.recordProofSuccess,
  failure: deliveriesActions.recordProofFailure,
  handler: ({ id, proof }) => deliveryService.recordProofOfDelivery(id, proof),
  mode: "merge",
});

export const deliveriesEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  createEpic,
  updateEpic,
  dispatchEpic,
  recordProofEpic,
);
