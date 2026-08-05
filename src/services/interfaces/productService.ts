import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { EntityStatus } from "@/types/common";
import type { Product, ProductFormData } from "@/types/product";

export interface ProductListFilters extends PaginatedRequest {
  categoryId?: string;
  brandId?: string;
  status?: EntityStatus;
  tags?: string[];
}

export interface ProductService {
  list(filters: ProductListFilters): Promise<PaginatedResponse<Product>>;
  getById(id: string): Promise<Product>;
  create(data: ProductFormData): Promise<Product>;
  update(id: string, data: Partial<ProductFormData>): Promise<Product>;
  delete(id: string): Promise<void>;
}
