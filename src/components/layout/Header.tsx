import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ClipboardList,
  Cog,
  FileText,
  HelpCircle,
  LogOut,
  Menu,
  Package,
  Plus,
  Search,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { ROUTES } from "@/app/config/routes";
import type { AppDispatch, RootState } from "@/app/store";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import {
  setGlobalSearchOpen,
  toggleGlobalSearchOpen,
  toggleMobileNavOpen,
  toggleSidebarCollapsed,
} from "@/app/store/uiSlice";
import { useBreakpoint } from "@/hooks/useMediaQuery";
import { usePermissions } from "@/hooks/usePermissions";
import { APP_HEADER_HEIGHT } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { IconButton } from "@/components/ui/IconButton";
import { Modal } from "@/components/ui/Modal";
import { SearchBar } from "@/components/ui/SearchBar";
import { NotificationCenter } from "@/features/admin/components/NotificationCenter";

const QUICK_CREATE_ITEMS = [
  { label: "Customer", path: ROUTES.customers.new, icon: Users },
  { label: "Product", path: ROUTES.products.new, icon: Package },
  { label: "Quotation", path: ROUTES.quotations.new, icon: FileText },
  { label: "Sales Order", path: ROUTES.salesOrders.new, icon: ClipboardList },
  { label: "Manufacturing Job", path: ROUTES.manufacturing.jobsNew, icon: Cog },
  { label: "Delivery", path: ROUTES.deliveries.new, icon: Truck },
] as const;

export function Header() {
  const dispatch = useDispatch<AppDispatch>();
  const globalSearchOpen = useSelector(
    (state: RootState) => state.ui.globalSearchOpen,
  );
  const user = useSelector((state: RootState) => state.auth.user);
  const { signOutUser } = useAuthSession();
  const { hasPermission } = usePermissions();
  const isMobile = !useBreakpoint("md");

  const [searchQuery, setSearchQuery] = useState("");
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const quickCreateRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        dispatch(toggleGlobalSearchOpen());
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        quickCreateRef.current &&
        !quickCreateRef.current.contains(event.target as Node)
      ) {
        setQuickCreateOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = () => {
    if (isMobile) {
      dispatch(toggleMobileNavOpen());
    } else {
      dispatch(toggleSidebarCollapsed());
    }
  };

  const handleLogout = () => {
    signOutUser();
    setProfileOpen(false);
    navigate(ROUTES.login);
  };

  const displayName = user?.displayName ?? "Guest";
  const role = user?.role ?? "User";

  const searchPlaceholder = useMemo(
    () => "Search customers, products, orders, jobs...",
    [],
  );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-5 lg:px-6",
          APP_HEADER_HEIGHT,
        )}
      >
        <IconButton
          variant="ghost"
          size="sm"
          aria-label={isMobile ? "Open navigation menu" : "Toggle sidebar"}
          icon={<Menu className="h-5 w-5" />}
          onClick={handleMenuClick}
        />

        <div className="mx-auto flex w-full max-w-xl flex-1 justify-center px-2">
          <SearchBar
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder={searchPlaceholder}
            showShortcutHint
            containerClassName="w-full"
            onFocus={() => dispatch(setGlobalSearchOpen(true))}
            readOnly
            className="h-9 cursor-pointer rounded-md border-border bg-muted/40"
          />
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <div ref={quickCreateRef} className="relative">
            <IconButton
              variant="outline"
              size="sm"
              aria-label="Quick create"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setQuickCreateOpen((open) => !open)}
              className="sm:hidden"
            />
            {quickCreateOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-1 w-52 rounded-md border border-border bg-popover py-1 shadow-md"
              >
                {QUICK_CREATE_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      to={item.path}
                      role="menuitem"
                      title={`Create ${item.label}`}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-muted"
                      onClick={() => setQuickCreateOpen(false)}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <NotificationCenter recipientId={user?.id ?? "usr-001"} />

          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Help and documentation"
            icon={<HelpCircle className="h-[18px] w-[18px]" />}
          />

          <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

          <div ref={profileRef} className="relative">
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted"
              onClick={() => setProfileOpen((open) => !open)}
              title={`${displayName} (${role})`}
              aria-label={`${displayName} account menu`}
              aria-expanded={profileOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                {displayName.charAt(0)}
              </span>
              <span className="hidden min-w-0 lg:block">
                <span className="block truncate text-[13px] font-medium text-foreground" title={displayName}>
                  {displayName}
                </span>
                <span className="block truncate text-[11px] text-muted-foreground" title={role}>
                  {role}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "hidden h-3.5 w-3.5 text-muted-foreground lg:block",
                  profileOpen && "rotate-180",
                )}
                aria-hidden
              />
            </button>
            {profileOpen && (
              <div
                role="menu"
                className="absolute right-0 z-50 mt-1 w-48 rounded-md border border-border bg-popover py-1 shadow-md"
              >
                <div className="border-b border-border px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{role}</p>
                </div>
                {hasPermission("users:view") && (
                  <button
                    type="button"
                    role="menuitem"
                    title="Users & roles"
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-muted"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate(ROUTES.admin.users);
                    }}
                  >
                    <UserCog className="h-4 w-4 text-muted-foreground" aria-hidden />
                    Users & roles
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  title="Log out"
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <Modal
        open={globalSearchOpen}
        onClose={() => dispatch(setGlobalSearchOpen(false))}
        title="Global Search"
        size="lg"
      >
        <div className="space-y-4">
          <SearchBar
            autoFocus
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder={searchPlaceholder}
            showShortcutHint
          />
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-4 py-10 text-center text-sm text-muted-foreground">
            <Search className="h-5 w-5" aria-hidden />
            <p>Start typing to search across customers, products, orders, and more.</p>
          </div>
        </div>
      </Modal>
    </>
  );
}
