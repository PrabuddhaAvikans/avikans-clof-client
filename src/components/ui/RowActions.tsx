import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

export type RowActionItem = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Marks destructive items (delete) with danger styling in the menu */
  danger?: boolean;
  disabled?: boolean;
  /** Prefer showing as one of the visible icon buttons when space allows */
  primary?: boolean;
};

export type RowActionsProps = {
  actions: RowActionItem[];
  /** Max icon buttons shown before overflow dropdown. Default 3 */
  maxVisible?: number;
  className?: string;
  align?: "left" | "right";
};

/**
 * Shows up to `maxVisible` primary action icons; remaining actions open in a dropdown.
 */
export function RowActions({
  actions,
  maxVisible = 3,
  className,
  align = "right",
}: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const enabledActions = actions.filter(Boolean);

  const prioritized = [...enabledActions].sort((a, b) => {
    if (a.primary === b.primary) return 0;
    return a.primary ? -1 : 1;
  });

  const visible = prioritized.slice(0, maxVisible);
  const overflow = prioritized.slice(maxVisible);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (enabledActions.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative flex items-center gap-0.5", className)}
    >
      {visible.map((action) => (
        <IconButton
          key={action.id}
          size="sm"
          variant="ghost"
          icon={action.icon}
          aria-label={action.label}
          disabled={action.disabled}
          onClick={action.onClick}
          className={action.danger ? "text-destructive hover:text-destructive" : undefined}
        />
      ))}

      {overflow.length > 0 && (
        <>
          <IconButton
            size="sm"
            variant="ghost"
            icon={<MoreHorizontal className="h-4 w-4" />}
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((value) => !value)}
          />
          {open && (
            <div
              id={menuId}
              role="menu"
              className={cn(
                "absolute top-full z-40 mt-1 min-w-[11rem] rounded-md border border-border bg-popover py-1 shadow-md",
                align === "right" ? "right-0" : "left-0",
              )}
            >
              {overflow.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:pointer-events-none disabled:opacity-50",
                    action.danger
                      ? "text-destructive hover:bg-destructive/5"
                      : "text-foreground hover:bg-muted",
                  )}
                  onClick={() => {
                    setOpen(false);
                    action.onClick();
                  }}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5">
                    {action.icon}
                  </span>
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
