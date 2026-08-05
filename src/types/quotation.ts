import type { Address } from "@/types/common";
import type {
  PaymentStatusValue,
  PriorityValue,
  QuotationStatusValue,
} from "@/types/status";

export type QuotationContactType =
  | "call"
  | "email"
  | "whatsapp"
  | "meeting"
  | "comment"
  | "follow_up";

export interface QuotationContactEntry {
  id: string;
  type: QuotationContactType;
  summary: string;
  detail?: string;
  contactedBy: string;
  contactedByName: string;
  contactedAt: string;
  outcome?: string;
}

export interface QuotationLineItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: QuotationStatusValue;
  priority: PriorityValue;
  lineItems: QuotationLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  validUntil: string;
  paymentStatus: PaymentStatusValue;
  billingAddress: Address;
  shippingAddress?: Address;
  notes?: string;
  termsAndConditions?: string;
  salesOrderId?: string;
  contactHistory: QuotationContactEntry[];
  createdBy: string;
  createdByName: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}
