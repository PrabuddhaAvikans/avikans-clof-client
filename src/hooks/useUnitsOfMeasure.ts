import { useEffect, useMemo } from "react";
import {
  loadUnitsOfMeasure,
  UNITS_OF_MEASURE_UPDATED_EVENT,
  type UnitOfMeasure,
} from "@/lib/unitsOfMeasure";
import { useUnitsOfMeasureList } from "@/features/inventory/hooks/useUnitsOfMeasureApi";

export function useUnitsOfMeasure(): UnitOfMeasure[] {
  const { data, refetch } = useUnitsOfMeasureList({ page: 1, pageSize: 200 });

  useEffect(() => {
    const refresh = () => refetch();
    window.addEventListener(UNITS_OF_MEASURE_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(UNITS_OF_MEASURE_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refetch]);

  return useMemo(() => {
    if (data?.items.length) return data.items;
    return loadUnitsOfMeasure();
  }, [data]);
}
