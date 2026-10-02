import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import { permissionsActions } from "@/features/admin/store/permissionsSlice";
import type { PermissionCatalogDto } from "@/services/mappers/permissionMappers";

export function usePermissionCatalog() {
  return useEpicQuery<void, PermissionCatalogDto>({
    arg: undefined,
    getKey: () => "permission-catalog",
    request: permissionsActions.fetchCatalogRequest,
    selectEntry: (state, key) => state.permissions.catalog[key],
  });
}
