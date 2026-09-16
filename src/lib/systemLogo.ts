import { formatBytes } from "@/lib/utils";

export const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_LOGO_EDGE = 512;

function readDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read the logo file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read the logo image"));
    image.src = src;
  });
}

async function resizeDataUrl(dataUrl: string, maxEdge: number): Promise<string> {
  const image = await loadImage(dataUrl);
  const longest = Math.max(image.width, image.height);
  const scale = longest > maxEdge ? maxEdge / longest : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/png");
}

export async function fileToLogoDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose a PNG, JPG, SVG, or WEBP file");
  }
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error(`Logo exceeds ${formatBytes(MAX_LOGO_BYTES)}`);
  }
  const dataUrl = await readDataUrl(file);
  if (file.type === "image/svg+xml") {
    return dataUrl;
  }
  return resizeDataUrl(dataUrl, MAX_LOGO_EDGE);
}
