import { useMemo, useState } from "react";
import {
  CalendarClock,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { canLogQuotationContact } from "@/features/sales/lib/quotationLifecycle";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  Quotation,
  QuotationContactEntry,
  QuotationContactType,
} from "@/types/quotation";
import type { QuotationContactInput } from "@/services/interfaces/quotationService";

const CONTACT_TYPE_OPTIONS: { value: QuotationContactType; label: string }[] = [
  { value: "call", label: "Phone call" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "meeting", label: "Meeting" },
  { value: "follow_up", label: "Follow-up" },
  { value: "comment", label: "Internal comment" },
];

const CUSTOMER_TYPES = new Set<QuotationContactType>([
  "call",
  "email",
  "whatsapp",
  "meeting",
  "follow_up",
]);

type HistoryFilter = "all" | "customer" | "internal";

function ContactIcon({ type }: { type: QuotationContactType }) {
  const className = "h-3.5 w-3.5 shrink-0";
  switch (type) {
    case "call":
      return <Phone className={className} />;
    case "email":
      return <Mail className={className} />;
    case "whatsapp":
      return <MessageCircle className={className} />;
    case "meeting":
      return <Users className={className} />;
    case "follow_up":
      return <CalendarClock className={className} />;
    default:
      return <MessageSquare className={className} />;
  }
}

function typeLabel(type: QuotationContactType): string {
  return CONTACT_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function isInternalComment(type: QuotationContactType): boolean {
  return type === "comment";
}

export { canLogQuotationContact };

export type QuotationContactDrawerProps = {
  open: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onAddContact?: (data: QuotationContactInput) => void | Promise<void>;
  isAdding?: boolean;
  initialType?: QuotationContactType;
};

export function QuotationContactDrawer({
  open,
  onClose,
  quotation,
  onAddContact,
  isAdding,
  initialType = "comment",
}: QuotationContactDrawerProps) {
  const canLog = quotation ? canLogQuotationContact(quotation.status) : false;
  const [type, setType] = useState<QuotationContactType>(initialType);
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [outcome, setOutcome] = useState("");
  const [filter, setFilter] = useState<HistoryFilter>("all");

  const entries = useMemo(() => {
    const sorted = [...(quotation?.contactHistory ?? [])].sort(
      (a, b) =>
        new Date(b.contactedAt).getTime() - new Date(a.contactedAt).getTime(),
    );
    if (filter === "internal") {
      return sorted.filter((entry) => isInternalComment(entry.type));
    }
    if (filter === "customer") {
      return sorted.filter((entry) => CUSTOMER_TYPES.has(entry.type));
    }
    return sorted;
  }, [filter, quotation?.contactHistory]);

  const internalCount = useMemo(
    () =>
      (quotation?.contactHistory ?? []).filter((entry) =>
        isInternalComment(entry.type),
      ).length,
    [quotation?.contactHistory],
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = summary.trim();
    if (!trimmed || !onAddContact || !canLog) return;
    await onAddContact({
      type,
      summary: trimmed,
      detail: detail.trim() || undefined,
      outcome: outcome.trim() || undefined,
    });
    setSummary("");
    setDetail("");
    setOutcome("");
    if (type === "comment") setFilter("internal");
  };

  const placeholder =
    type === "comment"
      ? "Internal note for the team (e.g. Pricing approved by manager — wait for customer reply)"
      : "Summary (e.g. Follow-up call about pricing)";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Communication Log"
      size="md"
    >
      {!quotation ? (
        <p className="text-sm text-muted-foreground">Select a quotation first.</p>
      ) : (
        <div className="flex h-full flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              {quotation.quotationNumber}
            </p>
            <p className="text-xs text-muted-foreground">{quotation.customerName}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Log customer calls and internal team comments here. Internal comments
              do not change quotation status or approvals.
            </p>
          </div>

          {canLog && onAddContact && (
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="space-y-2 rounded-md border border-border p-3"
            >
              <Select
                label="Log type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as QuotationContactType)
                }
                options={CONTACT_TYPE_OPTIONS}
              />
              <Textarea
                label={type === "comment" ? "Internal comment" : "Summary"}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder={placeholder}
                rows={3}
                disabled={isAdding}
              />
              {type !== "comment" && (
                <>
                  <Textarea
                    value={detail}
                    onChange={(event) => setDetail(event.target.value)}
                    placeholder="Details (optional)"
                    rows={2}
                    disabled={isAdding}
                  />
                  <Textarea
                    value={outcome}
                    onChange={(event) => setOutcome(event.target.value)}
                    placeholder="Outcome (optional)"
                    rows={1}
                    disabled={isAdding}
                  />
                </>
              )}
              {type === "comment" && (
                <Textarea
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  placeholder="Extra context (optional)"
                  rows={2}
                  disabled={isAdding}
                />
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={type === "comment" ? "primary" : "outline"}
                  size="sm"
                  leftIcon={<MessageSquare className="h-3.5 w-3.5" />}
                  disabled={isAdding}
                  onClick={() => setType("comment")}
                >
                  Internal comment
                </Button>
                <Button
                  type="button"
                  variant={type === "call" ? "primary" : "outline"}
                  size="sm"
                  leftIcon={<Phone className="h-3.5 w-3.5" />}
                  disabled={isAdding}
                  onClick={() => setType("call")}
                >
                  Call
                </Button>
                <Button
                  type="button"
                  variant={type === "email" ? "primary" : "outline"}
                  size="sm"
                  leftIcon={<Mail className="h-3.5 w-3.5" />}
                  disabled={isAdding}
                  onClick={() => setType("email")}
                >
                  Email
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isAdding}
                  disabled={!summary.trim()}
                  className="ml-auto"
                >
                  {type === "comment" ? "Post comment" : "Log contact"}
                </Button>
              </div>
            </form>
          )}

          <div className="min-h-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                History ({entries.length}
                {internalCount > 0 ? ` · ${internalCount} internal` : ""})
              </p>
              <div className="flex gap-1">
                {(
                  [
                    ["all", "All"],
                    ["customer", "Customer"],
                    ["internal", "Internal"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={filter === value ? "primary" : "outline"}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            {entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {filter === "internal"
                  ? "No internal comments yet. Use Internal comment to leave a team note."
                  : "No communication logged yet."}
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {entries.map((entry) => (
                  <ContactHistoryItem key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

function ContactHistoryItem({ entry }: { entry: QuotationContactEntry }) {
  const internal = isInternalComment(entry.type);
  return (
    <li className="flex gap-2.5 px-3 py-2.5">
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          internal
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground",
        )}
      >
        <ContactIcon type={entry.type} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {typeLabel(entry.type)}
          </span>
          {internal && (
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              Team only
            </span>
          )}
          <time className="ml-auto text-[11px] text-muted-foreground">
            {formatDateTime(entry.contactedAt)}
          </time>
        </div>
        <p className="text-sm font-medium text-foreground">{entry.summary}</p>
        {entry.detail && (
          <p className="mt-0.5 text-xs text-muted-foreground">{entry.detail}</p>
        )}
        <p className="mt-0.5 text-xs text-muted-foreground">
          by {entry.contactedByName}
          {entry.outcome ? ` · ${entry.outcome}` : ""}
        </p>
      </div>
    </li>
  );
}

export function QuotationContactTrigger({
  count,
  onClick,
  className,
}: {
  count: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("justify-start", className)}
      leftIcon={<MessageSquare className="h-4 w-4" />}
      onClick={onClick}
    >
      Communication Log
      {count > 0 ? ` (${count})` : ""}
    </Button>
  );
}
