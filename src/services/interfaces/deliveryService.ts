import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { Delivery, ProofOfDelivery } from "@/types/delivery";
import type { DeliveryStatusValue, PriorityValue } from "@/types/status";

export interface DeliveryListFilters extends PaginatedRequest {
  status?: DeliveryStatusValue;
  salesOrderId?: string;
  customerId?: string;
  priority?: PriorityValue;
  driverId?: string;
}

export interface DeliveryFormData {
  salesOrderId: string;
  items: Omit<Delivery["items"][number], "id">[];
  scheduledDate: string;
  priority: PriorityValue;
  carrier?: string;
  driverId?: string;
  vehicleNumber?: string;
  notes?: string;
}

export interface DeliveryService {
  list(filters: DeliveryListFilters): Promise<PaginatedResponse<Delivery>>;
  getById(id: string): Promise<Delivery>;
  create(data: DeliveryFormData): Promise<Delivery>;
  update(id: string, data: Partial<DeliveryFormData>): Promise<Delivery>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, status: DeliveryStatusValue): Promise<Delivery>;
  dispatchDelivery(id: string): Promise<Delivery>;
  recordProofOfDelivery(id: string, proof: Omit<ProofOfDelivery, "id">): Promise<Delivery>;
}
