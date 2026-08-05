import type { Address } from "@/types/common";
import type { DeliveryStatusValue, PriorityValue } from "@/types/status";

export interface DeliveryItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  quantityOrdered: number;
  quantityDelivered: number;
  unit: string;
}

export interface ProofOfDelivery {
  id: string;
  signedBy: string;
  signedAt: string;
  signatureUrl?: string;
  photoUrls: string[];
  notes?: string;
  gpsCoordinates?: { lat: number; lng: number };
}

export interface Delivery {
  id: string;
  deliveryNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerId: string;
  customerName: string;
  status: DeliveryStatusValue;
  priority: PriorityValue;
  items: DeliveryItem[];
  shippingAddress: Address;
  carrier?: string;
  trackingNumber?: string;
  driverId?: string;
  driverName?: string;
  vehicleNumber?: string;
  scheduledDate: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  proofOfDelivery?: ProofOfDelivery;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}
