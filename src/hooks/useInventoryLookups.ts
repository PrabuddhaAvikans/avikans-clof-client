import { useEffect, useState } from "react";
import {
  addInventoryLookup,
  INVENTORY_LOOKUPS_UPDATED_EVENT,
  loadInventoryLookups,
  type InventoryLookupKind,
  type InventoryLookups,
} from "@/lib/inventoryLookups";

export function useInventoryLookups() {
  const [lookups, setLookups] = useState(loadInventoryLookups);

  useEffect(() => {
    const refresh = () => setLookups(loadInventoryLookups());
    window.addEventListener(INVENTORY_LOOKUPS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(INVENTORY_LOOKUPS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return {
    lookups,
    addLookup: (kind: InventoryLookupKind, value: string) => addInventoryLookup(kind, value),
  };
}

export type { InventoryLookups };
