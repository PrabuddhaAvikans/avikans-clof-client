import type { Customer } from "@/types/customer";

export function mapCustomer(raw: Record<string, unknown>): Customer {
  return {
    id: String(raw.id),
    code: String(raw.code),
    name: String(raw.name),
    type: (raw.type as Customer["type"]) ?? "corporate",
    email: String(raw.email ?? ""),
    phone: String(raw.phone ?? ""),
    billingAddresses: (raw.billingAddresses as Customer["billingAddresses"]) ?? [],
    activeBillingAddressIndex: Number(raw.activeBillingAddressIndex ?? 0),
    deliverySameAsBilling: Boolean(raw.deliverySameAsBilling ?? true),
    shippingAddresses: raw.shippingAddresses as Customer["shippingAddresses"],
    activeShippingAddressIndex: raw.activeShippingAddressIndex as number | undefined,
    contactPersons: (raw.contactPersons as Customer["contactPersons"]) ?? [],
    taxId: raw.taxId as string | undefined,
    creditLimit: raw.creditLimit as number | undefined,
    paymentTermsDays: Number(raw.paymentTermsDays ?? 0),
    notes: raw.notes as string | undefined,
    status: (raw.status as Customer["status"]) ?? "active",
    totalOrders: Number(raw.totalOrders ?? 0),
    totalRevenue: Number(raw.totalRevenue ?? 0),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}
