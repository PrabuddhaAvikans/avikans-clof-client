export type DocumentAlign = "left" | "right";

export type DocumentColumn = {
  label: string;
  width: number;
  align: DocumentAlign;
};

export type DocumentParty = {
  heading: string;
  lines: string[];
};

export type DocumentTotal = {
  label: string;
  value: string;
  emphasize?: boolean;
};

export type PdfImage = {
  jpeg: Uint8Array;
  width: number;
  height: number;
};

export type CommercialDocument = {
  kind: "Quotation" | "Invoice";
  number: string;
  companyName: string;
  companyLines: string[];
  logoUrl?: string;
  meta: { label: string; value: string }[];
  billTo: DocumentParty;
  shipTo?: DocumentParty;
  columns: DocumentColumn[];
  rows: string[][];
  totals: DocumentTotal[];
  notes?: string;
  terms?: string;
  letterFooter: string;
  signatures: { label: string; name: string }[];
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 40;
const BOTTOM = 96;

function toPdfText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/\u202f/g, " ")
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

function wrapBlock(value: string, maxChars: number): string[] {
  const max = Math.max(4, maxChars);
  const blocks = toPdfText(value).split("\n");
  const lines: string[] = [];

  for (const block of blocks) {
    const words = block.split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let line = "";
    for (const word of words) {
      const pieces = word.length > max ? word.match(new RegExp(`.{1,${max}}`, "g")) ?? [word] : [word];
      for (const piece of pieces) {
        const next = line ? `${line} ${piece}` : piece;
        if (next.length <= max) {
          line = next;
        } else {
          if (line) lines.push(line);
          line = piece;
        }
      }
    }
    if (line) lines.push(line);
  }

  return lines;
}

function textWidth(value: string, size: number): number {
  return toPdfText(value).length * size * 0.5;
}

type DrawState = {
  stream: string;
  y: number;
  pages: string[];
  inTable: boolean;
};

function paint(
  state: DrawState,
  font: "F1" | "F2",
  size: number,
  x: number,
  y: number,
  value: string,
) {
  const text = pdfEscape(value);
  if (!text) return;
  state.stream += `BT /${font} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${text}) Tj ET\n`;
}

function paintRight(
  state: DrawState,
  font: "F1" | "F2",
  size: number,
  right: number,
  y: number,
  value: string,
) {
  paint(state, font, size, right - textWidth(value, size), y, value);
}

function rule(state: DrawState, y: number) {
  state.stream += `0.82 G 0.6 w ${MARGIN} ${y.toFixed(2)} m ${PAGE_W - MARGIN} ${y.toFixed(2)} l S 0 G 0 g\n`;
}

class PdfBytes {
  private chunks: Uint8Array[] = [];
  length = 0;

  pushText(value: string) {
    this.push(new TextEncoder().encode(value));
  }

  push(bytes: Uint8Array) {
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  toUint8Array(): Uint8Array {
    const output = new Uint8Array(this.length);
    let offset = 0;
    for (const chunk of this.chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }
}

function letterFooterStream(
  index: number,
  pageCount: number,
  mark: { name: string; detail: string },
  image?: PdfImage | null,
): string {
  const pageLabel = `Page ${index + 1} of ${pageCount}`;
  const pageX = PAGE_W - MARGIN - textWidth(pageLabel, 8);
  const detailMax = Math.max(28, Math.floor((PAGE_W - MARGIN * 2) / 4.2));
  const detail = wrapBlock(mark.detail, detailMax)[0] ?? "";
  const parts = [
    `0.969 0.580 0.114 RG 1.1 w ${MARGIN} 78 m ${PAGE_W - MARGIN} 78 l S 0 0 0 RG\n`,
  ];

  if (image && image.width > 0 && image.height > 0) {
    const logoH = 20;
    const logoW = Math.min(108, logoH * (image.width / image.height));
    const logoDrawH = logoW * (image.height / image.width);
    parts.push(
      `q ${logoW.toFixed(2)} 0 0 ${logoDrawH.toFixed(2)} ${MARGIN.toFixed(2)} 50 cm /Im1 Do Q\n`,
    );
  } else {
    const nameWidth = textWidth(mark.name, 9);
    parts.push(
      `0.969 0.580 0.114 rg ${MARGIN + 2.5} 57.5 2.1 0 360 arc f 0 g\n`,
      `0.137 0.122 0.125 rg BT /F2 9 Tf ${MARGIN + 10} 54 Td (${pdfEscape(mark.name)}) Tj ET 0 g\n`,
      `0.969 0.580 0.114 rg BT /F2 8 Tf ${(MARGIN + 18 + nameWidth).toFixed(2)} 54 Td (1963) Tj ET 0 g\n`,
    );
  }

  parts.push(
    `0.137 0.122 0.125 rg BT /F1 8 Tf ${MARGIN} 32 Td (${pdfEscape(detail)}) Tj ET 0 g\n`,
    `BT /F1 8 Tf 1 0 0 1 ${pageX.toFixed(2)} 56 Tm (${pdfEscape(pageLabel)}) Tj ET\n`,
  );
  return parts.join("");
}

function assemble(
  pages: string[],
  image: PdfImage | null | undefined,
  mark: { name: string; detail: string },
): Uint8Array {
  const fontRegular = "3 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n";
  const fontBold = "4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n";
  const pageCount = pages.length;
  const firstPageNumber = image ? 6 : 5;
  const xObject = image ? " /XObject<< /Im1 5 0 R >>" : "";
  const pageObjectNumbers: number[] = [];
  const objects: Array<string | { head: string; bytes: Uint8Array; tail: string }> = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [] /Count 0 >>endobj\n",
    fontRegular,
    fontBold,
  ];

  if (image) {
    objects.push({
      head: `5 0 obj<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.jpeg.length} >>\nstream\n`,
      bytes: image.jpeg,
      tail: "\nendstream\nendobj\n",
    });
  }

  pages.forEach((content, index) => {
    const pageNum = firstPageNumber + index * 2;
    const contentNum = pageNum + 1;
    pageObjectNumbers.push(pageNum);
    const footer = letterFooterStream(index, pageCount, mark, image);
    const body = `${content}${footer}`;
    objects.push(
      `${pageNum} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources<< /Font<< /F1 3 0 R /F2 4 0 R >>${xObject} >> /Contents ${contentNum} 0 R >>endobj\n`,
    );
    objects.push(`${contentNum} 0 obj<< /Length ${body.length} >>stream\n${body}endstream\nendobj\n`);
  });

  const kids = pageObjectNumbers.map((num) => `${num} 0 R`).join(" ");
  objects[1] = `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>endobj\n`;

  const file = new PdfBytes();
  file.pushText("%PDF-1.4\n");
  const offsets = [0];
  for (const object of objects) {
    offsets.push(file.length);
    if (typeof object === "string") {
      file.pushText(object);
    } else {
      file.pushText(object.head);
      file.push(object.bytes);
      file.pushText(object.tail);
    }
  }
  const xrefStart = file.length;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  file.pushText(xref);
  return file.toUint8Array();
}

function drawLogo(state: DrawState, image: PdfImage) {
  const maxWidth = 140;
  const maxHeight = 40;
  const fit = Math.min(maxWidth / image.width, maxHeight / image.height);
  const drawW = image.width * fit;
  const drawH = image.height * fit;
  const bottom = state.y - drawH;
  state.stream += `q ${drawW.toFixed(2)} 0 0 ${drawH.toFixed(2)} ${MARGIN.toFixed(2)} ${bottom.toFixed(2)} cm /Im1 Do Q\n`;
  state.y = bottom - 22;
}

export function buildCommercialPdf(
  document: CommercialDocument,
  image?: PdfImage | null,
): Uint8Array {
  const usable = PAGE_W - MARGIN * 2;
  const state: DrawState = { stream: "", y: PAGE_H - MARGIN, pages: [], inTable: false };
  const weights = document.columns.map((column) => column.width);
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const colWidths = weights.map((weight) => (weight / weightTotal) * usable);
  const tableSize = document.columns.length > 6 ? 8 : 9;
  const charW = tableSize * 0.58;

  const newPage = () => {
    if (state.stream) state.pages.push(state.stream);
    state.stream = "";
    state.y = PAGE_H - MARGIN;
    paint(state, "F1", 8, MARGIN, state.y, `${document.kind.toUpperCase()} ${document.number}`);
    state.y -= 18;
    if (state.inTable) drawTableHeader();
  };

  const ensure = (height: number) => {
    if (state.y - height >= BOTTOM) return;
    newPage();
  };

  const drawTableHeader = () => {
    const headerH = 16;
    state.stream += `0.93 g ${MARGIN} ${(state.y - headerH + 4).toFixed(2)} ${usable} ${headerH} re f 0 g\n`;
    let x = MARGIN;
    document.columns.forEach((column, index) => {
      const maxChars = Math.max(4, Math.floor((colWidths[index] - 8) / (8 * 0.58)));
      const label = wrapBlock(column.label, maxChars)[0] ?? column.label;
      const baseline = state.y - 8;
      if (column.align === "right") {
        paintRight(state, "F2", 8, x + colWidths[index] - 4, baseline, label);
      } else {
        paint(state, "F2", 8, x + 4, baseline, label);
      }
      x += colWidths[index];
    });
    state.y -= headerH + 4;
  };

  const headerTop = state.y;
  if (image) drawLogo(state, image);
  const leftWidth = usable * 0.54;
  const leftChars = Math.max(18, Math.floor((leftWidth - 12) / 5.2));
  let leftY = state.y;
  wrapBlock(document.companyName, leftChars).forEach((part) => {
    paint(state, "F2", 12, MARGIN, leftY, part);
    leftY -= 16;
  });
  leftY -= 2;
  document.companyLines.forEach((line) => {
    wrapBlock(line, leftChars).forEach((part) => {
      paint(state, "F1", 9, MARGIN, leftY, part);
      leftY -= 13;
    });
  });

  const rightEdge = PAGE_W - MARGIN;
  const rightWidth = usable - leftWidth - 28;
  const rightChars = Math.max(16, Math.floor((rightWidth - 4) / 5.2));
  let rightY = headerTop;
  paintRight(state, "F2", 12, rightEdge, rightY, document.kind.toUpperCase());
  rightY -= 16;
  paintRight(state, "F2", 10, rightEdge, rightY, document.number);
  rightY -= 16;
  document.meta.forEach((item) => {
    wrapBlock(`${item.label}: ${item.value}`, rightChars).forEach((part) => {
      paintRight(state, "F1", 9, rightEdge, rightY, part);
      rightY -= 12;
    });
  });

  state.y = Math.min(leftY, rightY) - 8;
  rule(state, state.y);
  state.y -= 18;

  const partyWidth = document.shipTo ? usable / 2 - 8 : usable;
  const drawParty = (party: DocumentParty, x: number) => {
    paint(state, "F2", 8, x, state.y, party.heading.toUpperCase());
    let lineY = state.y - 14;
    party.lines.forEach((line, index) => {
      const wrapped = wrapBlock(line, Math.floor(partyWidth / (9 * 0.5)));
      wrapped.forEach((part) => {
        paint(state, index === 0 ? "F2" : "F1", 9, x, lineY, part);
        lineY -= 12;
      });
    });
    return lineY;
  };

  const billBottom = drawParty(document.billTo, MARGIN);
  const shipBottom = document.shipTo
    ? drawParty(document.shipTo, MARGIN + usable / 2)
    : state.y;
  state.y = Math.min(billBottom, shipBottom) - 8;

  ensure(28);
  drawTableHeader();
  state.inTable = true;

  document.rows.forEach((row) => {
    const cellLines = document.columns.map((column, index) => {
      const maxChars = Math.max(4, Math.floor((colWidths[index] - 8) / charW));
      return wrapBlock(row[index] ?? "", maxChars);
    });
    const lineCount = Math.max(1, ...cellLines.map((lines) => lines.length));
    const rowH = lineCount * (tableSize + 3) + 6;
    ensure(rowH);
    let x = MARGIN;
    document.columns.forEach((column, index) => {
      cellLines[index].forEach((line, lineIndex) => {
        const baseline = state.y - tableSize - lineIndex * (tableSize + 3);
        if (column.align === "right") {
          paintRight(state, "F1", tableSize, x + colWidths[index] - 4, baseline, line);
        } else {
          paint(state, "F1", tableSize, x + 4, baseline, line);
        }
      });
      x += colWidths[index];
    });
    state.y -= rowH;
    rule(state, state.y + 2);
  });

  state.inTable = false;
  state.y -= 16;

  const totalsHeight = document.totals.length * 14 + 8;
  ensure(totalsHeight);
  const boxRight = PAGE_W - MARGIN;
  const boxLeft = boxRight - 230;
  document.totals.forEach((total) => {
    if (total.emphasize) {
      state.stream += `0 G 0.8 w ${boxLeft} ${(state.y + 4).toFixed(2)} m ${boxRight} ${(state.y + 4).toFixed(2)} l S\n`;
      state.y -= 4;
    }
    paint(state, total.emphasize ? "F2" : "F1", 9, boxLeft, state.y, total.label);
    paintRight(state, total.emphasize ? "F2" : "F1", 9, boxRight, state.y, total.value);
    state.y -= 14;
  });

  const drawParagraph = (heading: string, body?: string) => {
    const text = body?.trim();
    if (!text) return;
    state.y -= 8;
    ensure(28);
    paint(state, "F2", 8, MARGIN, state.y, heading.toUpperCase());
    state.y -= 14;
    wrapBlock(text, 100).forEach((line) => {
      ensure(12);
      paint(state, "F1", 9, MARGIN, state.y, line);
      state.y -= 12;
    });
  };

  drawParagraph("Notes", document.notes);
  drawParagraph("Terms and conditions", document.terms);

  if (document.signatures.length) {
    state.y -= 18;
    ensure(62);
    const slot = usable / document.signatures.length;
    document.signatures.forEach((signature, index) => {
      const x = MARGIN + index * slot;
      state.stream += `0.75 G 0.6 w ${x} ${(state.y - 28).toFixed(2)} m ${(x + slot - 24).toFixed(2)} ${(state.y - 28).toFixed(2)} l S 0 G\n`;
      paint(state, "F2", 9, x, state.y - 42, signature.label);
      paint(state, "F1", 8, x, state.y - 54, signature.name);
    });
  }

  state.pages.push(state.stream);
  return assemble(
    state.pages.filter((page) => page.trim().length > 0),
    image,
    { name: document.companyName, detail: document.letterFooter },
  );
}
