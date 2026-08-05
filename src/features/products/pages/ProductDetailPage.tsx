import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button, StatusBadge } from "@/components/ui";
import { ROUTES } from "@/app/config/routes";
import { useProduct } from "@/features/products/hooks/useProducts";
import { formatCurrency, formatDate } from "@/lib/format";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading, isError, refetch } = useProduct(id ?? "");

  const primaryImage = product?.images.find((img) => img.isPrimary) ?? product?.images[0];

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title={product?.name ?? "Product Details"}
        description={product?.sku}
        breadcrumbs={[
          { label: "Products", href: ROUTES.products.list },
          { label: product?.name ?? "Details" },
        ]}
        actions={
          product && (
            <>
              <Button
                variant="outline"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => navigate(ROUTES.products.list)}
              >
                Back
              </Button>
              <Link to={ROUTES.products.edit(product.id)}>
                <Button leftIcon={<Pencil className="h-4 w-4" />}>Edit Product</Button>
              </Link>
            </>
          )
        }
      />

      <PageContent
        isLoading={isLoading}
        error={isError ? "Failed to load product." : null}
        onRetry={() => void refetch()}
        loadingVariant="card"
      >
        {product && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
                {primaryImage ? (
                  <img
                    src={primaryImage.url}
                    alt={primaryImage.alt ?? product.name}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-muted text-muted-foreground">
                    No image
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6 lg:col-span-2">
              <section className="rounded-lg border border-border bg-card p-6 shadow-xs">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    variant={product.status === "active" ? "success" : "neutral"}
                    dot
                  >
                    {product.status}
                  </StatusBadge>
                  <StatusBadge variant="neutral">{product.categoryName}</StatusBadge>
                  <StatusBadge variant="neutral">{product.brandName}</StatusBadge>
                </div>
                <p className="text-sm text-muted-foreground">{product.description}</p>
                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Base Price</dt>
                    <dd className="mt-1 text-lg font-semibold">
                      {formatCurrency(product.basePrice, product.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Est. Cost</dt>
                    <dd className="mt-1 text-lg font-semibold">
                      {formatCurrency(product.costPrice, product.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Lead Time</dt>
                    <dd className="mt-1">{product.leadTimeDays} days</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Min Order Qty</dt>
                    <dd className="mt-1">{product.minOrderQuantity}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Updated</dt>
                    <dd className="mt-1">{formatDate(product.updatedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase text-muted-foreground">Tags</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {product.tags.map((tag) => (
                        <StatusBadge key={tag} variant="neutral" size="sm">
                          {tag}
                        </StatusBadge>
                      ))}
                    </dd>
                  </div>
                </dl>
              </section>

              {product.attributes.length > 0 && (
                <section className="rounded-lg border border-border bg-card p-6 shadow-xs">
                  <h3 className="mb-4 text-sm font-semibold text-foreground">Attributes</h3>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {product.attributes.map((attr) => (
                      <div key={attr.id} className="rounded-md bg-muted/30 px-3 py-2">
                        <dt className="text-xs text-muted-foreground">{attr.name}</dt>
                        <dd className="font-medium text-foreground">
                          {attr.value}
                          {attr.unit ? ` ${attr.unit}` : ""}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}

              {product.bom.length > 0 && (
                <section className="rounded-lg border border-border bg-card p-6 shadow-xs">
                  <h3 className="mb-4 text-sm font-semibold text-foreground">Bill of Materials</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                          <th className="pb-2 pr-4">Item</th>
                          <th className="pb-2 pr-4">SKU</th>
                          <th className="pb-2 pr-4 text-right">Qty</th>
                          <th className="pb-2 text-right">Unit Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {product.bom.map((item) => (
                          <tr key={item.id} className="border-b border-border last:border-0">
                            <td className="py-2 pr-4">{item.inventoryItemName}</td>
                            <td className="py-2 pr-4 text-muted-foreground">{item.sku}</td>
                            <td className="py-2 pr-4 text-right">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-2 text-right">
                              {formatCurrency(item.unitCost, product.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}
