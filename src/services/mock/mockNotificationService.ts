import {
  delay,
  notFoundError,
  nowIso,
} from "@/services/http";
import type {
  NotificationListFilters,
  NotificationService,
} from "@/services/interfaces/notificationService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialNotifications } from "@/services/mock/data/notifications";

let notifications = cloneData(initialNotifications);

export const mockNotificationService: NotificationService = {
  async list(filters: NotificationListFilters) {
    await delay();
    return applyListQuery(
      notifications,
      filters,
      ["title", "message"],
      (item) => {
        if (filters.isRead !== undefined && item.isRead !== filters.isRead) return false;
        if (filters.category && item.category !== filters.category) return false;
        if (filters.type && item.type !== filters.type) return false;
        if (filters.recipientId && item.recipientId !== filters.recipientId) return false;
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    const notification = notifications.find((n) => n.id === id);
    if (!notification) notFoundError("Notification", id);
    return notification;
  },

  async markAsRead(id) {
    await delay();
    const index = notifications.findIndex((n) => n.id === id);
    if (index === -1) notFoundError("Notification", id);
    notifications[index] = {
      ...notifications[index],
      isRead: true,
      readAt: nowIso(),
    };
    return notifications[index];
  },

  async markAllAsRead(recipientId) {
    await delay();
    notifications = notifications.map((n) =>
      n.recipientId === recipientId && !n.isRead
        ? { ...n, isRead: true, readAt: nowIso() }
        : n,
    );
  },

  async getUnreadCount(recipientId) {
    await delay();
    return notifications.filter(
      (n) => n.recipientId === recipientId && !n.isRead,
    ).length;
  },

  async delete(id) {
    await delay();
    const index = notifications.findIndex((n) => n.id === id);
    if (index === -1) notFoundError("Notification", id);
    notifications.splice(index, 1);
  },
};
