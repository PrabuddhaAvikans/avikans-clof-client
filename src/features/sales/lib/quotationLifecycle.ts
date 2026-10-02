import type { QuotationStatusValue } from "@/types/status";

const EDITABLE: ReadonlySet<QuotationStatusValue> = new Set([
  "draft",
  "ready_to_send",
  "sent",
  "viewed",
  "customer_feedback",
  "revision_required",
  "revised",
  "accepted",
]);

const DELETABLE: ReadonlySet<QuotationStatusValue> = new Set(["draft", "ready_to_send"]);

const SENDABLE: ReadonlySet<QuotationStatusValue> = new Set([
  "draft",
  "ready_to_send",
  "revised",
  "revision_required",
  "customer_feedback",
  "viewed",
  "sent",
]);

const CONVERTIBLE: ReadonlySet<QuotationStatusValue> = new Set(["accepted"]);

const APPROVABLE: ReadonlySet<QuotationStatusValue> = new Set([
  "sent",
  "viewed",
  "customer_feedback",
  "revision_required",
  "revised",
]);

const REJECTABLE: ReadonlySet<QuotationStatusValue> = new Set([
  "sent",
  "viewed",
  "customer_feedback",
  "revision_required",
  "revised",
  "ready_to_send",
]);

const FEEDBACKABLE: ReadonlySet<QuotationStatusValue> = new Set(["sent", "viewed"]);

const REVISION_REQUESTABLE: ReadonlySet<QuotationStatusValue> = new Set([
  "sent",
  "viewed",
  "customer_feedback",
  "revised",
  "accepted",
]);

export function canEditQuotation(status: QuotationStatusValue): boolean {
  return EDITABLE.has(status);
}

export function canDeleteQuotation(status: QuotationStatusValue): boolean {
  return DELETABLE.has(status);
}

export function canSendQuotation(status: QuotationStatusValue): boolean {
  return SENDABLE.has(status);
}

export function canConvertQuotation(status: QuotationStatusValue): boolean {
  return CONVERTIBLE.has(status);
}

export function canLogQuotationContact(_status: QuotationStatusValue): boolean {
  return true;
}

export function canApproveQuotation(status: QuotationStatusValue): boolean {
  return APPROVABLE.has(status);
}

export function canRejectQuotation(status: QuotationStatusValue): boolean {
  return REJECTABLE.has(status);
}

export function canMarkCustomerFeedback(status: QuotationStatusValue): boolean {
  return FEEDBACKABLE.has(status);
}

export function canRequestRevision(status: QuotationStatusValue): boolean {
  return REVISION_REQUESTABLE.has(status);
}

export function isIssuedQuotation(status: QuotationStatusValue): boolean {
  return (
    status === "sent" ||
    status === "viewed" ||
    status === "customer_feedback" ||
    status === "revision_required" ||
    status === "revised" ||
    status === "accepted"
  );
}
