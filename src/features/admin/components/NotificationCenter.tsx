import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/features/admin/hooks/useNotifications";
import { formatDateTime } from "@/lib/format";
import type { AppNotification } from "@/types/notification";

export type NotificationCenterProps = {
  recipientId: string;
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: AppNotification;
  onRead: (id: string) => void;
}) {
  const variant =
    notification.type === "error"
      ? "danger"
      : notification.type === "warning"
        ? "warning"
        : notification.type === "success"
          ? "success"
          : "info";

  const content = (
    <div
      className={`rounded-lg border px-3 py-2.5 transition-colors ${
        notification.isRead
          ? "border-border bg-card"
          : "border-primary/20 bg-primary/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        <StatusBadge variant={variant} size="sm">
          {notification.category.replace(/_/g, " ")}
        </StatusBadge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        {formatDateTime(notification.createdAt)}
      </p>
    </div>
  );

  if (notification.actionUrl) {
    return (
      <Link
        to={notification.actionUrl}
        onClick={() => !notification.isRead && onRead(notification.id)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="w-full text-left"
      onClick={() => !notification.isRead && onRead(notification.id)}
    >
      {content}
    </button>
  );
}

export function NotificationCenter({ recipientId }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);

  const { data: unreadCount = 0 } = useUnreadNotificationCount(recipientId);
  const { data: notifications, refetch } = useNotifications({
    page: 1,
    pageSize: 20,
    recipientId,
  });
  const markRead = useMarkNotificationAsRead();
  const markAllRead = useMarkAllNotificationsAsRead();

  const handleMarkRead = (id: string) => {
    void markRead.mutateAsync(id).then(() => void refetch());
  };

  const handleMarkAllRead = () => {
    void markAllRead.mutateAsync(recipientId).then(() => void refetch());
  };

  return (
    <>
      <div className="relative">
        <IconButton
          variant="ghost"
          size="sm"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          icon={<Bell className="h-5 w-5" />}
          onClick={() => setOpen(true)}
        />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Notifications"
        size="md"
        footer={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck className="h-4 w-4" />}
              loading={markAllRead.isPending}
              onClick={() => void handleMarkAllRead()}
            >
              Mark all as read
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-2">
          {(notifications?.items ?? []).length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No notifications
            </p>
          ) : (
            notifications?.items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={handleMarkRead}
              />
            ))
          )}
        </div>
      </Drawer>
    </>
  );
}
