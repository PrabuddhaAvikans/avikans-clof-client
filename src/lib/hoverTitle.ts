import type { ReactNode } from "react";

export function getNodeText(node: ReactNode): string | undefined {
  if (node == null || typeof node === "boolean") {
    return undefined;
  }

  if (typeof node === "string" || typeof node === "number") {
    const text = String(node).trim();
    return text || undefined;
  }

  if (Array.isArray(node)) {
    const text = node
      .map((child) => getNodeText(child))
      .filter(Boolean)
      .join(" ")
      .trim();
    return text || undefined;
  }

  return undefined;
}

export function resolveHoverTitle(
  ...candidates: Array<string | number | undefined | null>
): string | undefined {
  for (const candidate of candidates) {
    if (candidate == null) {
      continue;
    }

    const text = String(candidate).trim();
    if (text) {
      return text;
    }
  }

  return undefined;
}
