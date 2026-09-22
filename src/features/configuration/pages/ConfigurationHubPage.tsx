import { Link } from "react-router-dom";
import {
  Building2,
  FolderTree,
  Ruler,
  Settings,
  Tag,
  Workflow,
} from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import type { Permission } from "@/app/config/permissions";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { usePermissions } from "@/hooks/usePermissions";

const CONFIG_ITEMS: {
  title: string;
  description: string;
  path: string;
  icon: typeof Ruler;
  permission: Permission;
}[] = [
  {
    title: "Units of Measure",
    description: "Codes used on inventory items, such as pcs, kg, and hrs.",
    path: ROUTES.configuration.units,
    icon: Ruler,
    permission: "inventory:view",
  },
  {
    title: "Warehouses",
    description: "Warehouse list used when creating and editing inventory items.",
    path: ROUTES.configuration.warehouses,
    icon: Building2,
    permission: "inventory:view",
  },
  {
    title: "Categories",
    description: "Product categories used on the catalog and product forms.",
    path: ROUTES.configuration.categories,
    icon: FolderTree,
    permission: "categories:view",
  },
  {
    title: "Brands",
    description: "Product brands and manufacturers used on the catalog.",
    path: ROUTES.configuration.brands,
    icon: Tag,
    permission: "products:view",
  },
  {
    title: "Workflows",
    description: "Activate an old or new costing approval flow for new orders.",
    path: ROUTES.configuration.workflows,
    icon: Workflow,
    permission: "settings:view",
  },
  {
    title: "System Settings",
    description: "Company, regional, tax, and costing rate defaults.",
    path: ROUTES.configuration.settings,
    icon: Settings,
    permission: "settings:view",
  },
];

export function ConfigurationHubPage() {
  const { hasPermission } = usePermissions();
  const items = CONFIG_ITEMS.filter((item) => hasPermission(item.permission));

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Configuration"
        description="Initial setup used by inventory, products, costing, and workflows."
        breadcrumbs={[{ label: "Configuration" }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="rounded-md border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-foreground">{item.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
