import {
  computeLineAmounts,
  computeQuotationTotals,
} from "@/features/sales/schemas/quotationSchema";
import {
  companyDetailLines,
  documentLetterFooter,
  documentLogoUrl,
  type CommercialDocument,
} from "@/lib/commercialDocument";
import { getCountryConfig, getTaxBreakdownLines, resolveEffectiveTaxRate } from "@/lib/countryConfig";
import { DEFAULT_COUNTRY } from "@/lib/countries";
import { formatCurrency, formatDate } from "@/lib/format";
import type { SystemSettings } from "@/lib/systemSettings";
import type { Address } from "@/types/common";
import type { Quotation } from "@/types/quotation";

function addressLines(address: Address): string[] {
  return [
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(" "),
    address.country,
  ].filter((line): line is string => Boolean(line?.trim()));
}

export function buildQuotationDocument(
  quotation: Quotation,
  company: SystemSettings,
): CommercialDocument {
  const totals = computeQuotationTotals(quotation.lineItems, quotation.discountAmount);
  const country =
    quotation.billingAddress?.country ||
    quotation.shippingAddress?.country ||
    DEFAULT_COUNTRY;
  const { taxName } = getCountryConfig(country);
  const money = (amount: number) => formatCurrency(amount, quotation.currency);
  const summary: CommercialDocument["totals"] = [
    {
      label: totals.discountAmount > 0 ? `Subtotal after item discounts` : `Subtotal (excl. ${taxName})`,
      value: money(totals.subtotal),
    },
  ];

  if (totals.discountAmount > 0) {
    summary.push({
      label: "Additional discount",
      value: `-${money(totals.discountAmount)}`,
    });
    summary.push({
      label: `Amount (excl. ${taxName})`,
      value: money(totals.taxableAmount),
    });
  }

  if (totals.taxAmount > 0) {
    const taxLines = getTaxBreakdownLines(
      totals.taxAmount,
      resolveEffectiveTaxRate(totals.taxAmount, totals.taxableAmount, country),
      country,
    );
    taxLines.forEach((line) => {
      summary.push({ label: line.label, value: money(line.amount) });
    });
  }
  summary.push({
    label: `Total (incl. ${taxName})`,
    value: money(totals.totalAmount),
    emphasize: true,
  });

  return {
    kind: "Quotation",
    number: quotation.quotationNumber,
    companyName: company.companyName,
    logoUrl: documentLogoUrl(company),
    companyLines: companyDetailLines(company),
    meta: [
      { label: "Date", value: formatDate(quotation.createdAt) },
      { label: "Valid until", value: formatDate(quotation.validUntil) },
    ],
    billTo: {
      heading: "Bill to",
      lines: [quotation.customerName, quotation.customerEmail, ...addressLines(quotation.billingAddress)],
    },
    shipTo: quotation.shippingAddress
      ? { heading: "Ship to", lines: addressLines(quotation.shippingAddress) }
      : undefined,
    columns: [
      { label: "#", width: 0.35, align: "left" },
      { label: "Description", width: 2.3, align: "left" },
      { label: "Qty", width: 0.5, align: "right" },
      { label: "Unit Price", width: 1.05, align: "right" },
      { label: "Disc %", width: 0.65, align: "right" },
      { label: `Excl. ${taxName}`, width: 1.05, align: "right" },
      { label: taxName, width: 0.9, align: "right" },
      { label: "Line Total", width: 1.1, align: "right" },
    ],
    rows: quotation.lineItems.map((item, index) => {
      const amounts = computeLineAmounts(item);
      return [
        String(index + 1),
        `${item.productName}\n${item.productSku}`,
        String(item.quantity),
        money(item.unitPrice),
        `${item.discountPercent}%`,
        money(amounts.net),
        money(amounts.tax),
        money(amounts.total),
      ];
    }),
    totals: summary,
    notes: quotation.notes,
    terms: quotation.termsAndConditions || company.paymentTerms,
    letterFooter: documentLetterFooter(company),
    signatures: [
      { label: "Authorized signature", name: company.companyName },
      { label: "Customer acceptance", name: quotation.customerName },
    ],
  };
}
