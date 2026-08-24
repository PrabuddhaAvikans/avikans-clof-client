import { generateId } from "@/services/http";
import type { Quotation, QuotationRevision } from "@/types/quotation";

export function formatQuotationRevisionLabel(versionNumber: number): string {
  return `v1.${Math.max(0, versionNumber - 1)}`;
}

export function createQuotationRevision(args: {
  versionNumber: number;
  isCurrent?: boolean;
  isDraft: boolean;
  totalAmount: number;
  currency: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}): QuotationRevision {
  return {
    id: generateId("qrev"),
    versionNumber: args.versionNumber,
    label: formatQuotationRevisionLabel(args.versionNumber),
    isCurrent: args.isCurrent ?? true,
    isDraft: args.isDraft,
    totalAmount: args.totalAmount,
    currency: args.currency,
    notes: args.notes,
    createdAt: args.createdAt,
    createdBy: args.createdBy,
    createdByName: args.createdByName,
  };
}

export function ensureQuotationRevisions(quotation: Quotation): QuotationRevision[] {
  if (quotation.revisions?.length) return quotation.revisions;

  return [
    createQuotationRevision({
      versionNumber: 1,
      isDraft: quotation.status === "draft",
      totalAmount: quotation.totalAmount,
      currency: quotation.currency,
      notes: quotation.status === "draft" ? "Initial draft" : "Initial version",
      createdAt: quotation.createdAt,
      createdBy: quotation.createdBy,
      createdByName: quotation.createdByName,
    }),
  ];
}

export function applyQuotationSaveMode(
  revisions: QuotationRevision[],
  saveMode: "draft" | "save",
  totals: { totalAmount: number; currency: string },
  actor: { at: string; id: string; name: string },
): QuotationRevision[] {
  const current = revisions.find((revision) => revision.isCurrent) ?? revisions[0];
  const nextNumber = Math.max(0, ...revisions.map((revision) => revision.versionNumber)) + 1;

  if (saveMode === "draft") {
    if (current?.isDraft) {
      return revisions.map((revision) =>
        revision.id === current.id
          ? {
              ...revision,
              isCurrent: true,
              totalAmount: totals.totalAmount,
              currency: totals.currency,
              notes: "Draft updated",
              createdAt: actor.at,
              createdBy: actor.id,
              createdByName: actor.name,
            }
          : { ...revision, isCurrent: false },
      );
    }

    return [
      createQuotationRevision({
        versionNumber: nextNumber,
        isDraft: true,
        totalAmount: totals.totalAmount,
        currency: totals.currency,
        notes: "Draft saved",
        createdAt: actor.at,
        createdBy: actor.id,
        createdByName: actor.name,
      }),
      ...revisions.map((revision) => ({ ...revision, isCurrent: false })),
    ];
  }

  if (current?.isDraft) {
    return revisions.map((revision) =>
      revision.id === current.id
        ? {
            ...revision,
            isDraft: false,
            isCurrent: true,
            totalAmount: totals.totalAmount,
            currency: totals.currency,
            notes: "Saved",
            createdAt: actor.at,
            createdBy: actor.id,
            createdByName: actor.name,
          }
        : { ...revision, isCurrent: false },
    );
  }

  return [
    createQuotationRevision({
      versionNumber: nextNumber,
      isDraft: false,
      totalAmount: totals.totalAmount,
      currency: totals.currency,
      notes: "Saved",
      createdAt: actor.at,
      createdBy: actor.id,
      createdByName: actor.name,
    }),
    ...revisions.map((revision) => ({ ...revision, isCurrent: false })),
  ];
}

export function currentQuotationRevision(
  revisions: QuotationRevision[] | undefined,
): QuotationRevision | undefined {
  return revisions?.find((revision) => revision.isCurrent) ?? revisions?.[0];
}
