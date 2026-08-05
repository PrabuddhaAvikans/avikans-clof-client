import type { ReactNode } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import routeDefinitions from "@/app/config/routeDefinitions.json";
import type { Permission } from "@/app/config/permissions";
import { AppShell } from "@/components/layout/AppShell";
import { RequirePermission } from "@/components/layout/RequirePermission";
import { PAGE_REGISTRY, type PageKey } from "@/app/router/pageRegistry";

type RedirectHandler = "legacyEstimate";
type RedirectHandlerMode = "edit" | "preview";

type RouteDefinition = {
  path: string;
  page?: PageKey;
  permission?: Permission;
  redirect?: string;
  redirectHandler?: RedirectHandler;
  redirectHandlerMode?: RedirectHandlerMode;
};

type ProtectedRouteProps = {
  permission?: Permission;
  children: ReactNode;
};

function ProtectedRoute({ permission, children }: ProtectedRouteProps) {
  return <RequirePermission permission={permission}>{children}</RequirePermission>;
}

function LegacyEstimateRedirect({ mode }: { mode?: RedirectHandlerMode }) {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/quotations" replace />;
  if (mode === "edit") return <Navigate to={`/quotations/${id}/edit`} replace />;
  if (mode === "preview") return <Navigate to={`/quotations/${id}/preview`} replace />;
  return <Navigate to={`/quotations/${id}`} replace />;
}

function resolveRouteElement(route: RouteDefinition) {
  if (route.redirect) {
    return <Navigate to={route.redirect} replace />;
  }

  if (route.redirectHandler === "legacyEstimate") {
    return <LegacyEstimateRedirect mode={route.redirectHandlerMode} />;
  }

  if (!route.page) {
    return null;
  }

  const Page = PAGE_REGISTRY[route.page];
  if (!Page) {
    console.error(`[AppRouter] Unknown page key: ${route.page}`);
    return null;
  }

  const element = <Page />;
  if (!route.permission) return element;

  return <ProtectedRoute permission={route.permission}>{element}</ProtectedRoute>;
}

const routes = routeDefinitions.routes as RouteDefinition[];

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          index
          element={<Navigate to={routeDefinitions.indexRedirect} replace />}
        />
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={resolveRouteElement(route)}
          />
        ))}
      </Route>
    </Routes>
  );
}
