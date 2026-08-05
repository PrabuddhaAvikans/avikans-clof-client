import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, List } from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useDeliveries } from "@/features/delivery/hooks/useDeliveries";
import { statusVariant } from "@/features/shared/utils/statusBadge";
import { DeliveryStatus } from "@/types/status";

export function DeliveryCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { data, isLoading, error, refetch } = useDeliveries({
    page: 1,
    pageSize: 200,
  });

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const deliveriesByDate = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>["items"]>();
    for (const delivery of data?.items ?? []) {
      const key = format(new Date(delivery.scheduledDate), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(delivery);
      map.set(key, list);
    }
    return map;
  }, [data?.items]);

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Delivery Calendar"
        description="Schedule view of upcoming and past deliveries."
        breadcrumbs={[
          { label: "Delivery", href: ROUTES.deliveries.list },
          { label: "Calendar" },
        ]}
        actions={
          <Link to={ROUTES.deliveries.list}>
            <Button variant="outline" leftIcon={<List className="h-4 w-4" />}>
              List View
            </Button>
          </Link>
        }
      />

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load calendar" : null}
        onRetry={() => void refetch()}
      >
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ChevronLeft className="h-4 w-4" />}
              onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
            >
              Previous
            </Button>
            <h2 className="text-lg font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ChevronRight className="h-4 w-4" />}
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            >
              Next
            </Button>
          </div>

          <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="px-2 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayDeliveries = deliveriesByDate.get(key) ?? [];
              const inMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={key}
                  className={`min-h-24 border-b border-r border-border p-2 ${
                    !inMonth ? "bg-muted/20" : ""
                  }`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-primary font-semibold text-primary-foreground"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <ul className="mt-1 space-y-1">
                    {dayDeliveries.slice(0, 3).map((delivery) => (
                      <li key={delivery.id}>
                        <Link
                          to={ROUTES.deliveries.detail(delivery.id)}
                          className="block truncate rounded px-1 py-0.5 text-xs hover:bg-muted"
                        >
                          <StatusBadge
                            variant={statusVariant(DeliveryStatus, delivery.status)}
                            size="sm"
                            className="mr-1"
                          >
                            {delivery.deliveryNumber.split("-").pop()}
                          </StatusBadge>
                          <span className="text-muted-foreground">{delivery.customerName}</span>
                        </Link>
                      </li>
                    ))}
                    {dayDeliveries.length > 3 && (
                      <li className="px-1 text-xs text-muted-foreground">
                        +{dayDeliveries.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </PageContent>
    </PageContainer>
  );
}
