import { useEffect, useState } from "react";
import {
  COST_SHEET_HANDLES_UPDATED_EVENT,
  loadCostSheetHandles,
  type CostSheetHandle,
} from "@/lib/costSheetHandles";

export function useCostSheetHandles(): CostSheetHandle[] {
  const [handles, setHandles] = useState(loadCostSheetHandles);

  useEffect(() => {
    const refresh = () => setHandles(loadCostSheetHandles());
    window.addEventListener(COST_SHEET_HANDLES_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(COST_SHEET_HANDLES_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return handles;
}
