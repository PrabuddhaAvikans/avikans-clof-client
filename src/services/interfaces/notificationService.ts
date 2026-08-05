import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type {
  AppNotification,
  NotificationCategoryValue,
  NotificationTypeValue,
} from "@/types/notification";

export interface NotificationListFilters extends PaginatedRequest {
  isRead?: boolean;
  category?: NotificationCategoryValue;
  type?: NotificationTypeValue;
  recipientId?: string;
}

export interface NotificationService {
  list(filters: NotificationListFilters): Promise<PaginatedResponse<AppNotification>>;
  getById(id: string): Promise<AppNotification>;
  markAsRead(id: string): Promise<AppNotification>;
  markAllAsRead(recipientId: string): Promise<void>;
  getUnreadCount(recipientId: string): Promise<number>;
  delete(id: string): Promise<void>;
}
