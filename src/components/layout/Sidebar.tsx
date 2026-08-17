import { useEffect, useMemo, useState } from "react";
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
            <p className="truncate text-[10px] leading-tight text-sidebar-muted">
              Custom Lighting Product Management
            </p>
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
      const firstChild = item.children[0];
      return (
        <li>
          <NavLinkItem
            item={firstChild}
            collapsed={collapsed}
            title={`${item.label} - ${firstChild.label}`}
          />
        </li>
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
          aria-expanded={isExpanded}
        >
          <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <span className="flex-1 truncate text-left">{item.label}</span>
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

type NavLinkItemProps = {
  item: NavItem;
  collapsed: boolean;
  indent?: boolean;
  title?: string;
  siblingPaths?: string[];
  currentPath?: string;
};

function NavLinkItem({
  item,
  collapsed,
  indent,
  title,
  siblingPaths = [],
  currentPath,
}: NavLinkItemProps) {
  const Icon = getNavIcon(item.icon);
  const { pathname } = useLocation();
  const path = currentPath ?? pathname;
  const active = isNavItemActive(item.path, path, siblingPaths);

  return (
    <NavLink
      to={item.path}
      title={title ?? (collapsed ? item.label : undefined)}
      end={siblingPaths.length > 0}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
        indent && "ml-2 pl-2.5 text-[12.5px] font-normal",
        collapsed && "justify-center px-2",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-blue-600"
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
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}
