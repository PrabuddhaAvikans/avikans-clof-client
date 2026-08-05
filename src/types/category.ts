import type { EntityStatus } from "@/types/common";

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId: string | null;
  parentName?: string;
  sortOrder: number;
  status: EntityStatus;
  productCount: number;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}
