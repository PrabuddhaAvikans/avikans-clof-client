import type { EntityStatus } from "@/types/common";

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface BomItem {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string;
  quantity: number;
  unit: string;
  unitCost: number;
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
  unit?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  brandId: string;
  brandName: string;
  basePrice: number;
  costPrice: number;
  currency: string;
  status: EntityStatus;
  images: ProductImage[];
  bom: BomItem[];
  attributes: ProductAttribute[];
  weightKg?: number;
  dimensions?: string;
  leadTimeDays: number;
  minOrderQuantity: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ProductFormData {
  sku: string;
  name: string;
  description: string;
  categoryId: string;
  brandId: string;
  basePrice: number;
  costPrice: number;
  status: EntityStatus;
  attributes: Omit<ProductAttribute, "id">[];
  leadTimeDays: number;
  minOrderQuantity: number;
  tags: string[];
  weightKg?: number;
  dimensions?: string;
}
