import { useEffect } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/app/store";
import { useAuthSession } from "@/features/auth/hooks/useAuthSession";
import { notificationsActions } from "@/features/admin/store/notificationsSlice";
import {
  NOTIFICATION_RECEIVED,
  NOTIFICATIONS_CHANGED,
  startNotificationsHub,
  stopNotificationsHub,
} from "@/services/notificationsHub";

/**
 * Keeps the notification inbox in sync via ASP.NET Core SignalR.
 * Invalidates list/unread caches whenever the server pushes an event for this user.
 */
export function useNotificationsRealtime() {
  const dispatch = useDispatch<AppDispatch>();
  const { isAuthenticated } = useAuthSession();

  useEffect(() => {
    if (!isAuthenticated) {
      void stopNotificationsHub();
      return;
    }

    let cancelled = false;

    const refresh = () => {
      dispatch(notificationsActions.invalidateAll());
    };

    void (async () => {
      try {
        const hub = await startNotificationsHub();
        if (cancelled) return;

        hub.off(NOTIFICATION_RECEIVED);
        hub.off(NOTIFICATIONS_CHANGED);
        hub.on(NOTIFICATION_RECEIVED, refresh);
        hub.on(NOTIFICATIONS_CHANGED, refresh);
        hub.onreconnected(() => refresh());
      } catch {
        // Hub may be unavailable during local API restarts; inbox still loads via REST.
      }
    })();

    return () => {
      cancelled = true;
      void stopNotificationsHub();
    };
  }, [dispatch, isAuthenticated]);
}
