import { useEffect, useMemo } from "react";
import {
  loadWarehouses,
  WAREHOUSES_UPDATED_EVENT,
  type Warehouse,
} from "@/lib/warehouses";
import { useWarehousesList } from "@/features/inventory/hooks/useWarehousesApi";

export function useWarehouses(): Warehouse[] {
  const { data, refetch } = useWarehousesList({ page: 1, pageSize: 200 });

  useEffect(() => {
    const refresh = () => refetch();
    window.addEventListener(WAREHOUSES_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(WAREHOUSES_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refetch]);

  return useMemo(() => {
    if (data?.items.length) return data.items;
    return loadWarehouses();
  }, [data]);
}
