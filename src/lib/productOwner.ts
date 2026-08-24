/** Catalog products with no customer assignment. */
export function isDefaultCatalogProduct(product: {
  customerId?: string;
}): boolean {
  return !product.customerId;
}

/** "Default" for catalog items, otherwise the assigned customer name. */
export function getProductScopeLabel(product: {
  customerId?: string;
  customerName?: string;
}): string {
  if (isDefaultCatalogProduct(product)) return "Default";
  return product.customerName?.trim() || "Customer";
}
