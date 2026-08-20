import { useMemo } from "react";
import { ProductBomReadOnlyTable } from "@/features/products/components/ProductBomEditor";
import { useUpdateProductVersion } from "@/features/products/hooks/useProducts";
import { calculateTotalMaterialCost } from "@/lib/bomCosting";
import { isVersionEditable } from "@/lib/productVersion";
import type { Product, ProductVersion } from "@/types/product";

export type ProductBomPanelProps = {
  product: Product;
  version: ProductVersion;
};

export function ProductBomPanel({ product, version }: ProductBomPanelProps) {
  const updateVersion = useUpdateProductVersion();
  const totalMaterialCost = useMemo(
    () => calculateTotalMaterialCost(version.bom),
    [version.bom],
  );

  const canApprove = isVersionEditable(version);

  const handleApproveAlternative = async (lineId: string, alternativeId: string) => {
    if (!canApprove) return;
    const bom = version.bom.map((line) => {
      if (line.id !== lineId) return line;
      return {
        ...line,
        alternatives: line.alternatives.map((alt) =>
          alt.id === alternativeId ? { ...alt, isApproved: true } : alt,
        ),
      };
    });

    await updateVersion.mutateAsync({
      productId: product.id,
      versionId: version.id,
      data: {
        bom: bom.map((item) => ({
          inventoryItemId: item.inventoryItemId,
          inventoryItemName: item.inventoryItemName,
          sku: item.sku,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitCost,
          wastePercent: item.wastePercent,
          isRequired: item.isRequired,
          notes: item.notes,
          sequence: item.sequence,
          alternatives: item.alternatives.map(({ id: _id, ...alt }) => alt),
        })),
      },
    });
  };

  return (
    <ProductBomReadOnlyTable
      bom={version.bom}
      currency={product.currency}
      totalMaterialCost={totalMaterialCost}
      onApproveAlternative={canApprove ? handleApproveAlternative : undefined}
    />
  );
}
