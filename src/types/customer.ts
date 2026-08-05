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
  billingAddress: Address;
  shippingAddress?: Address;
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
