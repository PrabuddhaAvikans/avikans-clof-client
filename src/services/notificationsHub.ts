import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from "@microsoft/signalr";
import {
  NOTIFICATION_RECEIVED,
  NOTIFICATIONS_CHANGED,
  NOTIFICATIONS_HUB_PATH,
} from "@/features/admin/lib/notificationRealtimeConstants";
import { getApiBaseUrl, getAuthToken } from "@/services/apiClient";

export { NOTIFICATION_RECEIVED, NOTIFICATIONS_CHANGED };

let connection: HubConnection | null = null;

function createConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl(`${getApiBaseUrl()}${NOTIFICATIONS_HUB_PATH}`, {
      accessTokenFactory: () => getAuthToken() ?? "",
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build();
}

export function getNotificationsHub(): HubConnection {
  if (!connection) {
    connection = createConnection();
  }
  return connection;
}

export async function startNotificationsHub(): Promise<HubConnection> {
  const hub = getNotificationsHub();
  if (
    hub.state === HubConnectionState.Connected ||
    hub.state === HubConnectionState.Connecting ||
    hub.state === HubConnectionState.Reconnecting
  ) {
    return hub;
  }

  await hub.start();
  return hub;
}

export async function stopNotificationsHub(): Promise<void> {
  if (!connection) return;
  const hub = connection;
  connection = null;
  if (hub.state !== HubConnectionState.Disconnected) {
    await hub.stop();
  }
}
