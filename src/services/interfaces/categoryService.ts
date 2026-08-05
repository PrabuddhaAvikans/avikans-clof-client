import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { EntityStatus } from "@/types/common";
import type { Category } from "@/types/category";

export interface CategoryListFilters extends PaginatedRequest {
  parentId?: string | null;
  status?: EntityStatus;
}

export interface CategoryFormData {
  name: string;
  slug: string;
  description?: string;
  parentId: string | null;
  sortOrder: number;
  status: EntityStatus;
  imageUrl?: string;
}

export interface CategoryService {
  list(filters: CategoryListFilters): Promise<PaginatedResponse<Category>>;
  getById(id: string): Promise<Category>;
  getTree(): Promise<Category[]>;
  create(data: CategoryFormData): Promise<Category>;
  update(id: string, data: Partial<CategoryFormData>): Promise<Category>;
  delete(id: string): Promise<void>;
}
