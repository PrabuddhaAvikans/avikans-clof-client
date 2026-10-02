import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { UnitOfMeasure } from "@/lib/unitsOfMeasure";

export interface UnitOfMeasureListFilters extends PaginatedRequest {
  status?: "active" | "inactive";
}

export interface UnitOfMeasureFormData {
  code: string;
  name: string;
  status?: "active" | "inactive";
}

export interface UnitOfMeasureService {
  list(filters: UnitOfMeasureListFilters): Promise<PaginatedResponse<UnitOfMeasure>>;
  getById(id: string): Promise<UnitOfMeasure>;
  create(data: UnitOfMeasureFormData): Promise<UnitOfMeasure>;
  update(id: string, data: Partial<UnitOfMeasureFormData>): Promise<UnitOfMeasure>;
  delete(id: string): Promise<void>;
}
