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

export function canLogQuotationContact(status: Quotation["status"]): boolean {
  return (
    status !== "accepted" &&
    status !== "converted" &&
    status !== "rejected"
  );
}

export type QuotationContactDrawerProps = {
  open: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  onAddContact?: (data: QuotationContactInput) => void | Promise<void>;
  isAdding?: boolean;
};

export function QuotationContactDrawer({
  open,
  onClose,
  quotation,
  onAddContact,
  isAdding,
}: QuotationContactDrawerProps) {
  const canLog = quotation ? canLogQuotationContact(quotation.status) : false;
  const [type, setType] = useState<QuotationContactType>("call");
  const [summary, setSummary] = useState("");
  const [detail, setDetail] = useState("");
  const [outcome, setOutcome] = useState("");

  const entries = useMemo(
    () =>
      [...(quotation?.contactHistory ?? [])].sort(
        (a, b) =>
          new Date(b.contactedAt).getTime() - new Date(a.contactedAt).getTime(),
      ),
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
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Calls & Contacts"
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
              {canLog
                ? "Log calls and contacts until the quotation is approved."
                : "Contact logging is closed after approval."}
            </p>
          </div>

          {canLog && onAddContact && (
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="space-y-2 rounded-md border border-border p-3"
            >
              <Select
                label="Contact type"
                value={type}
                onChange={(event) =>
                  setType(event.target.value as QuotationContactType)
                }
                options={CONTACT_TYPE_OPTIONS}
              />
              <Textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder="Summary (e.g. Follow-up call about pricing)"
                rows={2}
                disabled={isAdding}
              />
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
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Phone className="h-3.5 w-3.5" />}
                  disabled={isAdding}
                  onClick={() => setType("call")}
                >
                  Call
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  loading={isAdding}
                  disabled={!summary.trim()}
                >
                  Log contact
                </Button>
              </div>
            </form>
          )}

          <div className="min-h-0 flex-1">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              History ({entries.length})
            </p>
            {entries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No calls or customer contacts logged yet.
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
  return (
    <li className="flex gap-2.5 px-3 py-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <ContactIcon type={entry.type} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {typeLabel(entry.type)}
          </span>
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
      leftIcon={<Phone className="h-4 w-4" />}
    >
      Calls & Contacts
      {count > 0 ? ` (${count})` : ""}
    </Button>
  );
}
