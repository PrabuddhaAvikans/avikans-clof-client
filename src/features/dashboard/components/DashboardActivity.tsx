import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import {
  Check,
  ChevronDown,
  Circle,
  Download,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusBadgeVariant } from "@/components/ui/StatusBadge";
import {
  AUDIT_ACTION_LABELS,
  auditActionVariant,
  auditFieldLabel,
  formatAuditWhen,
  getAuditInitials,
} from "@/features/admin/lib/auditLabels";
import { useBreakpoints } from "@/hooks/useMediaQuery";
import { APP_HEADER_HEIGHT } from "@/lib/layout";
import { cn } from "@/lib/utils";
import type { DashboardActivityChange, DashboardActivityItem } from "@/types/dashboard";
import type { AuditAction, AuditEntity } from "@/types/audit";

const ENTITY_TYPE_LABELS: Partial<Record<AuditEntity, string>> = {
  SalesOrder: "Sales order",
  ManufacturingJob: "Job",
  InventoryItem: "Inventory",
  RoleGroup: "Role group",
};

const ACTION_ICONS: Record<AuditAction, LucideIcon> = {
  created: Plus,
  updated: Pencil,
  deleted: Trash2,
  approved: Check,
  rejected: X,
  assigned: UserPlus,
  exported: Download,
  login: LogIn,
  logout: LogOut,
  failed_login: ShieldAlert,
};

const ACTION_TONE: Record<
  Extract<StatusBadgeVariant, "success" | "warning" | "danger" | "info" | "neutral">,
  { wrap: string; icon: string }
> = {
  success: { wrap: "bg-emerald-50", icon: "text-emerald-600" },
  warning: { wrap: "bg-amber-50", icon: "text-amber-600" },
  danger: { wrap: "bg-red-50", icon: "text-red-600" },
  info: { wrap: "bg-sky-50", icon: "text-sky-600" },
  neutral: { wrap: "bg-neutral-100", icon: "text-neutral-500" },
};

function entityTypeLabel(entity: string) {
  return ENTITY_TYPE_LABELS[entity as AuditEntity] ?? entity.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function activityDayLabel(timestamp: string) {
  const date = parseISO(timestamp);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEE d MMM");
}

function activityTime(timestamp: string) {
  return format(parseISO(timestamp), "h:mm a");
}

function prettyValue(value?: string) {
  if (!value) return "—";
  if (value.includes("@") || (/[A-Z]/.test(value) && value.includes(" "))) return value;
  return value.replace(/_/g, " ");
}

function groupActivity(entries: DashboardActivityItem[]) {
  const groups: { label: string; items: DashboardActivityItem[] }[] = [];
  for (const entry of entries) {
    const label = activityDayLabel(entry.timestamp);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(entry);
    else groups.push({ label, items: [entry] });
  }
  return groups;
}

function ChangeRows({ changes }: { changes: DashboardActivityChange[] }) {
  const visible = changes.slice(0, 2);
  const extra = changes.length - visible.length;

  return (
    <dl className="mt-2 space-y-1">
      {visible.map((change) => (
        <div key={change.field} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-2">
          <dt className="truncate text-[11px] leading-4 text-muted-foreground" title={auditFieldLabel(change.field)}>
            {auditFieldLabel(change.field)}
          </dt>
          <dd
            className="min-w-0 truncate text-[11px] leading-4"
            title={change.from ? `${prettyValue(change.from)} → ${prettyValue(change.to)}` : prettyValue(change.to)}
          >
            {change.from ? (
              <>
                <span className="text-muted-foreground">{prettyValue(change.from)}</span>
                <span className="px-1 text-muted-foreground/50">→</span>
                <span className="font-medium text-foreground">{prettyValue(change.to)}</span>
              </>
            ) : (
              <span className="font-medium text-foreground">{prettyValue(change.to)}</span>
            )}
          </dd>
        </div>
      ))}
      {extra > 0 && (
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2">
          <dt />
          <dd className="text-[11px] leading-4 text-muted-foreground">+{extra} more</dd>
        </div>
      )}
    </dl>
  );
}

function ActivityMarker({ action }: { action?: AuditAction }) {
  const Icon = action ? ACTION_ICONS[action] : Circle;
  const variant = action ? auditActionVariant(action) : "neutral";
  const tone =
    variant in ACTION_TONE
      ? ACTION_TONE[variant as keyof typeof ACTION_TONE]
      : ACTION_TONE.neutral;

  return (
    <span
      className={cn("relative z-10 flex h-7 w-7 items-center justify-center rounded-full", tone.wrap)}
      title={action ? (AUDIT_ACTION_LABELS[action] ?? action) : "Activity"}
      aria-hidden
    >
      <Icon className={cn("h-3.5 w-3.5", tone.icon)} strokeWidth={1.75} />
    </span>
  );
}

function ActivityEntry({
  entry,
  showLine,
}: {
  entry: DashboardActivityItem;
  showLine: boolean;
}) {
  const action = entry.action as AuditAction | undefined;
  const title = entry.entityLabel || entityTypeLabel(entry.type);
  const changes = entry.changes ?? [];

  const body = (
    <>
      <ActivityMarker action={action} />

      <div className="min-w-0">
        <div className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-2">
          {entry.href ? (
            <span className="truncate text-[13px] font-medium leading-5 text-foreground group-hover:underline" title={title}>
              {title}
            </span>
          ) : (
            <p className="truncate text-[13px] font-medium leading-5 text-foreground" title={title}>{title}</p>
          )}
          <time
            dateTime={entry.timestamp}
            title={formatAuditWhen(entry.timestamp)}
            className="text-right text-[11px] leading-5 tabular-nums text-muted-foreground"
          >
            {activityTime(entry.timestamp)}
          </time>
        </div>

        <div className="mt-1 flex h-[18px] items-center gap-1.5">
          {action && (
            <StatusBadge variant={auditActionVariant(action)} size="sm">
              {AUDIT_ACTION_LABELS[action] ?? action}
            </StatusBadge>
          )}
          <span className="truncate text-[11px] leading-none text-muted-foreground" title={entityTypeLabel(entry.type)}>
            {entityTypeLabel(entry.type)}
          </span>
        </div>

        {entry.description && entry.description !== title && (
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-4 text-muted-foreground" title={entry.description}>
            {entry.description}
          </p>
        )}

        {changes.length > 0 && <ChangeRows changes={changes} />}

        {entry.user && (
          <div className="mt-2 flex h-5 items-center gap-2">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[9px] font-semibold tracking-wide text-neutral-500"
              title={entry.user}
              aria-hidden
            >
              {getAuditInitials(entry.user)}
            </span>
            <span className="min-w-0 truncate text-[11px] leading-none text-muted-foreground" title={entry.user}>
              {entry.user}
            </span>
          </div>
        )}
      </div>
    </>
  );

  return (
    <li className="relative">
      {showLine && (
        <div className="absolute bottom-0 left-[13px] top-7 w-px bg-border" aria-hidden />
      )}
      {entry.href ? (
        <Link to={entry.href} className="group grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 py-3">
          {body}
        </Link>
      ) : (
        <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 py-3">{body}</div>
      )}
    </li>
  );
}

export function DashboardActivityList({ entries }: { entries: DashboardActivityItem[] }) {
  const groups = useMemo(() => groupActivity(entries), [entries]);

  if (!entries.length) {
    return (
      <p className="px-4 py-10 text-center text-xs text-muted-foreground">No recent activity</p>
    );
  }

  return (
    <div className="px-4">
      {groups.map((group) => (
        <section key={group.label}>
          <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3 pt-3">
            <span />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </h3>
          </div>
          <ol>
            {group.items.map((entry, index) => (
              <ActivityEntry
                key={entry.id}
                entry={entry}
                showLine={index < group.items.length - 1}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function DashboardActivityRail({
  entries,
  href,
}: {
  entries: DashboardActivityItem[];
  href?: string;
}) {
  const { isDesktop } = useBreakpoints();
  const [open, setOpen] = useState(false);
  const expanded = isDesktop || open;

  return (
    <aside
      className={cn(
        "flex min-h-0 w-full shrink-0 flex-col border-border bg-card",
        "border-t lg:h-full lg:w-[300px] lg:border-l lg:border-t-0 xl:w-[320px]",
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-between gap-3 border-b border-border px-4",
          isDesktop ? APP_HEADER_HEIGHT : "h-12",
        )}
      >
        {isDesktop ? (
          <h2 className="min-w-0 truncate text-sm font-semibold text-foreground" title="Recent activity">Recent activity</h2>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            title={open ? "Hide recent activity" : "Show recent activity"}
            aria-expanded={open}
          >
            <h2 className="truncate text-sm font-semibold text-foreground" title="Recent activity">Recent activity</h2>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] tabular-nums text-muted-foreground">{entries.length}</span>
          {href && (
            <Link to={href} className="text-[11px] font-medium text-foreground hover:underline" title="View all activity">
              All
            </Link>
          )}
        </div>
      </div>
      {expanded && (
        <div
          className={cn(
            "min-h-0 overflow-y-auto overscroll-contain",
            isDesktop ? "flex-1" : "max-h-[min(28rem,55dvh)]",
          )}
        >
          <DashboardActivityList entries={entries} />
        </div>
      )}
    </aside>
  );
}
