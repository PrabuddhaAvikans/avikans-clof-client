import type { ReactNode } from "react";
import { useSelector } from "react-redux";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from "react-router-dom";
import routeDefinitions from "@/app/config/routeDefinitions.json";
import type { Permission } from "@/app/config/permissions";
import { ROUTES } from "@/app/config/routes";
import type { RootState } from "@/app/store";
import { AppShell } from "@/components/layout/AppShell";
import { RequirePermission } from "@/components/layout/RequirePermission";
import { PAGE_REGISTRY, type PageKey } from "@/app/router/pageRegistry";
import { LoginPage } from "@/features/auth/pages/LoginPage";

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

function RequireAuth({ children }: { children: ReactNode }) {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

function LoginRoute() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
  const location = useLocation();
  const fromPath = (location.state as { from?: { pathname?: string } } | null)
    ?.from?.pathname;
  const redirectTo =
    fromPath && fromPath !== ROUTES.login ? fromPath : ROUTES.dashboard;

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <LoginPage />;
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
      <Route path={ROUTES.login} element={<LoginRoute />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
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
