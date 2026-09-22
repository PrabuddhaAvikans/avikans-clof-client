import type { PaginatedRequest, PaginatedResponse } from "@/types/common";
import type { EntityStatus } from "@/types/common";
import type {
  Product,
  ProductFormData,
  ProductHeaderFormData,
  ProductVersion,
  ProductVersionFormData,
} from "@/types/product";
import type { ProductVersionStatusValue } from "@/types/status";

export interface ProductListFilters extends PaginatedRequest {
  categoryId?: string;
  brandId?: string;
  status?: EntityStatus;
  versionStatus?: ProductVersionStatusValue;
  customerId?: string;
  availableForCustomerId?: string;
  tags?: string[];
}

export interface ProductService {
  list(filters: ProductListFilters): Promise<PaginatedResponse<Product>>;
  getById(id: string): Promise<Product>;
  create(data: ProductFormData): Promise<Product>;
  update(id: string, data: Partial<ProductFormData>): Promise<Product>;
  delete(id: string): Promise<void>;
  getVersion(productId: string, versionId: string): Promise<ProductVersion>;
  updateVersion(
    productId: string,
    versionId: string,
    data: ProductVersionFormData,
  ): Promise<Product>;
  reviseVersion(
    productId: string,
    sourceVersionId: string,
    revisionNotes?: string,
  ): Promise<Product>;
  updateHeader(productId: string, data: ProductHeaderFormData): Promise<Product>;
}
