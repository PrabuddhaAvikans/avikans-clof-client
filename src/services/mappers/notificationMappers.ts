import type {
  AppNotification,
  NotificationCategoryValue,
  NotificationTypeValue,
} from "@/types/notification";

export function mapNotification(raw: Record<string, unknown>): AppNotification {
  return {
    id: String(raw.id),
    title: String(raw.title),
    message: String(raw.message),
    type: (raw.type as NotificationTypeValue) ?? "info",
    category: (raw.category as NotificationCategoryValue) ?? "system",
    isRead: Boolean(raw.isRead),
    actionUrl: raw.actionUrl as string | undefined,
    entityType: raw.entityType as string | undefined,
    entityId: raw.entityId as string | undefined,
    recipientId: String(raw.recipientId),
    createdAt: String(raw.createdAt ?? raw.createdOnUtc ?? new Date().toISOString()),
    readAt: raw.readAt as string | undefined,
  };
}
