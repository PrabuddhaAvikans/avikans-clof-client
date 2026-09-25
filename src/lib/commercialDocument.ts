import { downloadBlob } from "@/features/reports/lib/downloadFile";
import {
  buildCommercialPdf,
  type CommercialDocument,
  type PdfImage,
} from "@/lib/commercialPdf";
import { resolveSystemLogoUrl, type SystemSettings } from "@/lib/systemSettings";

export type { CommercialDocument } from "@/lib/commercialPdf";

function absoluteAssetUrl(url: string): string {
  if (!url || url.startsWith("data:") || url.startsWith("http")) return url;
  if (typeof window === "undefined") return url;
  return new URL(url, window.location.origin).href;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function documentLogoUrl(company: SystemSettings): string {
  return resolveSystemLogoUrl(company.logoUrl);
}

export function documentLetterFooter(company: SystemSettings): string {
  return [company.tagline, company.address, company.phone, company.email, company.website]
    .filter((part) => part.trim().length > 0)
    .join("  |  ");
}

export function companyDetailLines(company: SystemSettings): string[] {
  return [
    company.tagline,
    company.address,
    [company.email, company.phone].filter(Boolean).join(" | "),
    company.taxRegistration,
  ].filter((line) => line.trim().length > 0);
}

const PRINT_CSS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 12px; }
  h1 { margin: 0; font-size: 20px; }
  h2 { margin: 0; font-size: 13px; letter-spacing: 0.04em; }
  p { margin: 0; }
  .top { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #ddd; padding-bottom: 16px; }
  .muted { color: #555; white-space: pre-line; }
  .right { text-align: right; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 18px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 6px 4px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  th { background: #f3f3f3; font-size: 11px; text-align: left; }
  td.right, th.right { text-align: right; }
  .sku { color: #666; font-size: 11px; }
  .totals { width: 260px; margin-left: auto; margin-top: 16px; }
  .total { display: flex; justify-content: space-between; gap: 12px; padding: 3px 0; }
  .total strong { border-top: 1px solid #111; padding-top: 6px; }
  .block { margin-top: 18px; }
  .block h3 { margin: 0 0 4px; font-size: 11px; letter-spacing: 0.04em; text-transform: uppercase; color: #555; }
  .signs { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 36px; }
  .line { height: 48px; border-bottom: 1px solid #bbb; margin-bottom: 6px; }
  .logo { display: block; height: 42px; width: auto; max-width: 180px; object-fit: contain; margin: 0 0 14px; }
  .brand h1 { margin-top: 0; }
  .brand .muted { margin-top: 6px; line-height: 1.45; }
  .letterfoot { margin-top: 40px; border-top: 2px solid #f7941d; padding-top: 12px; color: #231f20; font-size: 10px; }
  .letterfoot-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; }
  .letterfoot-brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .letterfoot-logo { display: block; height: 32px; width: auto; max-width: 148px; object-fit: contain; object-position: left center; }
  .letterfoot-copy { min-width: 0; }
  .letterfoot-copy strong { display: block; font-size: 12px; letter-spacing: 0.03em; line-height: 1.2; }
  .letterfoot-copy p { margin-top: 4px; line-height: 1.4; }
  @media print {
    .letterfoot { position: fixed; right: 0; bottom: 0; left: 0; margin: 0; background: #fff; }
    body { padding-bottom: 64px; }
  }
`;

export function renderCommercialHtml(document: CommercialDocument): string {
  const meta = document.meta
    .map((item) => `<p>${escapeHtml(item.label)}: ${escapeHtml(item.value)}</p>`)
    .join("");
  const party = (block: CommercialDocument["billTo"]) => `
    <div>
      <h2>${escapeHtml(block.heading.toUpperCase())}</h2>
      ${block.lines
        .map((line, index) => `<p class="${index === 0 ? "" : "muted"}">${escapeHtml(line)}</p>`)
        .join("")}
    </div>`;
  const head = document.columns
    .map(
      (column) =>
        `<th class="${column.align === "right" ? "right" : ""}">${escapeHtml(column.label)}</th>`,
    )
    .join("");
  const body = document.rows
    .map((row) => {
      const cells = row
        .map((cell, index) => {
          const align = document.columns[index]?.align === "right" ? "right" : "";
          const html = escapeHtml(cell).replace(/\n/g, "<br />");
          return `<td class="${align}">${html}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");
  const totals = document.totals
    .map((total) => {
      const label = total.emphasize ? `<strong>${escapeHtml(total.label)}</strong>` : escapeHtml(total.label);
      const value = total.emphasize ? `<strong>${escapeHtml(total.value)}</strong>` : escapeHtml(total.value);
      return `<div class="total">${label}${value}</div>`;
    })
    .join("");
  const notes = document.notes?.trim()
    ? `<section class="block"><h3>Notes</h3><p class="muted">${escapeHtml(document.notes)}</p></section>`
    : "";
  const terms = document.terms?.trim()
    ? `<section class="block"><h3>Terms and conditions</h3><p class="muted">${escapeHtml(document.terms)}</p></section>`
    : "";
  const signatures = document.signatures
    .map(
      (signature) =>
        `<div><div class="line"></div><p><strong>${escapeHtml(signature.label)}</strong></p><p class="muted">${escapeHtml(signature.name)}</p></div>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(document.kind)} ${escapeHtml(document.number)}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <header class="top">
    <div class="brand">
      ${
        document.logoUrl
          ? `<img class="logo" src="${escapeHtml(absoluteAssetUrl(document.logoUrl))}" alt="${escapeHtml(document.companyName)}" />`
          : ""
      }
      <h1>${escapeHtml(document.companyName)}</h1>
      <p class="muted">${escapeHtml(document.companyLines.join("\n"))}</p>
    </div>
    <div class="right">
      <h2>${escapeHtml(document.kind.toUpperCase())}</h2>
      <p><strong>${escapeHtml(document.number)}</strong></p>
      ${meta}
    </div>
  </header>
  <section class="parties">
    ${party(document.billTo)}
    ${document.shipTo ? party(document.shipTo) : "<div></div>"}
  </section>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  <div class="totals">${totals}</div>
  ${notes}
  ${terms}
  <footer class="signs">${signatures}</footer>
  <footer class="letterfoot">
    <div class="letterfoot-row">
      <div class="letterfoot-brand">
        ${
          document.logoUrl
            ? `<img class="letterfoot-logo" src="${escapeHtml(absoluteAssetUrl(document.logoUrl))}" alt="" />`
            : ""
        }
        <div class="letterfoot-copy">
          <strong>${escapeHtml(document.companyName)}</strong>
          <p>${escapeHtml(document.letterFooter)}</p>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load logo"));
    image.src = src;
  });
}

async function logoForPdf(logoUrl?: string): Promise<PdfImage | null> {
  if (!logoUrl) return null;
  try {
    const source = logoUrl.startsWith("data:") || logoUrl.startsWith("http")
      ? logoUrl
      : new URL(logoUrl, window.location.origin).href;
    const image = await loadImage(source);
    const maxEdge = 360;
    const longest = Math.max(image.width, image.height);
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = window.document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.92);
    });
    if (!blob) return null;
    return { jpeg: new Uint8Array(await blob.arrayBuffer()), width, height };
  } catch {
    return null;
  }
}

export async function downloadCommercialDocument(document: CommercialDocument): Promise<void> {
  const image = await logoForPdf(document.logoUrl);
  const pdf = buildCommercialPdf(document, image);
  const blob = new Blob([pdf], { type: "application/pdf" });
  downloadBlob(blob, `${document.number}.pdf`);
}

export function printCommercialDocument(document: CommercialDocument): void {
  const iframe = window.document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;width:0;height:0;border:0;visibility:hidden";
  window.document.body.appendChild(iframe);
  const frameDocument = iframe.contentDocument;
  const frameWindow = iframe.contentWindow;
  if (!frameDocument || !frameWindow) {
    iframe.remove();
    return;
  }

  frameDocument.open();
  frameDocument.write(renderCommercialHtml(document));
  frameDocument.close();

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    iframe.remove();
  };
  frameWindow.addEventListener("afterprint", cleanup, { once: true });
  const printNow = () => {
    frameWindow.focus();
    frameWindow.print();
  };
  const logo = frameDocument.querySelector("img");
  if (logo instanceof HTMLImageElement && !logo.complete) {
    logo.addEventListener("load", printNow, { once: true });
    logo.addEventListener("error", printNow, { once: true });
  } else {
    window.setTimeout(printNow, 50);
  }
  window.setTimeout(cleanup, 60_000);
}
