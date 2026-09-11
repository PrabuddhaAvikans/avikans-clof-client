export function isDefaultCatalogProduct(product: {
  customerId?: string;
}): boolean {
  return !product.customerId;
}

export function getProductScopeLabel(product: {
  customerId?: string;
  customerName?: string;
}): string {
  if (isDefaultCatalogProduct(product)) return "Default";
  return product.customerName?.trim() || "Customer";
}
