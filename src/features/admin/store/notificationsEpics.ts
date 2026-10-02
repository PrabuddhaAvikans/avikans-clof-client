import { combineEpics } from "redux-observable";
import { createApiEpic } from "@/app/store/async/createApiEpic";
import { notificationsActions as actions } from "@/features/admin/store/notificationsSlice";
import { buildQuery, http } from "@/services/apiClient";
import { asRecord, mapPaginatedResponse } from "@/services/mappers/common";
import { mapNotification } from "@/services/mappers/notificationMappers";

const fetchListEpic = createApiEpic({
  request: actions.fetchListRequest,
  success: actions.fetchListSuccess,
  failure: actions.fetchListFailure,
  execute: async (filters) =>
    mapPaginatedResponse(
      await http.get(
        `/api/notifications${buildQuery(filters)}`,
      ),
      mapNotification,
    ),
});

const fetchUnreadCountEpic = createApiEpic({
  request: actions.fetchUnreadCountRequest,
  success: actions.fetchUnreadCountSuccess,
  failure: actions.fetchUnreadCountFailure,
  execute: async (recipientId) => {
    const raw = asRecord(
      await http.get(
        `/api/notifications/unread-count${buildQuery({ recipientId })}`,
      ),
    );
    return Number(raw.count ?? 0);
  },
});

const markAsReadEpic = createApiEpic({
  request: actions.markAsReadRequest,
  success: actions.markAsReadSuccess,
  failure: actions.markAsReadFailure,
  concurrency: "merge",
  execute: async (id) =>
    mapNotification(asRecord(await http.post(`/api/notifications/${id}/read`))),
});

const markAllAsReadEpic = createApiEpic({
  request: actions.markAllAsReadRequest,
  success: actions.markAllAsReadSuccess,
  failure: actions.markAllAsReadFailure,
  concurrency: "merge",
  execute: async (recipientId) => {
    await http.post("/api/notifications/mark-all-read", { recipientId });
    return undefined;
  },
});

export const notificationsEpic = combineEpics(
  fetchListEpic,
  fetchUnreadCountEpic,
  markAsReadEpic,
  markAllAsReadEpic,
);
