import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button } from "@/components/ui/Button";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import { SendQuotationModal } from "@/features/sales/components/SendQuotationModal";
import { QuotationTotalsSummary } from "@/features/sales/components/QuotationTotalsSummary";
import { computeLineAmounts, computeQuotationTotals } from "@/features/sales/schemas/quotationSchema";
import { useQuotation } from "@/features/sales/hooks/useQuotations";
import { getCountryConfig } from "@/lib/countryConfig";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { formatCurrency, formatDate } from "@/lib/format";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { buildQuotationDocument } from "@/features/sales/lib/quotationDocument";
import { loadSystemSettings } from "@/lib/systemSettings";
import { QuotationStatus } from "@/types/status";

export function QuotationPreviewPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sendOpen, setSendOpen] = useState(false);

  const { data: quotation, isLoading, error } = useQuotation(id);
  const totals = quotation
    ? computeQuotationTotals(quotation.lineItems, quotation.discountAmount)
    : null;
  const taxCountry =
    quotation?.billingAddress?.country ||
    quotation?.shippingAddress?.country ||
    DEFAULT_COUNTRY;
  const { taxName } = getCountryConfig(taxCountry);
  const company = loadSystemSettings();
  const quotationDocument = quotation ? buildQuotationDocument(quotation, company) : null;

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
                  {quotationDocument && <DocumentActions document={quotationDocument} />}
                  <MappedStatusBadge statusMap={QuotationStatus} value={quotation.status} dot />
                  {quotation.status === "draft" && (
                    <Button variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => navigate(ROUTES.quotations.edit(quotation.id))}>
                      Edit
                    </Button>
                  )}
                </>
              }
            />

            <article className="mx-auto max-w-4xl rounded-lg border border-border bg-card p-8 shadow-sm print:shadow-none">
              <header className="mb-8 flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
                <div>
                  <BrandLogo className="mb-4 h-11 max-w-[180px]" />
                  <h1 className="text-2xl font-bold text-primary">{company.companyName}</h1>
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {[
                      company.tagline,
                      company.address,
                      [company.email, company.phone].filter(Boolean).join(" | "),
                      company.taxRegistration,
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-lg font-semibold">QUOTATION</p>
                  <p className="font-mono">{quotation.quotationNumber}</p>
                  <p className="mt-2 text-muted-foreground">Date: {formatDate(quotation.createdAt)}</p>
                  <p className="text-muted-foreground">Valid Until: {formatDate(quotation.validUntil)}</p>
                </div>
              </header>

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

              <table className="mb-8 w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/40">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Discount %</th>
                    <th className="px-3 py-2 text-right">Excl. {taxName}</th>
                    <th className="px-3 py-2 text-right">{taxName}</th>
                    <th className="px-3 py-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.lineItems.map((item, index) => {
                    const amounts = computeLineAmounts(item);
                    return (
                    <tr key={item.id} className="border-b border-border">
                      <td className="px-3 py-2">{index + 1}</td>
                      <td className="px-3 py-2">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-xs text-muted-foreground">{item.productSku}</p>
                      </td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice, quotation.currency)}</td>
                      <td className="px-3 py-2 text-right">{item.discountPercent}%</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(amounts.net, quotation.currency)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(amounts.tax, quotation.currency)}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(amounts.total, quotation.currency)}</td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>

              {totals && (
                <div className="mb-8 flex justify-end">
                  <div className="w-72 rounded-md border border-border p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Order Summary
                    </p>
                    <QuotationTotalsSummary
                      totals={totals}
                      currency={quotation.currency}
                      country={taxCountry}
                    />
                  </div>
                </div>
              )}

              {quotation.termsAndConditions && (
                <section className="mb-8">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Terms & Conditions</h2>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">{quotation.termsAndConditions}</p>
                </section>
              )}

              <footer className="mt-12 grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
                <div>
                  <div className="mb-2 h-16 border-b border-border" />
                  <p className="text-sm font-medium">Authorized Signature</p>
                  <p className="text-xs text-muted-foreground">{company.companyName}</p>
                </div>
                <div>
                  <div className="mb-2 h-16 border-b border-border" />
                  <p className="text-sm font-medium">Customer Acceptance</p>
                  <p className="text-xs text-muted-foreground">{quotation.customerName}</p>
                </div>
              </footer>

              <footer className="mt-10 border-t-2 border-[#f7941d] pt-4 text-[#231f20]">
                <div className="flex items-center gap-4">
                  <BrandLogo className="h-8 max-w-[148px]" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold tracking-wide">{company.companyName}</p>
                    <p className="mt-1 text-xs leading-relaxed">
                      {[company.tagline, company.address, company.phone, company.email, company.website]
                        .filter(Boolean)
                        .join("  |  ")}
                    </p>
                  </div>
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
