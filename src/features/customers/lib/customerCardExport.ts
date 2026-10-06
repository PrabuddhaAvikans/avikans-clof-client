import { downloadBlob, reportExportStamp } from "@/features/reports/lib/downloadFile";
import { formatAddressLines } from "@/features/customers/utils/customerAddressUtils";
import { CUSTOMER_TYPE_OPTIONS } from "@/features/shared/components/CustomerSelectorModal";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Customer } from "@/types/customer";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;

function toPdfText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .normalize("NFKD")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function pdfEscape(value: string): string {
  return toPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(value: string, maxChars: number): string[] {
  const words = toPdfText(value).split(/\s+/).filter(Boolean);
  if (!words.length) return ["-"];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function buildCustomerCardPdf(customer: Customer): string {
  const typeLabel =
    CUSTOMER_TYPE_OPTIONS.find((option) => option.value === customer.type)?.label ??
    customer.type;
  const primary =
    customer.contactPersons.find((person) => person.isPrimary) ?? customer.contactPersons[0];
  const billing =
    customer.billingAddresses[customer.activeBillingAddressIndex] ??
    customer.billingAddresses[0];
  const shipping = customer.deliverySameAsBilling
    ? billing
    : customer.shippingAddresses?.[customer.activeShippingAddressIndex ?? 0] ??
      customer.shippingAddresses?.[0];
  const billingLines = formatAddressLines(billing);
  const shippingLines = formatAddressLines(shipping);

  const rows: { label: string; value: string }[] = [
    { label: "Code", value: customer.code },
    { label: "Name", value: customer.name },
    { label: "Type", value: typeLabel },
    { label: "Status", value: customer.status },
    { label: "Email", value: customer.email },
    { label: "Phone", value: customer.phone },
    { label: "Contact", value: primary?.name ?? "-" },
    { label: "Contact email", value: primary?.email ?? "-" },
    { label: "Contact phone", value: primary?.phone ?? "-" },
    {
      label: "Billing",
      value: [billingLines.headline, ...billingLines.lines].filter(Boolean).join(", "),
    },
    {
      label: "Delivery",
      value: customer.deliverySameAsBilling
        ? "Same as billing"
        : [shippingLines.headline, ...shippingLines.lines].filter(Boolean).join(", "),
    },
    { label: "Tax ID", value: customer.taxId ?? "-" },
    {
      label: "Credit limit",
      value: formatCurrency(customer.creditLimit ?? 0, "LKR"),
    },
    { label: "Payment terms", value: `${customer.paymentTermsDays} days` },
    { label: "Total orders", value: String(customer.totalOrders) },
    {
      label: "Total revenue",
      value: formatCurrency(customer.totalRevenue, "LKR"),
    },
    { label: "Created", value: formatDate(customer.createdAt) },
    { label: "Updated", value: formatDate(customer.updatedAt) },
  ];

  let y = PAGE_H - MARGIN;
  let stream = "";
  const write = (text: string, x: number, size: number, bold = false) => {
    stream += `BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${pdfEscape(text)}) Tj ET\n`;
  };

  write("Customer Card", MARGIN, 16, true);
  y -= 18;
  write(customer.name || customer.code, MARGIN, 12, true);
  y -= 14;
  write(`Generated ${reportExportStamp()}`, MARGIN, 9);
  y -= 20;
  stream += `${MARGIN} ${y} ${PAGE_W - MARGIN * 2} 0.5 re f\n`;
  y -= 18;

  for (const row of rows) {
    const valueLines = wrap(row.value || "-", 62);
    const blockHeight = Math.max(14, valueLines.length * 12);
    if (y - blockHeight < MARGIN) break;
    write(row.label, MARGIN, 9);
    valueLines.forEach((line, index) => {
      write(line, MARGIN + 110, 9, index === 0);
      if (index < valueLines.length - 1) y -= 12;
    });
    y -= 16;
  }

  if (customer.notes?.trim()) {
    y -= 8;
    write("Notes", MARGIN, 10, true);
    y -= 14;
    for (const line of wrap(customer.notes, 80)) {
      if (y < MARGIN) break;
      write(line, MARGIN, 9);
      y -= 12;
    }
  }

  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [5 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
    "4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n",
  ];
  const body = stream;
  objects.push(
    `5 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources<< /Font<< /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>endobj\n`,
  );
  objects.push(`6 0 obj<< /Length ${body.length} >>stream\n${body}endstream\nendobj\n`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return pdf;
}

export function downloadCustomerCard(customer: Customer): void {
  const stem = (customer.code || customer.id || "customer-card").replace(/[^\w.-]+/g, "-");
  const blob = new Blob([buildCustomerCardPdf(customer)], { type: "application/pdf" });
  downloadBlob(blob, `${stem}-card-${reportExportStamp()}.pdf`);
}
