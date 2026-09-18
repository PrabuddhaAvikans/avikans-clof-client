import { useEffect, useState } from "react";
import {
  loadUnitsOfMeasure,
  UNITS_OF_MEASURE_UPDATED_EVENT,
  type UnitOfMeasure,
} from "@/lib/unitsOfMeasure";

export function useUnitsOfMeasure(): UnitOfMeasure[] {
  const [units, setUnits] = useState(loadUnitsOfMeasure);

  useEffect(() => {
    const refresh = () => setUnits(loadUnitsOfMeasure());
    window.addEventListener(UNITS_OF_MEASURE_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(UNITS_OF_MEASURE_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return units;
}
