import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type { ProductService } from "@/services/interfaces/productService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialBrands } from "@/services/mock/data/brands";
import { initialCategories } from "@/services/mock/data/categories";
import { initialProducts } from "@/services/mock/data/products";
import type { Product } from "@/types/product";

let products = cloneData(initialProducts);

function resolveCategoryName(categoryId: string): string {
  return initialCategories.find((c) => c.id === categoryId)?.name ?? "Unknown";
}

function resolveBrandName(brandId: string): string {
  return initialBrands.find((b) => b.id === brandId)?.name ?? "Unknown";
}

export const mockProductService: ProductService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      products,
      filters,
      ["name", "sku", "description", "categoryName", "brandName"],
      (item) => {
        if (filters.categoryId && item.categoryId !== filters.categoryId) {
          return false;
        }
        if (filters.brandId && item.brandId !== filters.brandId) {
          return false;
        }
        if (filters.status && item.status !== filters.status) {
          return false;
        }
        if (filters.tags?.length) {
          return filters.tags.some((tag) => item.tags.includes(tag));
        }
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    const product = products.find((p) => p.id === id);
    if (!product) notFoundError("Product", id);
    return product;
  },

  async create(data) {
    await delay();
    const timestamp = nowIso();
    const product: Product = {
      id: generateId("prd"),
      ...data,
      categoryName: resolveCategoryName(data.categoryId),
      brandName: resolveBrandName(data.brandId),
      currency: "LKR",
      images: [],
      bom: [],
      attributes: data.attributes.map((attr) => ({
        ...attr,
        id: generateId("attr"),
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: "usr-001",
    };
    products.push(product);
    return product;
  },

  async update(id, data) {
    await delay();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) notFoundError("Product", id);

    const existing = products[index];
    const updated: Product = {
      ...existing,
      ...data,
      categoryName: data.categoryId
        ? resolveCategoryName(data.categoryId)
        : existing.categoryName,
      brandName: data.brandId
        ? resolveBrandName(data.brandId)
        : existing.brandName,
      attributes: data.attributes
        ? data.attributes.map((attr) => ({
            ...attr,
            id: generateId("attr"),
          }))
        : existing.attributes,
      updatedAt: nowIso(),
    };
    products[index] = updated;
    return updated;
  },

  async delete(id) {
    await delay();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) notFoundError("Product", id);
    products[index] = {
      ...products[index],
      status: "inactive",
      updatedAt: nowIso(),
    };
  },
};

export function resetMockProducts(): void {
  products = cloneData(initialProducts);
}
