import { combineEpics } from "redux-observable";
import { createAsyncEpic } from "@/app/store/async/createAsyncEpic";
import { notificationsActions } from "@/features/admin/store/notificationsSlice";
import { notificationService } from "@/services";

const fetchListEpic = createAsyncEpic({
  request: notificationsActions.fetchListRequest,
  success: notificationsActions.fetchListSuccess,
  failure: notificationsActions.fetchListFailure,
  handler: (filters) => notificationService.list(filters),
});

const fetchUnreadCountEpic = createAsyncEpic({
  request: notificationsActions.fetchUnreadCountRequest,
  success: notificationsActions.fetchUnreadCountSuccess,
  failure: notificationsActions.fetchUnreadCountFailure,
  handler: (recipientId) => notificationService.getUnreadCount(recipientId),
});

const markAsReadEpic = createAsyncEpic({
  request: notificationsActions.markAsReadRequest,
  success: notificationsActions.markAsReadSuccess,
  failure: notificationsActions.markAsReadFailure,
  handler: (id) => notificationService.markAsRead(id),
  mode: "merge",
});

const markAllAsReadEpic = createAsyncEpic({
  request: notificationsActions.markAllAsReadRequest,
  success: notificationsActions.markAllAsReadSuccess,
  failure: notificationsActions.markAllAsReadFailure,
  handler: async (recipientId) => {
    await notificationService.markAllAsRead(recipientId);
  },
  mode: "merge",
});

export const notificationsEpic = combineEpics(
  fetchListEpic,
  fetchUnreadCountEpic,
  markAsReadEpic,
  markAllAsReadEpic,
);
