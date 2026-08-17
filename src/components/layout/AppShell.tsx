import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/app/store";
import { closeRightDrawer, setSidebarCollapsed } from "@/app/store/uiSlice";
import { AppFooter } from "@/components/layout/AppFooter";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { useBreakpoints } from "@/hooks/useMediaQuery";
import { Drawer } from "@/components/ui/Drawer";

export function AppShell() {
  const dispatch = useDispatch<AppDispatch>();
  const rightDrawer = useSelector((state: RootState) => state.ui.rightDrawer);
  const { isMobile, isTablet } = useBreakpoints();

  useEffect(() => {
    if (isTablet) {
      dispatch(setSidebarCollapsed(true));
    } else if (!isMobile) {
      dispatch(setSidebarCollapsed(false));
    }
  }, [isTablet, isMobile, dispatch]);

  return (
    <div className="flex h-dvh bg-background">
      {!isMobile && <Sidebar forceCollapsed={isTablet} />}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header />

        <main className="min-h-0 flex-1 overflow-y-auto bg-background">
          <Outlet />
        </main>

        <AppFooter />
      </div>

      <MobileNav />

      <Drawer
        open={rightDrawer.open}
        onClose={() => dispatch(closeRightDrawer())}
        title={rightDrawer.title || "Details"}
        size="lg"
      >
        {rightDrawer.contentId ? (
          <p className="text-sm text-muted-foreground">
            Drawer content for &ldquo;{rightDrawer.contentId}&rdquo;
            {rightDrawer.entityId ? ` (${rightDrawer.entityId})` : ""}.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No content selected.</p>
        )}
      </Drawer>
    </div>
  );
}
