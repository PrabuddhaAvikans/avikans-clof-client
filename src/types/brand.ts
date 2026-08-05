import type { EntityStatus } from "@/types/common";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  countryOfOrigin?: string;
  status: EntityStatus;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}
