import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Download, Mail, Pencil } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { SendQuotationModal } from "@/features/sales/components/SendQuotationModal";
import { useQuotation } from "@/features/sales/hooks/useQuotations";
import { formatCurrency, formatDate } from "@/lib/format";
import { QuotationStatus } from "@/types/status";

export function QuotationPreviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sendOpen, setSendOpen] = useState(false);

  const { data: quotation, isLoading, error } = useQuotation(id);

  return (
    <PageContainer maxWidth="wide">
      <PageContent isLoading={isLoading} error={error ? "Quotation not found." : null}>
        {quotation && (
          <>
            <PageHeader
              title={`Quotation ${quotation.quotationNumber}`}
              breadcrumbs={[
                { label: "Quotations", href: ROUTES.quotations.list },
                { label: quotation.quotationNumber },
              ]}
              actions={
                <>
                  <MappedStatusBadge statusMap={QuotationStatus} value={quotation.status} dot />
                  {quotation.status === "draft" && (
                    <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => navigate(ROUTES.quotations.edit(quotation.id))}>
                      Edit
                    </Button>
                  )}
                  <Button variant="secondary" leftIcon={<Mail className="h-4 w-4" />} onClick={() => setSendOpen(true)}>
                    Send
                  </Button>
                  <Button variant="outline" leftIcon={<Download className="h-4 w-4" />} onClick={() => window.print()}>
                    Download PDF
                  </Button>
                </>
              }
            />

            <article className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-8 shadow-sm print:shadow-none">
              {/* Company Header */}
              <header className="mb-8 flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
                <div>
                  <h1 className="text-2xl font-bold text-primary">AVIKANS SOLUTION</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Premium Lighting & Manufacturing
                    <br />
                    Colombo, Sri Lanka
                    <br />
                    info@avikans.lk | +94 11 000 0000
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-lg font-semibold">QUOTATION</p>
                  <p className="font-mono">{quotation.quotationNumber}</p>
                  <p className="mt-2 text-muted-foreground">Date: {formatDate(quotation.createdAt)}</p>
                  <p className="text-muted-foreground">Valid Until: {formatDate(quotation.validUntil)}</p>
                </div>
              </header>

              {/* Customer */}
              <section className="mb-8 grid gap-6 sm:grid-cols-2">
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bill To</h2>
                  <p className="font-semibold">{quotation.customerName}</p>
                  <p className="text-sm text-muted-foreground">{quotation.customerEmail}</p>
                  <address className="mt-2 text-sm not-italic text-muted-foreground">
                    {quotation.billingAddress.line1}
                    <br />
                    {quotation.billingAddress.city}, {quotation.billingAddress.state} {quotation.billingAddress.postalCode}
                  </address>
                </div>
                {quotation.shippingAddress && (
                  <div>
                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ship To</h2>
                    <address className="text-sm not-italic text-muted-foreground">
                      {quotation.shippingAddress.line1}
                      <br />
                      {quotation.shippingAddress.city}, {quotation.shippingAddress.state}
                    </address>
                  </div>
                )}
              </section>

              {/* Line Items */}
              <table className="mb-8 w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Disc %</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.lineItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.productSku}</p>
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice, quotation.currency)}</td>
                      <td className="px-3 py-2 text-right">{item.discountPercent}%</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.lineTotal, quotation.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="mb-8 flex justify-end">
                <dl className="w-64 space-y-1 text-sm">
                  <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatCurrency(quotation.subtotal, quotation.currency)}</dd></div>
                  <div className="flex justify-between"><dt>Discount</dt><dd>-{formatCurrency(quotation.discountAmount, quotation.currency)}</dd></div>
                  <div className="flex justify-between"><dt>Tax</dt><dd>{formatCurrency(quotation.taxAmount, quotation.currency)}</dd></div>
                  <div className="flex justify-between border-t border-border pt-2 text-base font-bold"><dt>Total</dt><dd>{formatCurrency(quotation.totalAmount, quotation.currency)}</dd></div>
                </dl>
              </div>

              {/* Terms */}
              {quotation.termsAndConditions && (
                <section className="mb-8">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terms & Conditions</h2>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quotation.termsAndConditions}</p>
                </section>
              )}

              {/* Signature */}
              <footer className="mt-12 grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
                <div>
                  <div className="mb-2 h-16 border-b border-border" />
                  <p className="text-sm font-medium">Authorized Signature</p>
                  <p className="text-xs text-muted-foreground">AVIKANS SOLUTION</p>
                </div>
                <div>
                  <div className="mb-2 h-16 border-b border-border" />
                  <p className="text-sm font-medium">Customer Acceptance</p>
                  <p className="text-xs text-muted-foreground">{quotation.customerName}</p>
                </div>
              </footer>
            </article>

            <SendQuotationModal
              open={sendOpen}
              onClose={() => setSendOpen(false)}
              quotation={quotation}
              onSent={() => setSendOpen(false)}
            />
          </>
        )}
      </PageContent>
    </PageContainer>
  );
}
