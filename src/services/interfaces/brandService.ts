import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { EntityStatus } from "@/types/common";
import type { Brand } from "@/types/brand";

export interface BrandListFilters extends PaginatedRequest {
  status?: EntityStatus;
}

export interface BrandFormData {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  countryOfOrigin?: string;
  status: EntityStatus;
}

export interface BrandService {
  list(filters: BrandListFilters): Promise<PaginatedResponse<Brand>>;
  getById(id: string): Promise<Brand>;
  create(data: BrandFormData): Promise<Brand>;
  update(id: string, data: Partial<BrandFormData>): Promise<Brand>;
  delete(id: string): Promise<void>;
}
