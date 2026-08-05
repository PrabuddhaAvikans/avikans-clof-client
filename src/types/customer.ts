import type { Address, EntityStatus } from "@/types/common";

export const CustomerType = {
  individual: "individual",
  retail: "retail",
  corporate: "corporate",
} as const;

export type CustomerTypeValue =
  (typeof CustomerType)[keyof typeof CustomerType];

export interface ContactPerson {
  id: string;
  name: string;
  title?: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  type: CustomerTypeValue;
  email: string;
  phone: string;
  billingAddresses: Address[];
  activeBillingAddressIndex: number;
  /**
   * Delivery address(es).
   * If omitted/empty, the system will fall back to the active billing address for delivery.
   */
  deliverySameAsBilling: boolean;
  shippingAddresses?: Address[];
  activeShippingAddressIndex?: number;
  contactPersons: ContactPerson[];
  taxId?: string;
  creditLimit?: number;
  paymentTermsDays: number;
  notes?: string;
  status: EntityStatus;
  totalOrders: number;
  totalRevenue: number;
  createdAt: string;
  updatedAt: string;
}
