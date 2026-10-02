import type { Permission, PermissionModule } from "@/app/config/permissions";

export type PermissionDto = {
  module: string;
  action: string;
  code: string;
};

export type PermissionModuleGroupDto = {
  module: string;
  permissions: PermissionDto[];
};

export type PermissionCatalogDto = {
  permissions: PermissionDto[];
  byModule: PermissionModuleGroupDto[];
};

export interface PermissionCatalogService {
  getCatalog(): Promise<PermissionCatalogDto>;
  getByModule(): Promise<PermissionModuleGroupDto[]>;
}

export function mapCatalog(raw: Record<string, unknown>): PermissionCatalogDto {
  const permissions = ((raw.permissions as Record<string, unknown>[]) ?? []).map((p) => ({
    module: String(p.module),
    action: String(p.action),
    code: String(p.code),
  }));
  const byModule = ((raw.byModule as Record<string, unknown>[]) ?? []).map((g) => ({
    module: String(g.module),
    permissions: ((g.permissions as Record<string, unknown>[]) ?? []).map((p) => ({
      module: String(p.module),
      action: String(p.action),
      code: String(p.code),
    })),
  }));
  return { permissions, byModule };
}

export function mapPermissionModuleGroups(raw: unknown): PermissionModuleGroupDto[] {
  return (Array.isArray(raw) ? raw : []).map((g: Record<string, unknown>) => ({
    module: String(g.module),
    permissions: ((g.permissions as Record<string, unknown>[]) ?? []).map((p) => ({
      module: String(p.module),
      action: String(p.action),
      code: String(p.code),
    })),
  }));
}

export function catalogToPermissionsByModule(
  catalog: PermissionCatalogDto,
): Record<PermissionModule, Permission[]> {
  const result = {} as Record<PermissionModule, Permission[]>;
  for (const group of catalog.byModule) {
    result[group.module as PermissionModule] = group.permissions.map(
      (p) => p.code as Permission,
    );
  }
  return result;
}
