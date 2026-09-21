import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useSelector } from "react-redux";
import type { NavItem } from "@/app/config/navigation";
import type { RootState } from "@/app/store";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { getNavIcon } from "@/components/layout/icon-map";
import {
  getDefaultExpandedGroups,
  getFilteredNavigation,
  isNavItemActive,
} from "@/components/layout/nav-utils";
import { usePermissions } from "@/hooks/usePermissions";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { APP_HEADER_HEIGHT } from "@/lib/layout";
import { cn } from "@/lib/utils";

export type SidebarProps = {
  forceCollapsed?: boolean;
  className?: string;
};

export function Sidebar({ forceCollapsed = false, className }: SidebarProps) {
  const sidebarCollapsed = useSelector(
    (state: RootState) => state.ui.sidebarCollapsed,
  );
  const { pathname } = useLocation();
  const { canAccess } = usePermissions();
  const { appSubtitle } = useSystemSettings();

  const collapsed = forceCollapsed || sidebarCollapsed;
  const navigation = useMemo(
    () => getFilteredNavigation(canAccess),
    [canAccess],
  );

  const [expandedGroups, setExpandedGroups] = useState<string[]>(() =>
    getDefaultExpandedGroups(pathname),
  );

  useEffect(() => {
    setExpandedGroups((prev) => {
      const defaults = getDefaultExpandedGroups(pathname);
      return [...new Set([...prev, ...defaults])];
    });
  }, [pathname]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((groupId) => groupId !== id) : [...prev, id],
    );
  };

  return (
    <aside
      className={cn(
        "hidden h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-[248px]",
        className,
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center border-b border-sidebar-border",
          APP_HEADER_HEIGHT,
          collapsed ? "justify-center px-2" : "gap-2 px-4",
        )}
      >
        {collapsed ? (
          <BrandLogo compact />
        ) : (
          <div className="min-w-0">
            <BrandLogo className="h-7 max-w-full" />
            {appSubtitle ? (
              <p className="truncate text-[10px] leading-tight text-sidebar-muted" title={appSubtitle}>
                {appSubtitle}
              </p>
            ) : null}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Main navigation">
        <ul className="space-y-0.5">
          {navigation.map((item) => (
            <SidebarNavItem
              key={item.id}
              item={item}
              collapsed={collapsed}
              currentPath={pathname}
              expandedGroups={expandedGroups}
              onToggleGroup={toggleGroup}
            />
          ))}
        </ul>
      </nav>
    </aside>
  );
}

type SidebarNavItemProps = {
  item: NavItem;
  collapsed: boolean;
  currentPath: string;
  expandedGroups: string[];
  onToggleGroup: (id: string) => void;
};

function SidebarNavItem({
  item,
  collapsed,
  currentPath,
  expandedGroups,
  onToggleGroup,
}: SidebarNavItemProps) {
  const Icon = getNavIcon(item.icon);
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isExpanded = expandedGroups.includes(item.id);
  const isGroupActive =
    hasChildren &&
    item.children?.some((child) => isNavItemActive(child.path, currentPath));

  if (hasChildren && item.children) {
    if (collapsed) {
      return (
        <CollapsedNavGroup item={item} currentPath={currentPath} />
      );
    }

    return (
      <li className="mb-0.5">
        <button
          type="button"
          onClick={() => onToggleGroup(item.id)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors",
            isGroupActive
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
          )}
          title={item.label}
          aria-expanded={isExpanded}
        >
          <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <span className="flex-1 truncate text-left" title={item.label}>{item.label}</span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-sidebar-muted transition-transform",
              isExpanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {isExpanded && (
          <ul className="mt-0.5 space-y-0.5 pb-1 pl-2">
            {item.children.map((child) => (
              <li key={child.id}>
                <NavLinkItem
                  item={child}
                  collapsed={false}
                  indent
                  siblingPaths={item.children!.map((c) => c.path)}
                  currentPath={currentPath}
                />
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <NavLinkItem item={item} collapsed={collapsed} />
    </li>
  );
}

type CollapsedNavGroupProps = {
  item: NavItem;
  currentPath: string;
};

function CollapsedNavGroup({ item, currentPath }: CollapsedNavGroupProps) {
  const Icon = getNavIcon(item.icon);
  const children = item.children ?? [];
  const [open, setOpen] = useState(false);
  const [flyoutStyle, setFlyoutStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isGroupActive = children.some((child) =>
    isNavItemActive(child.path, currentPath),
  );
  const siblingPaths = children.map((child) => child.path);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const flyoutHeight = flyoutRef.current?.offsetHeight ?? children.length * 36 + 40;
    const maxTop = Math.max(8, window.innerHeight - flyoutHeight - 8);
    const top = Math.min(Math.max(8, rect.top), maxTop);

    setFlyoutStyle({
      position: "fixed",
      top,
      left: rect.right + gap,
      zIndex: 50,
    });
  }, [children.length]);

  const openFlyout = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    setOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => setOpen(false), 150);
  };

  useLayoutEffect(() => {
    if (open) {
      updatePosition();
    }
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleReposition = () => updatePosition();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        flyoutRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    setOpen(false);
  }, [currentPath]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  return (
    <li onMouseEnter={openFlyout} onMouseLeave={scheduleClose}>
      <button
        ref={triggerRef}
        type="button"
        title={item.label}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={item.label}
        onClick={() => {
          if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
          }
          setOpen(true);
        }}
        className={cn(
          "relative flex w-full items-center justify-center rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors",
          isGroupActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-blue-600"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      </button>
      {open &&
        createPortal(
          <div
            ref={flyoutRef}
            role="group"
            aria-label={`${item.label} submenu`}
            style={flyoutStyle}
            onMouseEnter={openFlyout}
            onMouseLeave={scheduleClose}
            className="min-w-[208px] max-w-[260px] rounded-md border border-sidebar-border bg-sidebar py-1 shadow-md"
          >
            <p className="truncate px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-muted" title={item.label}>
              {item.label}
            </p>
            <ul className="max-h-[min(70vh,420px)] space-y-0.5 overflow-y-auto px-1.5 pb-1">
              {children.map((child) => (
                <li key={child.id}>
                  <NavLinkItem
                    item={child}
                    collapsed={false}
                    siblingPaths={siblingPaths}
                    currentPath={currentPath}
                    onNavigate={() => setOpen(false)}
                  />
                </li>
              ))}
            </ul>
          </div>,
          document.body,
        )}
    </li>
  );
}

type NavLinkItemProps = {
  item: NavItem;
  collapsed: boolean;
  indent?: boolean;
  title?: string;
  siblingPaths?: string[];
  currentPath?: string;
  onNavigate?: () => void;
};

function NavLinkItem({
  item,
  collapsed,
  indent,
  title,
  siblingPaths = [],
  currentPath,
  onNavigate,
}: NavLinkItemProps) {
  const Icon = getNavIcon(item.icon);
  const { pathname } = useLocation();
  const path = currentPath ?? pathname;
  const active = isNavItemActive(item.path, path, siblingPaths);

  return (
    <NavLink
      to={item.path}
      title={title ?? item.label}
      end={siblingPaths.length > 0}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
        indent && "ml-2 pl-2.5 text-[12.5px] font-normal",
        collapsed && "justify-center px-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-orange-400"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      {indent ? (
        <span
          className={cn(
            "ml-0.5 mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current",
            active ? "opacity-100" : "opacity-45",
          )}
          aria-hidden
        />
      ) : (
        <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      )}
      {!collapsed && <span className="truncate" title={item.label}>{item.label}</span>}
    </NavLink>
  );
}
