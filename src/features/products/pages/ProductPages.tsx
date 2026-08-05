import { ListPageShell } from "@/features/shared/components/ListPageShell";
export { ProductListPage } from "@/features/products/pages/ProductListPage";
export { ProductFormPage } from "@/features/products/pages/ProductFormPage";
export { ProductDetailPage } from "@/features/products/pages/ProductDetailPage";
export { CategoryListPage } from "@/features/products/pages/CategoryListPage";
export { BrandListPage } from "@/features/products/pages/BrandListPage";

export function ProductAttributesPage() {
  return (
    <ListPageShell
      title="Product Attributes"
      description="Configure product attribute definitions."
    />
  );
}

export function PriceListsPage() {
  return (
    <ListPageShell
      title="Price Lists"
      description="Manage pricing tiers and lists."
    />
  );
}

// Legacy aliases
export { ProductFormPage as CreateProductPage } from "@/features/products/pages/ProductFormPage";
export { CategoryListPage as CategoriesPage } from "@/features/products/pages/CategoryListPage";
export { BrandListPage as BrandsPage } from "@/features/products/pages/BrandListPage";
