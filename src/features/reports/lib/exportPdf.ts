import { downloadBlob, reportExportStamp } from "@/features/reports/lib/downloadFile";
import { formatReportCell } from "@/features/reports/lib/exportCsv";
import { formatDateTime } from "@/lib/format";
import type { ReportColumn, ReportKpi, ReportRow } from "@/types/report";

type PdfExportOptions = {
  fileStem: string;
  title: string;
  companyName: string;
  generatedAt: string;
  filters: string;
  kpis: ReportKpi[];
  columns: ReportColumn[];
  rows: ReportRow[];
};

const PAGE_W = 842;
const PAGE_H = 595;
const MARGIN = 32;

function toPdfText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[–-]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function pdfEscape(value: string): string {
  return toPdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(1, maxChars - 3))}...`;
}

function columnWeight(column: ReportColumn): number {
  switch (column.type) {
    case "currency":
      return 1.15;
    case "datetime":
      return 1.25;
    case "date":
      return 1;
    case "number":
    case "percent":
      return 0.8;
    case "status":
      return 0.95;
    default:
      return 1.35;
  }
}

function formatKpi(kpi: ReportKpi): string {
  return formatReportCell(
    { key: kpi.id, label: kpi.label, type: kpi.type === "number" ? "number" : kpi.type },
    kpi.value,
  );
}

function buildTablePdf(options: PdfExportOptions): string {
  const usableWidth = PAGE_W - MARGIN * 2;
  const weights = options.columns.map(columnWeight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const colWidths = weights.map((weight) => (weight / totalWeight) * usableWidth);
  const fontSize = options.columns.length > 9 ? 7 : options.columns.length > 6 ? 8 : 9;
  const rowHeight = fontSize + 7;
  const headerRowH = rowHeight + 2;
  const charW = fontSize * 0.5;

  const pages: string[] = [];
  let y = 0;
  let stream = "";

  const startPage = () => {
    stream = "";
    y = PAGE_H - MARGIN;
    stream += "BT\n";
    stream += `/F2 13 Tf\n${MARGIN} ${y} Td (${pdfEscape(options.companyName)}) Tj\n`;
    y -= 16;
    stream += `/F2 11 Tf\n0 -16 Td (${pdfEscape(options.title)}) Tj\n`;
    y -= 14;
    stream += `/F1 8 Tf\n0 -14 Td (${pdfEscape(`Generated ${formatDateTime(options.generatedAt)}  |  ${options.filters}`)}) Tj\n`;
    y -= 18;
    if (options.kpis.length) {
      const kpiText = options.kpis
        .map((kpi) => `${kpi.label}: ${toPdfText(formatKpi(kpi))}`)
        .join("   ");
      stream += `/F1 8 Tf\n0 -12 Td (${pdfEscape(kpiText)}) Tj\n`;
      y -= 16;
    }
    stream += "ET\n";
    drawTableHeader();
  };

  const drawTableHeader = () => {
    stream += "0.92 g\n";
    stream += `${MARGIN} ${y - headerRowH + 3} ${usableWidth} ${headerRowH} re f\n`;
    stream += "0 g\n";
    stream += "BT\n/F2 8 Tf\n";
    let x = MARGIN + 3;
    options.columns.forEach((column, index) => {
      const maxChars = Math.max(4, Math.floor((colWidths[index] - 6) / (8 * 0.5)));
      stream += `1 0 0 1 ${x.toFixed(2)} ${(y - 11).toFixed(2)} Tm (${pdfEscape(truncate(column.label, maxChars))}) Tj\n`;
      x += colWidths[index];
    });
    stream += "ET\n";
    y -= headerRowH + 2;
  };

  const drawRow = (row: ReportRow) => {
    if (y < MARGIN + 28) {
      pages.push(stream);
      startPage();
    }
    stream += "BT\n/F1 " + fontSize + " Tf\n";
    let x = MARGIN + 3;
    options.columns.forEach((column, index) => {
      const maxChars = Math.max(4, Math.floor((colWidths[index] - 6) / charW));
      const text = truncate(toPdfText(formatReportCell(column, row[column.key]) || "-"), maxChars);
      stream += `1 0 0 1 ${x.toFixed(2)} ${(y - fontSize).toFixed(2)} Tm (${pdfEscape(text)}) Tj\n`;
      x += colWidths[index];
    });
    stream += "ET\n";
    stream += "0.85 G 0.4 w\n";
    stream += `${MARGIN} ${y - rowHeight + 2} m ${MARGIN + usableWidth} ${y - rowHeight + 2} l S\n`;
    stream += "0 G\n";
    y -= rowHeight;
  };

  startPage();
  if (!options.rows.length) {
    stream += `BT /F1 9 Tf ${MARGIN} ${y - 12} Td (No rows for the current filters.) Tj ET\n`;
  } else {
    options.rows.forEach(drawRow);
  }
  pages.push(stream);

  const fontRegular = "3 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n";
  const fontBold = "4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n";
  const pageCount = pages.length;
  const pageObjectNumbers: number[] = [];
  const objects: string[] = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "", // pages placeholder
    fontRegular,
    fontBold,
  ];

  pages.forEach((content, index) => {
    const pageNum = 5 + index * 2;
    const contentNum = pageNum + 1;
    pageObjectNumbers.push(pageNum);
    const footer = `BT /F1 8 Tf ${MARGIN} 18 Td (${pdfEscape(`Page ${index + 1} of ${pageCount}`)}) Tj ET\n`;
    const body = `${content}${footer}`;
    objects.push(
      `${pageNum} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources<< /Font<< /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>endobj\n`,
    );
    objects.push(`${contentNum} 0 obj<< /Length ${body.length} >>stream\n${body}endstream\nendobj\n`);
  });

  const kids = pageObjectNumbers.map((num) => `${num} 0 R`).join(" ");
  objects[1] = `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>endobj\n`;

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

export function downloadReportPdf(options: PdfExportOptions): void {
  const pdf = buildTablePdf(options);
  const blob = new Blob([pdf], { type: "application/pdf" });
  downloadBlob(blob, `${options.fileStem}-${reportExportStamp()}.pdf`);
}
