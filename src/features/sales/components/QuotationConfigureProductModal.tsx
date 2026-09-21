import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, SlidersHorizontal } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCurrentVersion, getVersionById } from "@/lib/productVersion";
import { getProductScopeLabel, isDefaultCatalogProduct } from "@/lib/productOwner";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types/product";
import type { QuotationLineItemFormValues } from "@/features/sales/schemas/quotationSchema";

export type QuotationConfigureProductModalProps = {
  open: boolean;
  product: Product | null;
  documentLabel?: string;
  onClose: () => void;
  onAddStandard: (line: QuotationLineItemFormValues) => void;
  onCustomize: (args: {
    product: Product;
    versionId: string;
    quantity: number;
    unitPrice: number;
  }) => void;
};

export function QuotationConfigureProductModal({
  open,
  product,
  documentLabel = "quotation",
  onClose,
  onAddStandard,
  onCustomize,
}: QuotationConfigureProductModalProps) {
  const versionOptions = useMemo(() => {
    if (!product) return [];
    return [...product.versions]
      .sort((a, b) => b.versionNumber - a.versionNumber)
      .map((version) => ({
        value: version.id,
        label: `${version.label} · ${version.status.replace(/_/g, " ")}`,
      }));
  }, [product]);

  const defaultVersionId = product ? getCurrentVersion(product).id : "";
  const [versionId, setVersionId] = useState(defaultVersionId);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);

  useEffect(() => {
    if (!product || !open) return;
    const current = getCurrentVersion(product);
    setVersionId(current.id);
    setQuantity(Math.max(1, current.minOrderQuantity || 1));
    setUnitPrice(current.basePrice);
  }, [product, open]);

  if (!product) return null;

  const selectedVersion =
    getVersionById(product, versionId) ?? getCurrentVersion(product);

  const buildStandardLine = (): QuotationLineItemFormValues => ({
    productId: product.id,
    productSku: product.sku,
    productName: product.name,
    description: product.description,
    productVersionId: selectedVersion.id,
    productVersionLabel: selectedVersion.label,
    quantity,
    unitPrice,
    discountPercent: 0,
    taxPercent: 18,
    isCustomized: false,
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configure Product"
      size="md"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            leftIcon={<SlidersHorizontal className="h-3.5 w-3.5" />}
            onClick={() =>
              onCustomize({
                product,
                versionId: selectedVersion.id,
                quantity,
                unitPrice,
              })
            }
          >
            Customize Product
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onAddStandard(buildStandardLine());
              onClose();
            }}
          >
            Add as Standard
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Link
            to={ROUTES.products.detail(product.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {product.name}
            <ExternalLink className="h-3 w-3" />
          </Link>
          <p className="text-[12px] text-muted-foreground">
            {product.sku} · {product.categoryName}
          </p>
          <div className="mt-1.5">
            <StatusBadge
              variant={isDefaultCatalogProduct(product) ? "neutral" : "info"}
              size="sm"
            >
              {getProductScopeLabel(product)}
            </StatusBadge>
          </div>
        </div>

        <Select
          label="Product Version"
          required
          options={versionOptions}
          value={versionId}
          onChange={(e) => {
            const nextId = e.target.value;
            setVersionId(nextId);
            const version = getVersionById(product, nextId);
            if (version) setUnitPrice(version.basePrice);
          }}
          hint="Standard uses this version as-is. Customize keeps the master product unchanged."
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Quantity"
            type="number"
            min={1}
            required
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          />
          <Input
            label="Selling Price"
            type="number"
            min={0}
            step={0.01}
            required
            value={unitPrice}
            onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value) || 0))}
            hint={`Version list price: ${formatCurrency(selectedVersion.basePrice, product.currency)}`}
          />
        </div>

        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Standard:</span> use current
            version pricing and specifications without changes.
          </p>
          <p className="mt-1">
            <span className="font-medium text-foreground">Customize:</span> create a{" "}
            {documentLabel}-level configuration for this customer. The master product
            stays unchanged.
          </p>
        </div>
      </div>
    </Modal>
  );
}
