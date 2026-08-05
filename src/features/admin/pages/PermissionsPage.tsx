import {
  PERMISSION_MODULES,
  PERMISSIONS_BY_MODULE,
  type PermissionModule,
} from "@/app/config/permissions";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatusBadge } from "@/components/ui/StatusBadge";

const MODULE_LABELS: Record<PermissionModule, string> = {
  dashboard: "Dashboard",
  products: "Products",
  categories: "Categories",
  inventory: "Inventory",
  customers: "Customers",
  quotations: "Quotations",
  sales_orders: "Sales Orders",
  manufacturing: "Manufacturing",
  delivery: "Delivery",
  users: "Users",
  roles: "Roles",
  settings: "Settings",
  audit_logs: "Audit Logs",
};

export function PermissionsPage() {
  const modules = Object.values(PERMISSION_MODULES) as PermissionModule[];

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Permissions"
        description="Read-only overview of all system permissions by module."
        breadcrumbs={[{ label: "Administration" }, { label: "Permissions" }]}
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Permissions</th>
              <th className="px-4 py-3 text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            {modules.map((module) => (
              <tr key={module} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{MODULE_LABELS[module]}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {PERMISSIONS_BY_MODULE[module].map((perm) => (
                      <StatusBadge key={perm} variant="neutral" size="sm">
                        {perm}
                      </StatusBadge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {PERMISSIONS_BY_MODULE[module].length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
