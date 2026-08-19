import type { Address } from "@/types/common";
import type {
  PaymentStatusValue,
  PriorityValue,
  SalesOrderStatusValue,
} from "@/types/status";

export interface SalesOrderLineItem {
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
  quantityDelivered: number;
  quantityInManufacturing: number;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  quotationId?: string;
  quotationNumber?: string;
  costingRequestId?: string;
  status: SalesOrderStatusValue;
  priority: PriorityValue;
  lineItems: SalesOrderLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentStatus: PaymentStatusValue;
  billingAddress: Address;
  shippingAddress?: Address;
  requestedDeliveryDate?: string;
  notes?: string;
  assignedTo?: string;
  assignedToName?: string;
  manufacturingJobIds: string[];
  deliveryIds: string[];
  createdBy: string;
  createdByName: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}
