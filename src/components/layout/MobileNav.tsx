import { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import type { NavItem } from "@/app/config/navigation";
import type { AppDispatch, RootState } from "@/app/store";
import { setMobileNavOpen } from "@/app/store/uiSlice";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { getNavIcon } from "@/components/layout/icon-map";
import {
  getDefaultExpandedGroups,
  getFilteredNavigation,
  isNavItemActive,
} from "@/components/layout/nav-utils";
import { usePermissions } from "@/hooks/usePermissions";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";

export function MobileNav() {
  const dispatch = useDispatch<AppDispatch>();
  const mobileNavOpen = useSelector(
    (state: RootState) => state.ui.mobileNavOpen,
  );
  const { pathname } = useLocation();
  const { canAccess } = usePermissions();

  const navigation = useMemo(
    () => getFilteredNavigation(canAccess),
    [canAccess],
  );

  const [expandedGroups, setExpandedGroups] = useState<string[]>(() =>
    getDefaultExpandedGroups(pathname),
  );

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    dispatch(setMobileNavOpen(false));
  }, [pathname, dispatch]);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const defaults = getDefaultExpandedGroups(pathname);
      return [...new Set([...prev, ...defaults])];
    });
  }, [pathname]);

  if (!mobileNavOpen) {
    return null;
  }

  const closeNav = () => dispatch(setMobileNavOpen(false));

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((groupId) => groupId !== id) : [...prev, id],
    );
  };

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-[1px]"
        aria-hidden
        onClick={closeNav}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className="relative flex h-full w-full max-w-sm flex-col bg-sidebar shadow-lg"
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          <div className="min-w-0">
            <BrandLogo className="h-9 max-w-[180px]" />
            <p className="mt-0.5 truncate text-[10px] text-sidebar-muted">
              Custom Lighting Product Management
            </p>
          </div>
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Close navigation menu"
            icon={<X className="h-5 w-5 text-sidebar-foreground" />}
            onClick={closeNav}
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobile navigation">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <MobileNavItem
                key={item.id}
                item={item}
                expandedGroups={expandedGroups}
                onToggleGroup={toggleGroup}
                onNavigate={closeNav}
              />
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}

type MobileNavItemProps = {
  item: NavItem;
  expandedGroups: string[];
  onToggleGroup: (id: string) => void;
  onNavigate: () => void;
};

function MobileNavItem({
  item,
  expandedGroups,
  onToggleGroup,
  onNavigate,
}: MobileNavItemProps) {
  const Icon = getNavIcon(item.icon);
  const hasChildren = Boolean(item.children && item.children.length > 0);
  const isExpanded = expandedGroups.includes(item.id);

  if (hasChildren && item.children) {
    return (
      <li>
        <button
          type="button"
          onClick={() => onToggleGroup(item.id)}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent"
          aria-expanded={isExpanded}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform",
              isExpanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        {isExpanded && (
          <ul className="mt-1 space-y-0.5 pl-4">
            {item.children.map((child) => (
              <li key={child.id}>
                <MobileNavLink
                  item={child}
                  onNavigate={onNavigate}
                  siblingPaths={item.children!.map((c) => c.path)}
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
      <MobileNavLink item={item} onNavigate={onNavigate} />
    </li>
  );
}

type MobileNavLinkProps = {
  item: NavItem;
  onNavigate: () => void;
  siblingPaths?: string[];
};

function MobileNavLink({ item, onNavigate, siblingPaths = [] }: MobileNavLinkProps) {
  const Icon = getNavIcon(item.icon);
  const { pathname } = useLocation();
  const active = isNavItemActive(item.path, pathname, siblingPaths);

  return (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      end={siblingPaths.length > 0}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {item.label}
    </NavLink>
  );
}
