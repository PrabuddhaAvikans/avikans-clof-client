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
import { initialCustomers } from "@/services/mock/data/customers";
import { initialProducts } from "@/services/mock/data/products";
import {
  applyHeaderFormData,
  applyVersionFormData,
  buildProductFromForm,
  createVersionFromExisting,
  createVersionFromFormData,
  formDataFromProduct,
  migrateLegacyProduct,
  versionFormDataFromProductForm,
} from "@/services/mock/productHelpers";
import { getCurrentVersion, getVersionById, isVersionEditable, syncProductFromVersion } from "@/lib/productVersion";
import { migrateLegacyBomLine } from "@/lib/bom";
import type { Product, ProductVersion } from "@/types/product";

let products = cloneData(initialProducts).map(migrateLegacyProduct);

function enrichDemoBomData(): void {
  const aurora = products.find((product) => product.id === "prd-001");
  if (!aurora) return;

  const v1 = aurora.versions.find((version) => version.versionNumber === 1);
  if (!v1) return;

  const glassLine = v1.bom.find((line) => line.inventoryItemId === "inv-007");
  if (glassLine) {
    glassLine.wastePercent = 5;
    glassLine.requiredQuantity = glassLine.quantity * 1.05;
    glassLine.lineCost = glassLine.requiredQuantity * glassLine.unitCost;
    glassLine.notes = "Include 5% breakage allowance";
  }

  const driverLine = v1.bom.find((line) => line.inventoryItemId === "inv-002");
  if (driverLine && driverLine.alternatives.length === 0) {
    driverLine.alternatives = [
      {
        id: "alt-demo-001",
        inventoryItemId: "inv-012",
        inventoryItemName: "LED Driver 12V 30W",
        sku: "RAW-DRV-12V-30W",
        unit: "pcs",
        unitCost: 12,
        isApproved: true,
        notes: "Approved for low-voltage custom variants",
      },
    ];
  }

  aurora.versions = aurora.versions.map((version) =>
    version.versionNumber === 1
      ? {
          ...version,
          bom: version.bom.map((line, index) => migrateLegacyBomLine(line, index + 1)),
          status: "bom_defined",
        }
      : version,
  );

  const synced = syncProductFromVersion(aurora, getCurrentVersion(aurora));
  const index = products.findIndex((product) => product.id === aurora.id);
  if (index >= 0) products[index] = synced;
}

enrichDemoBomData();

// Add a second version to first product for demo
if (products[0] && products[0].versions.length === 1) {
  const timestamp = nowIso();
  const v2 = createVersionFromExisting(
    products[0].versions[0],
    2,
    timestamp,
    "Updated glass shade specification and driver model",
  );
  v2.status = "draft";
  v2.isLocked = false;
  products[0].versions.push(v2);
  products[0] = syncProductFromVersion(products[0], v2);
}

function resolveCategoryName(categoryId: string): string {
  return initialCategories.find((c) => c.id === categoryId)?.name ?? "Unknown";
}

function resolveBrandName(brandId: string): string {
  return initialBrands.find((b) => b.id === brandId)?.name ?? "Unknown";
}

function resolveCustomerName(customerId?: string): string | undefined {
  if (!customerId) return undefined;
  return initialCustomers.find((c) => c.id === customerId)?.name;
}

function findProduct(id: string): Product {
  const product = products.find((p) => p.id === id);
  if (!product) notFoundError("Product", id);
  return product;
}

function replaceProduct(index: number, product: Product): Product {
  products[index] = product;
  return product;
}

function updateVersionInProduct(
  product: Product,
  versionId: string,
  updater: (version: ProductVersion) => ProductVersion,
): Product {
  const versionIndex = product.versions.findIndex((version) => version.id === versionId);
  if (versionIndex === -1) notFoundError("ProductVersion", versionId);

  const updatedVersion = updater(product.versions[versionIndex]);
  const versions = [...product.versions];
  versions[versionIndex] = updatedVersion;

  const synced = syncProductFromVersion({ ...product, versions }, updatedVersion);
  return synced;
}

export const mockProductService: ProductService = {
  async list(filters) {
    await delay();
    return applyListQuery(
      products,
      filters,
      ["name", "sku", "description", "categoryName", "brandName", "customerName", "projectName"],
      (item) => {
        if (filters.categoryId && item.categoryId !== filters.categoryId) return false;
        if (filters.brandId && item.brandId !== filters.brandId) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (filters.availableForCustomerId !== undefined) {
          const customerId = filters.availableForCustomerId;
          const isDefault = !item.customerId;
          const belongsToCustomer = Boolean(customerId) && item.customerId === customerId;
          if (!isDefault && !belongsToCustomer) return false;
        } else if (filters.customerId && item.customerId !== filters.customerId) {
          return false;
        }
        if (filters.versionStatus) {
          const current = getCurrentVersion(item);
          if (current.status !== filters.versionStatus) return false;
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
    return findProduct(id);
  },

  async create(data) {
    await delay();
    const timestamp = nowIso();
    const product = buildProductFromForm(
      generateId("prd"),
      data,
      resolveCategoryName(data.categoryId),
      resolveBrandName(data.brandId),
      { createdAt: timestamp, updatedAt: timestamp },
      resolveCustomerName(data.customerId),
    );
    products.push(product);
    return product;
  },

  async update(id, data) {
    await delay();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) notFoundError("Product", id);

    const existing = products[index];
    const editableVersion = existing.versions.find((version) => isVersionEditable(version));
    if (!editableVersion) {
      throw new Error("This product cannot be edited yet. Click Copy to edit on the product to make changes.");
    }

    const mergedForm = { ...formDataFromProduct(existing), ...data };
    const timestamp = nowIso();

    let updated = applyHeaderFormData(
      existing,
      {
        sku: mergedForm.sku,
        name: mergedForm.name,
        description: mergedForm.description,
        categoryId: mergedForm.categoryId,
        brandId: mergedForm.brandId,
        productType: mergedForm.productType,
        customerId: mergedForm.customerId,
        projectId: mergedForm.projectId,
        projectName: mergedForm.projectName,
        status: mergedForm.status,
      },
      mergedForm.categoryId ? resolveCategoryName(mergedForm.categoryId) : undefined,
      mergedForm.brandId ? resolveBrandName(mergedForm.brandId) : undefined,
      resolveCustomerName(mergedForm.customerId),
      timestamp,
    );

    updated = updateVersionInProduct(
      updated,
      editableVersion.id,
      (version) => applyVersionFormData(version, versionFormDataFromProductForm(mergedForm), timestamp),
    );

    return replaceProduct(index, updated);
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

  async getVersion(productId, versionId) {
    await delay();
    const product = findProduct(productId);
    const version = getVersionById(product, versionId);
    if (!version) notFoundError("ProductVersion", versionId);
    return version;
  },

  async updateVersion(productId, versionId, data) {
    await delay();
    const index = products.findIndex((p) => p.id === productId);
    if (index === -1) notFoundError("Product", productId);

    const product = products[index];
    const version = getVersionById(product, versionId);
    if (!version) notFoundError("ProductVersion", versionId);
    if (!isVersionEditable(version)) {
      throw new Error("This product version is locked. Click Copy to edit to make changes.");
    }

    const updated = updateVersionInProduct(
      product,
      versionId,
      (current) => applyVersionFormData(current, data, nowIso()),
    );
    return replaceProduct(index, updated);
  },

  async reviseVersion(productId, sourceVersionId, revisionNotes) {
    await delay();
    const index = products.findIndex((p) => p.id === productId);
    if (index === -1) notFoundError("Product", productId);

    const product = products[index];
    const source = getVersionById(product, sourceVersionId);
    if (!source) notFoundError("ProductVersion", sourceVersionId);

    const nextVersionNumber = Math.max(...product.versions.map((v) => v.versionNumber), 0) + 1;
    const timestamp = nowIso();
    const newVersion = createVersionFromExisting(source, nextVersionNumber, timestamp, revisionNotes);

    const updated = syncProductFromVersion(
      {
        ...product,
        versions: [...product.versions, newVersion],
        currentVersionId: newVersion.id,
        updatedAt: timestamp,
      },
      newVersion,
    );

    return replaceProduct(index, updated);
  },

  async updateHeader(productId, data) {
    await delay();
    const index = products.findIndex((p) => p.id === productId);
    if (index === -1) notFoundError("Product", productId);

    const updated = applyHeaderFormData(
      products[index],
      data,
      data.categoryId ? resolveCategoryName(data.categoryId) : undefined,
      data.brandId ? resolveBrandName(data.brandId) : undefined,
      resolveCustomerName(data.customerId),
      nowIso(),
    );
    return replaceProduct(index, updated);
  },
};

export function resetMockProducts(): void {
  products = cloneData(initialProducts).map(migrateLegacyProduct);
}
