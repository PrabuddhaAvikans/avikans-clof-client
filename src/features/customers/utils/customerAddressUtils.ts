import type { Address } from "@/types/common";

export function formatAddressLines(address: Address | undefined) {
  if (!address?.line1?.trim()) {
    return { headline: "No address entered", lines: [] as string[] };
  }
  const lines: string[] = [];
  if (address.line2?.trim()) lines.push(address.line2);
  const locality = [address.city, address.state, address.postalCode].filter(Boolean).join(", ");
  if (locality) lines.push(locality);
  if (address.country) lines.push(address.country);
  return { headline: address.line1, lines };
}

export function isAddressDraft(address: Address | undefined) {
  return !address?.line1?.trim();
}

export function resolveActiveSavedIndex(addresses: Address[], activeIndex: number) {
  const saved = addresses.filter((a) => !isAddressDraft(a));
  const activeAddress = addresses[activeIndex];
  if (activeAddress && !isAddressDraft(activeAddress)) {
    const idx = saved.findIndex(
      (a) =>
        a.line1 === activeAddress.line1 &&
        a.city === activeAddress.city &&
        a.postalCode === activeAddress.postalCode,
    );
    if (idx >= 0) return idx;
  }
  return 0;
}

export function resolveActiveAddress(addresses: Address[], activeIndex: number) {
  const direct = addresses[activeIndex];
  if (direct && !isAddressDraft(direct)) return direct;
  return addresses.find((a) => !isAddressDraft(a));
}
