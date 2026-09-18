import { useMemo, useState } from "react";
import {
  PERMISSION_MODULES,
  PERMISSIONS_BY_MODULE,
  type PermissionModule,
} from "@/app/config/permissions";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PERMISSION_MODULE_LABELS } from "@/features/admin/lib/permissionLabels";
import { useRoles } from "@/features/admin/hooks/useUsers";

export function PermissionsPage() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const { data: roles } = useRoles({ page: 1, pageSize: 50, status: "active" });

  const modules = Object.values(PERMISSION_MODULES) as PermissionModule[];
  const query = appliedSearch.trim().toLowerCase();

  const rolesByPermission = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const role of roles?.items ?? []) {
      for (const permission of role.permissions) {
        const current = map.get(permission) ?? [];
        current.push(role.name);
        map.set(permission, current);
      }
    }
    return map;
  }, [roles?.items]);

  const visibleModules = useMemo(() => {
    if (!query) return modules;
    return modules.filter((module) => {
      const label = PERMISSION_MODULE_LABELS[module].toLowerCase();
      if (label.includes(query) || module.includes(query)) return true;
      return PERMISSIONS_BY_MODULE[module].some((permission) =>
        permission.toLowerCase().includes(query),
      );
    });
  }, [modules, query]);

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Permissions"
        description="Catalog of system permissions and the active roles that include them."
        breadcrumbs={[{ label: "Administration" }, { label: "Permissions" }]}
      />

      <div className="mb-4">
        <FilterPanel
          variant="toolbar"
          onApply={() => setAppliedSearch(search)}
          onReset={() => {
            setSearch("");
            setAppliedSearch("");
          }}
        >
          <SearchBar
            label="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
            placeholder="Search modules or permissions..."
          />
        </FilterPanel>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Module</th>
              <th className="px-4 py-3">Permission</th>
              <th className="px-4 py-3">Used by roles</th>
            </tr>
          </thead>
          <tbody>
            {visibleModules.flatMap((module) =>
              PERMISSIONS_BY_MODULE[module]
                .filter((permission) =>
                  query
                    ? permission.toLowerCase().includes(query) ||
                      PERMISSION_MODULE_LABELS[module].toLowerCase().includes(query)
                    : true,
                )
                .map((permission, index, list) => (
                  <tr key={permission} className="border-b border-border last:border-0">
                    {index === 0 ? (
                      <td className="px-4 py-3 align-top font-medium" rowSpan={list.length}>
                        {PERMISSION_MODULE_LABELS[module]}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <StatusBadge variant="neutral" size="sm">
                        {permission}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {(rolesByPermission.get(permission) ?? []).join(", ") || "-"}
                    </td>
                  </tr>
                )),
            )}
            {visibleModules.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No permissions match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
