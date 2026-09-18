import { useEffect, useState } from "react";
import {
  ACCESSORY_HANDLES_UPDATED_EVENT,
  loadAccessoryHandles,
  type AccessoryHandle,
} from "@/lib/accessoryHandles";

export function useAccessoryHandles(): AccessoryHandle[] {
  const [handles, setHandles] = useState(loadAccessoryHandles);

  useEffect(() => {
    const refresh = () => setHandles(loadAccessoryHandles());
    window.addEventListener(ACCESSORY_HANDLES_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ACCESSORY_HANDLES_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return handles;
}
