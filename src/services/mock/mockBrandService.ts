import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type { BrandService } from "@/services/interfaces/brandService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialBrands } from "@/services/mock/data/brands";
import type { Brand } from "@/types/brand";

let brands = cloneData(initialBrands);

export const mockBrandService: BrandService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      brands,
      filters,
      ["name", "slug", "description", "countryOfOrigin"],
      (item) => !filters.status || item.status === filters.status,
    );
  },

  async getById(id) {
    await delay();
    const brand = brands.find((b) => b.id === id);
    if (!brand) notFoundError("Brand", id);
    return brand;
  },

  async create(data) {
    await delay();
    const timestamp = nowIso();
    const brand: Brand = {
      id: generateId("brd"),
      ...data,
      productCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    brands.push(brand);
    return brand;
  },

  async update(id, data) {
    await delay();
    const index = brands.findIndex((b) => b.id === id);
    if (index === -1) notFoundError("Brand", id);
    brands[index] = { ...brands[index], ...data, updatedAt: nowIso() };
    return brands[index];
  },

  async delete(id) {
    await delay();
    const index = brands.findIndex((b) => b.id === id);
    if (index === -1) notFoundError("Brand", id);
    brands[index] = {
      ...brands[index],
      status: "inactive",
      updatedAt: nowIso(),
    };
  },
};
