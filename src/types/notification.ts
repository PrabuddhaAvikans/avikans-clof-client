export const NotificationType = {
  info: "info",
  success: "success",
  warning: "warning",
  error: "error",
  system: "system",
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationCategory = {
  quotation: "quotation",
  sales_order: "sales_order",
  manufacturing: "manufacturing",
  delivery: "delivery",
  inventory: "inventory",
  system: "system",
} as const;

export type NotificationCategoryValue =
  (typeof NotificationCategory)[keyof typeof NotificationCategory];

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationTypeValue;
  category: NotificationCategoryValue;
  isRead: boolean;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  recipientId: string;
  createdAt: string;
  readAt?: string;
}
