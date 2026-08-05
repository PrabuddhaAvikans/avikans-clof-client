import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { costingActions } from "@/features/costing/store/costingSlice";
import { costingService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: costingActions.fetchListRequest,
  success: costingActions.fetchListSuccess,
  failure: costingActions.fetchListFailure,
  handler: (filters) => costingService.list(filters),
});

const fetchDetailEpic = createAsyncEpic({
  request: costingActions.fetchDetailRequest,
  success: costingActions.fetchDetailSuccess,
  failure: costingActions.fetchDetailFailure,
  handler: (id) => costingService.getById(id),
});

const approveEpic = createAsyncEpic({
  request: costingActions.approveRequest,
  success: costingActions.approveSuccess,
  failure: costingActions.approveFailure,
  handler: ({ id, comment }) => costingService.approve(id, comment),
  mode: "merge",
});

const rejectEpic = createAsyncEpic({
  request: costingActions.rejectRequest,
  success: costingActions.rejectSuccess,
  failure: costingActions.rejectFailure,
  handler: ({ id, comment }) => costingService.reject(id, comment),
  mode: "merge",
});

const requestChangesEpic = createAsyncEpic({
  request: costingActions.requestChangesRequest,
  success: costingActions.requestChangesSuccess,
  failure: costingActions.requestChangesFailure,
  handler: ({ id, comment }) => costingService.requestChanges(id, comment),
  mode: "merge",
});

const updateNotesEpic = createAsyncEpic({
  request: costingActions.updateNotesRequest,
  success: costingActions.updateNotesSuccess,
  failure: costingActions.updateNotesFailure,
  handler: ({ id, notes }) => costingService.updateNotes(id, notes),
  mode: "merge",
});

const addCommentEpic = createAsyncEpic({
  request: costingActions.addCommentRequest,
  success: costingActions.addCommentSuccess,
  failure: costingActions.addCommentFailure,
  handler: ({ id, comment }) => costingService.addComment(id, comment),
  mode: "merge",
});

export const costingEpic = combineEpics(
  fetchListEpic,
  fetchDetailEpic,
  approveEpic,
  rejectEpic,
  requestChangesEpic,
  updateNotesEpic,
  addCommentEpic,
);
