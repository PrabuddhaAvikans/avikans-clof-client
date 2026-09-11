import type { NavItem } from "@/app/config/navigation";
import { NAVIGATION } from "@/app/config/navigation";
import type { Permission } from "@/app/config/permissions";

type CanAccessFn = (permission?: Permission) => boolean;

export function filterNavItems(
  items: NavItem[],
  canAccess: CanAccessFn,
): NavItem[] {
  return items
    .map((item) => {
      if (item.children) {
        const children = filterNavItems(item.children, canAccess);
        if (children.length === 0) {
          return null;
        }
        return { ...item, children };
      }

      if (!canAccess(item.permission)) {
        return null;
      }

      return item;
    })
    .filter((item): item is NavItem => item !== null);
}

export function getFilteredNavigation(canAccess: CanAccessFn): NavItem[] {
  return filterNavItems(NAVIGATION, canAccess);
}

export function buildRouteLabelMap(): Map<string, string> {
  const map = new Map<string, string>();

  function addItems(items: NavItem[]): void {
    for (const item of items) {
      map.set(item.path, item.label);
      if (item.children) {
        addItems(item.children);
      }
    }
  }

  addItems(NAVIGATION);
  map.set("/", "Home");

  return map;
}

export function isNavItemActive(
  path: string,
  currentPath: string,
  siblingPaths: string[] = [],
): boolean {
  const matches =
    path === currentPath ||
    (path !== "/" && currentPath.startsWith(`${path}/`));

  if (!matches) {
    return false;
  }

  const hasMoreSpecificSibling = siblingPaths.some(
    (sibling) =>
      sibling !== path &&
      sibling.length > path.length &&
      (sibling === currentPath ||
        (sibling !== "/" && currentPath.startsWith(`${sibling}/`))),
  );

  return !hasMoreSpecificSibling;
}

export function getDefaultExpandedGroups(currentPath: string): string[] {
  return NAVIGATION.filter(
    (item) =>
      item.children &&
      item.children.some((child) => isNavItemActive(child.path, currentPath)),
  ).map((item) => item.id);
}
