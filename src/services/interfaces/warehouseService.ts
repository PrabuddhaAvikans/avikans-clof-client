import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { Warehouse, WarehouseStatus } from "@/lib/warehouses";

export interface WarehouseListFilters extends PaginatedRequest {
  status?: WarehouseStatus;
}

export interface WarehouseFormData {
  code: string;
  name: string;
  address?: string;
  status: WarehouseStatus;
}

export interface WarehouseService {
  list(filters: WarehouseListFilters): Promise<PaginatedResponse<Warehouse>>;
  getById(id: string): Promise<Warehouse>;
  create(data: WarehouseFormData): Promise<Warehouse>;
  update(id: string, data: Partial<WarehouseFormData>): Promise<Warehouse>;
  delete(id: string): Promise<void>;
}
