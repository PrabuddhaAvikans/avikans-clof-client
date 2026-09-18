import { useEffect, useState } from "react";
import {
  COST_CONFIGURATIONS_UPDATED_EVENT,
  loadCostConfigurations,
  type CostConfiguration,
} from "@/lib/costConfigurations";

export function useCostConfigurations(): CostConfiguration[] {
  const [configs, setConfigs] = useState(loadCostConfigurations);

  useEffect(() => {
    const refresh = () => setConfigs(loadCostConfigurations());
    window.addEventListener(COST_CONFIGURATIONS_UPDATED_EVENT, refresh);
    window.addEventListener("ats-costing-rates-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(COST_CONFIGURATIONS_UPDATED_EVENT, refresh);
      window.removeEventListener("ats-costing-rates-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return configs;
}
