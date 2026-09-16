import { useEffect, useState } from "react";
import {
  loadSystemSettings,
  SYSTEM_SETTINGS_UPDATED_EVENT,
  type SystemSettings,
} from "@/lib/systemSettings";

export function useSystemSettings(): SystemSettings {
  const [settings, setSettings] = useState(loadSystemSettings);

  useEffect(() => {
    const refresh = () => setSettings(loadSystemSettings());
    window.addEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SYSTEM_SETTINGS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return settings;
}
