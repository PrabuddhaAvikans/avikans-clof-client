import type { MouseEvent, PointerEvent, ReactNode } from "react";
import { toast as sonnerToast } from "sonner";
import { AlertTriangle, Check, Info, Loader2, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const TOAST_DURATION_MS = 4800;

export type AppToastType = "success" | "error" | "warning" | "info" | "loading" | "message";

export type AppToastAction = {
  label: string;
  onClick: () => void;
};

type Tone = {
  icon: LucideIcon;
  accent: string;
  well: string;
};

const TONES: Record<AppToastType, Tone> = {
  success: {
    icon: Check,
    accent: "bg-success",
    well: "bg-success/10 text-success",
  },
  error: {
    icon: AlertTriangle,
    accent: "bg-destructive",
    well: "bg-destructive/10 text-destructive",
  },
  warning: {
    icon: AlertTriangle,
    accent: "bg-warning",
    well: "bg-warning/10 text-warning",
  },
  info: {
    icon: Info,
    accent: "bg-info",
    well: "bg-info/10 text-info",
  },
  loading: {
    icon: Loader2,
    accent: "bg-info",
    well: "bg-info/10 text-info",
  },
  message: {
    icon: Info,
    accent: "bg-primary",
    well: "bg-muted text-foreground",
  },
};

export type AppToastCardProps = {
  id: string | number;
  type: AppToastType;
  title: ReactNode;
  description?: ReactNode;
  action?: AppToastAction;
};

export function AppToastCard({ id, type, title, description, action }: AppToastCardProps) {
  const tone = TONES[type];
  const Icon = tone.icon;

  const dismiss = (event: MouseEvent | PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    sonnerToast.dismiss(id);
  };

  return (
    <div
      className={cn(
        "app-toast relative flex w-full items-start gap-3 overflow-hidden rounded-lg border border-border bg-card px-3.5 py-3 pl-4 font-sans shadow-md",
      )}
    >
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", tone.accent)} aria-hidden />

      <span
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          tone.well,
        )}
      >
        <Icon className={cn("h-4 w-4", type === "loading" && "animate-spin")} strokeWidth={2} />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        {description ? (
          <>
            <p className="text-sm font-semibold leading-5 break-words text-foreground">{title}</p>
            <p className="mt-0.5 text-[13px] leading-5 break-words text-muted-foreground">{description}</p>
          </>
        ) : (
          <p className="text-[13px] font-medium leading-5 break-words text-foreground">{title}</p>
        )}

        {action ? (
          <button
            type="button"
            className="mt-2.5 inline-flex h-7 items-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              action.onClick();
              sonnerToast.dismiss(id);
            }}
          >
            {action.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="relative z-10 inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label="Dismiss notification"
        title="Dismiss"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={dismiss}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}
