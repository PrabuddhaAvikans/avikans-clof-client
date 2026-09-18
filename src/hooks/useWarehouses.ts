import { useEffect, useState } from "react";
import {
  loadWarehouses,
  WAREHOUSES_UPDATED_EVENT,
  type Warehouse,
} from "@/lib/warehouses";

export function useWarehouses(): Warehouse[] {
  const [warehouses, setWarehouses] = useState(loadWarehouses);

  useEffect(() => {
    const refresh = () => setWarehouses(loadWarehouses());
    window.addEventListener(WAREHOUSES_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(WAREHOUSES_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return warehouses;
}
