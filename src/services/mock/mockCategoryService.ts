import {
  delay,
  generateId,
  notFoundError,
  nowIso,
} from "@/services/http";
import type { CategoryService } from "@/services/interfaces/categoryService";
import { applyListQuery, cloneData } from "@/services/mock/helpers";
import { initialCategories } from "@/services/mock/data/categories";
import type { Category } from "@/types/category";

let categories = cloneData(initialCategories);

function resolveParentName(parentId: string | null): string | undefined {
  if (!parentId) return undefined;
  return categories.find((c) => c.id === parentId)?.name;
}

export const mockCategoryService: CategoryService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      categories,
      filters,
      ["name", "slug", "description"],
      (item) => {
        if (filters.parentId !== undefined && item.parentId !== filters.parentId) {
          return false;
        }
        if (filters.status && item.status !== filters.status) {
          return false;
        }
        return true;
      },
    );
  },

  async getById(id) {
    await delay();
    const category = categories.find((c) => c.id === id);
    if (!category) notFoundError("Category", id);
    return category;
  },

  async getTree() {
    await delay();
    return categories
      .filter((c) => c.status === "active")
      .sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async create(data) {
    await delay();
    const timestamp = nowIso();
    const category: Category = {
      id: generateId("cat"),
      ...data,
      parentName: resolveParentName(data.parentId),
      productCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    categories.push(category);
    return category;
  },

  async update(id, data) {
    await delay();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) notFoundError("Category", id);

    const existing = categories[index];
    const parentId = data.parentId !== undefined ? data.parentId : existing.parentId;
    const updated: Category = {
      ...existing,
      ...data,
      parentId,
      parentName: resolveParentName(parentId),
      updatedAt: nowIso(),
    };
    categories[index] = updated;
    return updated;
  },

  async delete(id) {
    await delay();
    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) notFoundError("Category", id);
    categories[index] = {
      ...categories[index],
      status: "inactive",
      updatedAt: nowIso(),
    };
  },
};
