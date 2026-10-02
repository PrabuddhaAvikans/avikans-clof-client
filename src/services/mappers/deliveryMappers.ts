import type { Delivery, ProofOfDelivery } from "@/types/delivery";

export function mapDeliveryItem(raw: Record<string, unknown>): Delivery["items"][number] {
  return {
    id: String(raw.id),
    productId: String(raw.productId),
    productSku: String(raw.productSku ?? ""),
    productName: String(raw.productName ?? ""),
    quantityOrdered: Number(raw.quantityOrdered ?? 0),
    quantityDelivered: Number(raw.quantityDelivered ?? 0),
    unit: String(raw.unit ?? "pcs"),
  };
}

export function mapProof(raw: Record<string, unknown>): ProofOfDelivery {
  const gps = raw.gpsCoordinates as { lat?: number; lng?: number } | undefined;
  return {
    id: String(raw.id),
    signedBy: String(raw.signedBy ?? ""),
    signedAt: String(raw.signedAt ?? new Date().toISOString()),
    signatureUrl: raw.signatureUrl as string | undefined,
    photoUrls: ((raw.photoUrls as string[]) ?? []).map(String),
    notes: raw.notes as string | undefined,
    gpsCoordinates:
      gps && gps.lat != null && gps.lng != null
        ? { lat: Number(gps.lat), lng: Number(gps.lng) }
        : undefined,
  };
}

export function mapDelivery(raw: Record<string, unknown>): Delivery {
  const shipping = (raw.shippingAddress as Record<string, unknown>) ?? {};
  return {
    id: String(raw.id),
    deliveryNumber: String(raw.deliveryNumber ?? ""),
    salesOrderId: String(raw.salesOrderId),
    salesOrderNumber: String(raw.salesOrderNumber ?? ""),
    customerId: String(raw.customerId),
    customerName: String(raw.customerName ?? ""),
    status: (raw.status as Delivery["status"]) ?? "planned",
    priority: (raw.priority as Delivery["priority"]) ?? "medium",
    items: ((raw.items as unknown[]) ?? []).map((item) =>
      mapDeliveryItem(item as Record<string, unknown>),
    ),
    shippingAddress: {
      line1: String(shipping.line1 ?? ""),
      line2: shipping.line2 as string | undefined,
      city: String(shipping.city ?? ""),
      state: String(shipping.state ?? ""),
      postalCode: String(shipping.postalCode ?? ""),
      country: String(shipping.country ?? ""),
    },
    carrier: raw.carrier as string | undefined,
    trackingNumber: raw.trackingNumber as string | undefined,
    driverId: raw.driverId == null ? undefined : String(raw.driverId),
    driverName: raw.driverName as string | undefined,
    vehicleNumber: raw.vehicleNumber as string | undefined,
    scheduledDate: String(raw.scheduledDate ?? new Date().toISOString()),
    dispatchedAt: raw.dispatchedAt as string | undefined,
    deliveredAt: raw.deliveredAt as string | undefined,
    proofOfDelivery: raw.proofOfDelivery
      ? mapProof(raw.proofOfDelivery as Record<string, unknown>)
      : undefined,
    notes: raw.notes as string | undefined,
    createdBy: String(raw.createdBy ?? ""),
    createdByName: String(raw.createdByName ?? ""),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}
