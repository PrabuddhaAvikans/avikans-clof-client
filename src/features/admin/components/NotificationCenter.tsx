import { useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isValid,
  isYesterday,
  parseISO,
} from "date-fns";
import {
  Bell,
  CheckCheck,
  ClipboardList,
  Factory,
  FileText,
  Inbox,
  Settings,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import {
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/features/admin/hooks/useNotifications";
import { useBreakpoint } from "@/hooks/useMediaQuery";
import { useScrollLock } from "@/hooks/useScrollLock";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  AppNotification,
  NotificationCategoryValue,
  NotificationTypeValue,
} from "@/types/notification";

export type NotificationCenterProps = {
  recipientId: string;
};

const CATEGORY_META: Record<
  NotificationCategoryValue,
  { label: string; icon: LucideIcon }
> = {
  quotation: { label: "Quotation", icon: FileText },
  sales_order: { label: "Sales order", icon: ClipboardList },
  manufacturing: { label: "Production", icon: Factory },
  delivery: { label: "Delivery", icon: Truck },
  inventory: { label: "Inventory", icon: Warehouse },
  system: { label: "System", icon: Settings },
};

const TYPE_TONE: Record<NotificationTypeValue, { wrap: string; icon: string }> = {
  success: { wrap: "bg-emerald-50", icon: "text-emerald-600" },
  warning: { wrap: "bg-amber-50", icon: "text-amber-600" },
  error: { wrap: "bg-red-50", icon: "text-red-600" },
  info: { wrap: "bg-sky-50", icon: "text-sky-600" },
  system: { wrap: "bg-neutral-100", icon: "text-neutral-500" },
};

type InboxTab = "all" | "unread";

function toDate(value: string) {
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

function formatNotificationWhen(value: string) {
  const date = toDate(value);
  if (!date) return "-";
  if (isToday(date)) {
    return formatDistanceToNowStrict(date, { addSuffix: true });
  }
  if (isYesterday(date)) return "Yesterday";
  if (date.getFullYear() === new Date().getFullYear()) {
    return format(date, "MMM d");
  }
  return format(date, "MMM d, yyyy");
}

function notificationDayLabel(value: string) {
  const date = toDate(value);
  if (!date) return "Earlier";
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE d MMM");
}

function groupNotifications(items: AppNotification[]) {
  const groups: { label: string; items: AppNotification[] }[] = [];
  for (const item of items) {
    const label = notificationDayLabel(item.createdAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

function NotificationItem({
  notification,
  onSelect,
}: {
  notification: AppNotification;
  onSelect: (notification: AppNotification) => void;
}) {
  const category = CATEGORY_META[notification.category];
  const tone = TYPE_TONE[notification.type] ?? TYPE_TONE.info;
  const Icon = category.icon;
  const when = formatNotificationWhen(notification.createdAt);
  const fullWhen = formatDateTime(notification.createdAt);

  const body = (
    <>
      <span
        className={cn(
          "relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          tone.wrap,
        )}
        title={category.label}
        aria-hidden
      >
        <Icon className={cn("h-3.5 w-3.5", tone.icon)} strokeWidth={1.75} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-[13px] leading-5",
              notification.isRead
                ? "font-medium text-foreground"
                : "font-semibold text-foreground",
            )}
            title={notification.title}
          >
            {notification.title}
          </span>
          <time
            dateTime={notification.createdAt}
            title={fullWhen}
            className="shrink-0 pt-px text-[11px] leading-5 tabular-nums text-muted-foreground"
          >
            {when}
          </time>
        </span>

        <span
          className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-muted-foreground"
          title={notification.message}
        >
          {notification.message}
        </span>

        <span className="mt-1.5 flex items-center gap-1.5">
          <span className="truncate text-[11px] leading-none text-muted-foreground">
            {category.label}
          </span>
          {!notification.isRead && (
            <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-info" title="Unread" />
          )}
        </span>
      </span>
    </>
  );

  const className = cn(
    "flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-muted/70",
    !notification.isRead && "bg-muted/40",
  );

  if (notification.actionUrl) {
    return (
      <Link
        to={notification.actionUrl}
        title={notification.title}
        className={className}
        onClick={() => onSelect(notification)}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      title={notification.title}
      onClick={() => onSelect(notification)}
    >
      {body}
    </button>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-1 px-3.5 py-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 py-2">
          <div className="h-8 w-8 rounded-full bg-muted" />
          <div className="min-w-0 flex-1 space-y-2 pt-0.5">
            <div className="h-3 w-2/3 rounded bg-muted" />
            <div className="h-2.5 w-full rounded bg-muted" />
            <div className="h-2 w-16 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationCenter({ recipientId }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<InboxTab>("all");
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const isDesktop = useBreakpoint("md");

  const { data: unreadCount = 0 } = useUnreadNotificationCount(recipientId);
  const listFilters = useMemo(
    () => ({
      page: 1,
      pageSize: 20,
      recipientId,
      sortBy: "createdAt",
      sortDirection: "desc" as const,
    }),
    [recipientId],
  );
  const { data: notifications, refetch, isLoading, isError } = useNotifications(listFilters);
  const markRead = useMarkNotificationAsRead();
  const markAllRead = useMarkAllNotificationsAsRead();

  useScrollLock(open && !isDesktop);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (window.innerWidth < 768) {
        setPanelStyle({
          top: 61,
          left: 12,
          right: 12,
          width: "auto",
        });
        return;
      }

      const width = Math.min(380, window.innerWidth - 24);
      const right = Math.min(
        Math.max(12, window.innerWidth - rect.right),
        Math.max(12, window.innerWidth - 12 - width),
      );

      setPanelStyle({
        top: rect.bottom + 6,
        right,
        left: "auto",
        width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    const handlePointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const items = useMemo(() => notifications?.items ?? [], [notifications]);
  const visibleItems = useMemo(
    () => (tab === "unread" ? items.filter((item) => !item.isRead) : items),
    [items, tab],
  );
  const groups = useMemo(() => groupNotifications(visibleItems), [visibleItems]);

  const handleSelect = (notification: AppNotification) => {
    if (!notification.isRead) {
      void markRead.mutateAsync(notification.id).then(() => void refetch());
    }
    setOpen(false);
  };

  const handleMarkAllRead = () => {
    void markAllRead.mutateAsync(recipientId).then(() => {
      void refetch();
      setTab("all");
    });
  };

  const emptyTitle = tab === "unread" ? "You're all caught up" : "No notifications";
  const emptyDescription =
    tab === "unread"
      ? "New alerts for quotations, jobs, and stock will show up here."
      : "When something needs attention, it will appear in this list.";

  return (
    <div ref={triggerRef} className="relative">
      <IconButton
        variant="ghost"
        size="sm"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        icon={<Bell className="h-[18px] w-[18px]" />}
        onClick={() => setOpen((current) => !current)}
      />
      {unreadCount > 0 && (
        <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}

      {open &&
        createPortal(
          <>
            {!isDesktop && (
              <div
                className="fixed inset-0 z-40 bg-foreground/20"
                aria-hidden
                onClick={() => setOpen(false)}
              />
            )}
            <div
              ref={panelRef}
              role="dialog"
              aria-modal={!isDesktop}
              aria-labelledby={titleId}
              style={panelStyle}
              className="fixed z-50 flex max-h-[min(34rem,calc(100dvh-5.5rem))] flex-col overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
            >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-3.5 py-3">
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="text-sm font-semibold text-foreground"
                  title="Notifications"
                >
                  Notifications
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} unread`
                    : "You're up to date"}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  title="Mark all as read"
                  disabled={markAllRead.isPending}
                  onClick={() => void handleMarkAllRead()}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex shrink-0 gap-1 border-b border-border px-3 py-2">
              {([
                { id: "all", label: "All", count: items.length },
                { id: "unread", label: "Unread", count: unreadCount },
              ] as const).map((option) => {
                const selected = tab === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    title={option.label}
                    aria-pressed={selected}
                    onClick={() => setTab(option.id)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-colors",
                      selected
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {option.label}
                    <span
                      className={cn(
                        "min-w-4 rounded-full px-1 text-[10px] tabular-nums",
                        selected ? "bg-background/15" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {option.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {isLoading ? (
                <NotificationSkeleton />
              ) : isError ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-medium text-foreground">Could not load notifications</p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-foreground underline"
                    onClick={() => void refetch()}
                  >
                    Try again
                  </button>
                </div>
              ) : visibleItems.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Inbox className="h-5 w-5" aria-hidden />
                  </span>
                  <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
                  <p className="mt-1 max-w-[16rem] text-[12px] leading-4 text-muted-foreground">
                    {emptyDescription}
                  </p>
                </div>
              ) : (
                groups.map((group) => (
                  <section key={group.label}>
                    <h3 className="sticky top-0 z-10 bg-popover/95 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
                      {group.label}
                    </h3>
                    <div className="divide-y divide-border">
                      {group.items.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>
          </div>
        </>,
          document.body,
        )}
    </div>
  );
}
