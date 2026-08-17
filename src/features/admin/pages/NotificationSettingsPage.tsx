import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";

type Channel = "inApp" | "email" | "whatsapp" | "sms";

interface EventConfig {
  id: string;
  label: string;
  channels: Record<Channel, boolean>;
}

const INITIAL_EVENTS: EventConfig[] = [
  {
    id: "quotation_sent",
    label: "Quotation sent to customer",
    channels: { inApp: true, email: true, whatsapp: false, sms: false },
  },
  {
    id: "order_confirmed",
    label: "Sales order confirmed",
    channels: { inApp: true, email: true, whatsapp: true, sms: false },
  },
  {
    id: "job_started",
    label: "Manufacturing job started",
    channels: { inApp: true, email: false, whatsapp: false, sms: false },
  },
  {
    id: "job_completed",
    label: "Manufacturing job completed",
    channels: { inApp: true, email: true, whatsapp: false, sms: false },
  },
  {
    id: "delivery_dispatched",
    label: "Delivery dispatched",
    channels: { inApp: true, email: true, whatsapp: true, sms: true },
  },
  {
    id: "delivery_completed",
    label: "Delivery completed",
    channels: { inApp: true, email: true, whatsapp: true, sms: false },
  },
  {
    id: "low_stock",
    label: "Low stock alert",
    channels: { inApp: true, email: true, whatsapp: false, sms: false },
  },
  {
    id: "user_invited",
    label: "New user invitation",
    channels: { inApp: false, email: true, whatsapp: false, sms: false },
  },
];

const CHANNEL_LABELS: Record<Channel, string> = {
  inApp: "In-App",
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
};

export function NotificationSettingsPage() {
  const [events, setEvents] = useState(INITIAL_EVENTS);

  const toggleChannel = (eventId: string, channel: Channel) => {
    setEvents((prev) =>
      prev.map((event) =>
        event.id === eventId
          ? {
              ...event,
              channels: {
                ...event.channels,
                [channel]: !event.channels[channel],
              },
            }
          : event,
      ),
    );
  };

  const handleSave = () => {
    toast.success("Notification settings saved");
  };

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Notification Settings"
        description="Configure notification channels per event type."
        breadcrumbs={[{ label: "Administration" }, { label: "Notifications" }]}
      />

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Event</th>
              {(Object.keys(CHANNEL_LABELS) as Channel[]).map((channel) => (
                <th key={channel} className="px-4 py-3 text-center">
                  {CHANNEL_LABELS[channel]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium">{event.label}</td>
                {(Object.keys(CHANNEL_LABELS) as Channel[]).map((channel) => (
                  <td key={channel} className="px-4 py-3 text-center">
                    <Switch
                      checked={event.channels[channel]}
                      onChange={() => toggleChannel(event.id, channel)}
                      aria-label={`${event.label} - ${CHANNEL_LABELS[channel]}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        variant="primary"
        className="mt-6"
        leftIcon={<Save className="h-4 w-4" />}
        onClick={handleSave}
      >
        Save Notification Settings
      </Button>
    </PageContainer>
  );
}
