import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { notificationsActions } from "@/features/admin/store/notificationsSlice";
import type { NotificationListFilters } from "@/services";
import type { AppNotification } from "@/types/notification";
import type { PaginatedResponse } from "@/types/common";

export function useNotifications(filters: NotificationListFilters) {
  return useEpicQuery<NotificationListFilters, PaginatedResponse<AppNotification>>({
    arg: filters,
    request: notificationsActions.fetchListRequest,
    selectEntry: (state, key) => state.notifications.lists[key],
  });
}

export function useUnreadNotificationCount(recipientId: string) {
  return useEpicQuery<string, number>({
    arg: recipientId,
    enabled: Boolean(recipientId),
    getKey: (id) => `unread:${id}`,
    request: notificationsActions.fetchUnreadCountRequest,
    selectEntry: (state, key) => state.notifications.unreadCounts[key],
  });
}

export function useMarkNotificationAsRead() {
  return useEpicMutation<string, AppNotification>({
    request: notificationsActions.markAsReadRequest,
    selectMutation: (state: RootState) => state.notifications.markAsRead,
  });
}

export function useMarkAllNotificationsAsRead() {
  return useEpicMutation<string, void>({
    request: notificationsActions.markAllAsReadRequest,
    selectMutation: (state: RootState) => state.notifications.markAllAsRead,
  });
}
