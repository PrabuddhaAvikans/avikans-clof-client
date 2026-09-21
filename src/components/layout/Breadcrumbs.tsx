import { Fragment, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { buildRouteLabelMap } from "@/components/layout/nav-utils";
import { cn } from "@/lib/utils";

export type BreadcrumbsProps = {
  className?: string;
};

export function Breadcrumbs({ className }: BreadcrumbsProps) {
  const { pathname } = useLocation();
  const labelMap = useMemo(() => buildRouteLabelMap(), []);

  const crumbs = useMemo(() => {
    if (pathname === ROUTES.dashboard) {
      return [{ label: "Dashboard", path: ROUTES.dashboard }];
    }

    const segments = pathname.split("/").filter(Boolean);
    const items: { label: string; path: string }[] = [
      { label: "Home", path: ROUTES.dashboard },
    ];

    let accumulated = "";
    for (const segment of segments) {
      accumulated += `/${segment}`;
      const label = labelMap.get(accumulated) ?? formatSegmentLabel(segment);
      items.push({ label, path: accumulated });
    }

    return items;
  }, [pathname, labelMap]);

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <Fragment key={crumb.path}>
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              <li>
                {isLast ? (
                  <span className="font-medium text-foreground" title={crumb.label}>{crumb.label}</span>
                ) : (
                  <Link
                    to={crumb.path}
                    title={crumb.label}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {index === 0 && <Home className="h-3.5 w-3.5" aria-hidden />}
                    {crumb.label}
                  </Link>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

function formatSegmentLabel(segment: string): string {
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
