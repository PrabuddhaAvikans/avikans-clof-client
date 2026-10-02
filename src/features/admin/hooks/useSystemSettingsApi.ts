import { useEpicMutation } from "@/app/store/async/useEpicMutation";
import { useEpicQuery } from "@/app/store/async/useEpicQuery";
import type { RootState } from "@/app/store";
import { systemSettingsActions } from "@/features/admin/store/systemSettingsSlice";
import type { SystemSettings } from "@/lib/systemSettings";

export function useSystemSettingsQuery() {
  return useEpicQuery<void, SystemSettings>({
    arg: undefined,
    getKey: () => "system-settings",
    request: systemSettingsActions.fetchRequest,
    selectEntry: (state, key) => state.systemSettings.current[key],
  });
}

export function useUpdateSystemSettings() {
  return useEpicMutation<Partial<SystemSettings>, SystemSettings>({
    request: systemSettingsActions.updateRequest,
    selectMutation: (state: RootState) => state.systemSettings.update,
  });
}
