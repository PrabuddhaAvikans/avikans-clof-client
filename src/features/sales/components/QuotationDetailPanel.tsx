import { Link } from "react-router-dom";
import { Copy, Package, Phone } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { AttachmentPanel } from "@/components/ui/AttachmentPanel";
import { Button } from "@/components/ui/Button";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { QuotationTotalsSummary } from "@/features/sales/components/QuotationTotalsSummary";
import { computeQuotationTotals } from "@/features/sales/schemas/quotationSchema";
import { getChangedSpecDiffs } from "@/lib/quotationCustomization";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  workspacePanelBody,
  workspacePanelEmpty,
  workspacePanelShell,
} from "@/lib/panelLayout";
import type { Address } from "@/types/common";
import type { Quotation } from "@/types/quotation";
import {
  QuotationCustomizationStatus,
  QuotationStatus,
} from "@/types/status";
import { quotationService } from "@/services";
import { useState } from "react";


function formatAddress(address: Address): string {
  return [address.line1, address.line2, `${address.city}, ${address.state} ${address.postalCode}`, address.country]
    .filter(Boolean)
    .join(", ");
}

function daysUntil(date: string): number | null {
  const target = new Date(date).getTime();
  if (Number.isNaN(target)) return null;
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

export type QuotationDetailPanelProps = {
  quotation: Quotation | null;
  onOpenContacts?: () => void;
  onQuotationUpdated?: (quotation: Quotation) => void;
  className?: string;
};

export function QuotationDetailPanel({
  quotation,
  onOpenContacts,
  onQuotationUpdated,
  className,
}: QuotationDetailPanelProps) {
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  if (!quotation) {
    return (
      <div className={cn(workspacePanelEmpty, className)}>
        <p className="text-sm text-muted-foreground">Select a quotation to view details.</p>
      </div>
    );
  }

  const remainingDays = daysUntil(quotation.validUntil);
  const totals = computeQuotationTotals(quotation.lineItems, quotation.discountAmount);
  const taxCountry =
    quotation.billingAddress?.country ||
    quotation.shippingAddress?.country ||
    DEFAULT_COUNTRY;

  const attachments = [
    { id: "att-1", name: "Layout Drawing.pdf", size: 245_000, type: "pdf" },
    { id: "att-2", name: "Technical Spec.pdf", size: 180_000, type: "pdf" },
  ];

  const handleApprove = async (lineItemId: string) => {
    setActionBusy(`approve-${lineItemId}`);
    try {
      const updated = await quotationService.approveLineCustomization(
        quotation.id,
        lineItemId,
      );
      onQuotationUpdated?.(updated);
      toast.success("Customization approved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve customization");
    } finally {
      setActionBusy(null);
    }
  };

  const handlePromote = async (lineItemId: string) => {
    setActionBusy(`promote-${lineItemId}`);
    try {
      const { quotation: updated, product } =
        await quotationService.promoteCustomizationToProductVersion(
          quotation.id,
          lineItemId,
        );
      onQuotationUpdated?.(updated);
      const version = product.versions[product.versions.length - 1];
      toast.success(`Created ${product.name} ${version.label} from customization`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create product version",
      );
    } finally {
      setActionBusy(null);
    }
  };

  return (
    <div className={cn(workspacePanelShell, className)}>
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Quotation & Order Conversion
              </h2>
              <MappedStatusBadge statusMap={QuotationStatus} value={quotation.status} dot />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                onClick={() => {
                  void navigator.clipboard.writeText(quotation.quotationNumber);
                  toast.success("Quotation number copied");
                }}
              >
                {quotation.quotationNumber}
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Created on {formatDateTime(quotation.createdAt)} by {quotation.createdByName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Valid till {formatDate(quotation.validUntil)}
              {remainingDays !== null && remainingDays >= 0
                ? ` (${remainingDays} days left)`
                : remainingDays !== null
                  ? " (expired)"
                  : ""}
            </p>
          </div>
          {onOpenContacts && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Phone className="h-4 w-4" />}
              onClick={onOpenContacts}
            >
              Calls & Contacts
              {(quotation.contactHistory?.length ?? 0) > 0
                ? ` (${quotation.contactHistory.length})`
                : ""}
            </Button>
          )}
        </div>
      </div>

      <div className={workspacePanelBody}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <section className="rounded-md border border-border p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Customer Information
            </h3>
            <dl className="space-y-1.5 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Customer Name</dt>
                <dd className="font-medium">{quotation.customerName}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="font-medium">{quotation.customerEmail}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Billing Address</dt>
                <dd className="font-medium leading-snug">
                  {formatAddress(quotation.billingAddress)}
                </dd>
              </div>
            </dl>
            <Link
              to={ROUTES.customers.detail(quotation.customerId)}
              className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
            >
              View Customer Profile
            </Link>
          </section>

          <section className="rounded-md border border-border p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Project Information
            </h3>
            <dl className="space-y-1.5 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Priority</dt>
                <dd className="font-medium capitalize">{quotation.priority}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Payment Status</dt>
                <dd className="font-medium capitalize">
                  {quotation.paymentStatus.replace(/_/g, " ")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Shipping Address</dt>
                <dd className="font-medium leading-snug">
                  {quotation.shippingAddress
                    ? formatAddress(quotation.shippingAddress)
                    : "Same as billing"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-md border border-border p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Financial Summary
            </h3>
            <QuotationTotalsSummary
              totals={totals}
              currency={quotation.currency}
              country={taxCountry}
            />
          </section>
        </div>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quotation Items
            </h3>
            <span className="text-xs text-muted-foreground">
              {quotation.lineItems.length} item
              {quotation.lineItems.length !== 1 ? "s" : ""}
            </span>
          </div>
          <ul className="divide-y divide-border rounded-md border border-border">
            {quotation.lineItems.map((item, index) => {
              const changedSpecs =
                item.isCustomized && item.customization
                  ? getChangedSpecDiffs(
                      item.customization.base.specifications,
                      item.customization.customizedSpecifications,
                    )
                  : [];

              return (
              <li key={item.id} className="flex gap-3 px-3 py-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-[11px] font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border bg-muted/40">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={ROUTES.products.detail(item.productId)}
                        className="truncate text-sm font-medium text-primary hover:underline"
                      >
                        {item.productName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {item.productSku}
                        {item.productVersionLabel
                          ? ` · ${item.productVersionLabel}`
                          : ""}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {item.isCustomized ? (
                          <MappedStatusBadge
                            statusMap={QuotationCustomizationStatus}
                            value={item.customization?.status ?? "draft"}
                            dot
                          />
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Standard</span>
                        )}
                      </div>
                      {item.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                      )}
                      {changedSpecs.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                          {changedSpecs.map((diff) => (
                            <li key={diff.key}>
                              {diff.label}: {diff.originalValue} →{" "}
                              <span className="text-foreground">{diff.customizedValue}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.isCustomized && item.customization && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.customization.status === "pending_approval" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              loading={actionBusy === `approve-${item.id}`}
                              onClick={() => void handleApprove(item.id)}
                            >
                              Approve Customization
                            </Button>
                          )}
                          {item.customization.status === "approved" &&
                            !item.customization.promotedProductVersionId && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[11px]"
                                loading={actionBusy === `promote-${item.id}`}
                                onClick={() => void handlePromote(item.id)}
                              >
                                Create Product Version
                              </Button>
                            )}
                          {item.customization.promotedProductVersionId && (
                            <span className="text-[11px] text-teal-700">
                              Promoted to master version
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="shrink-0 tabular-nums text-sm font-semibold">
                      {formatCurrency(item.lineTotal, quotation.currency)}
                    </p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>
                      Qty: <span className="text-foreground">{item.quantity}</span>
                    </span>
                    <span>
                      Unit:{" "}
                      <span className="text-foreground">
                        {formatCurrency(item.unitPrice, quotation.currency)}
                      </span>
                    </span>
                    <span>
                      Discount:{" "}
                      <span className="text-foreground">
                        {formatPercent(item.discountPercent, 0)}
                      </span>
                    </span>
                    <span>
                      Tax:{" "}
                      <span className="text-foreground">
                        {formatPercent(item.taxPercent, 0)}
                      </span>
                    </span>
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        </section>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <AttachmentPanel attachments={attachments} title="Attachments" />

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Notes</h3>
            </div>
            <div className="space-y-3 p-4 text-sm">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
                <p className="text-foreground">
                  {quotation.notes?.trim() || "No notes added."}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Terms & Conditions
                </p>
                <p className="text-foreground">
                  {quotation.termsAndConditions?.trim() || "Standard terms apply."}
                </p>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-border">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-foreground">Revision / Version History</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Save records a new version. Save Draft updates the current draft without changing the version number.
            </p>
          </div>
          <ul className="divide-y divide-border">
            {(quotation.revisions?.length
              ? [...quotation.revisions].sort((a, b) => b.versionNumber - a.versionNumber)
              : []
            ).map((revision) => (
              <li
                key={revision.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {revision.label}{" "}
                    {revision.isCurrent && (
                      <span className="text-xs font-normal text-primary">
                        {revision.isDraft ? "Current draft" : "Current"}
                      </span>
                    )}
                    {!revision.isCurrent && revision.isDraft && (
                      <span className="text-xs font-normal text-muted-foreground">Draft</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(revision.createdAt)} · {revision.createdByName}
                    {revision.notes ? ` · ${revision.notes}` : ""}
                  </p>
                </div>
                <p className="tabular-nums font-medium">
                  {formatCurrency(revision.totalAmount, revision.currency)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
