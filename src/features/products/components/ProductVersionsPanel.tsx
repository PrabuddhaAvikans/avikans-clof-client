import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { GitBranchPlus, Lock, Pencil } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { Input } from "@/components/ui/Input";
import { ProductVersionStatusBadge } from "@/features/products/components/ProductVersionStatusBadge";
import { useReviseProductVersion } from "@/features/products/hooks/useProducts";
import { isVersionLocked } from "@/lib/productVersion";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Product, ProductVersion } from "@/types/product";

export type ProductVersionsPanelProps = {
  product: Product;
  selectedVersionId?: string;
  onSelectVersion?: (versionId: string) => void;
};

export function ProductVersionsPanel({
  product,
  selectedVersionId,
  onSelectVersion,
}: ProductVersionsPanelProps) {
  const reviseVersion = useReviseProductVersion();
  const [reviseTarget, setReviseTarget] = useState<ProductVersion | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");

  const columns = useMemo<ColumnDef<ProductVersion>[]>(
    () => [
      {
        accessorKey: "label",
        header: "Version",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.label}</span>
            {isVersionLocked(row.original) && (
              <Lock className="h-3.5 w-3.5 text-muted-foreground" aria-label="Locked" />
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <ProductVersionStatusBadge status={row.original.status} dot />,
      },
      {
        accessorKey: "basePrice",
        header: "Selling Price",
        cell: ({ row }) => formatCurrency(row.original.basePrice, product.currency),
      },
      {
        accessorKey: "costPrice",
        header: "Est. Cost",
        cell: ({ row }) => formatCurrency(row.original.costPrice, product.currency),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => formatDate(row.original.updatedAt),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const version = row.original;
          const isSelected = selectedVersionId === version.id;
          const isCurrent = product.currentVersionId === version.id;

          return (
            <div className="flex items-center gap-1">
              {onSelectVersion && (
                <Button
                  size="sm"
                  variant={isSelected ? "primary" : "outline"}
                  onClick={() => onSelectVersion(version.id)}
                >
                  {isSelected ? "Viewing" : "View"}
                </Button>
              )}
              {isCurrent && !isVersionLocked(version) && (
                <Link to={ROUTES.products.edit(product.id)}>
                  <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />}>
                    Edit
                  </Button>
                </Link>
              )}
              {isVersionLocked(version) && (
                <Button
                  size="sm"
                  variant="outline"
                  leftIcon={<GitBranchPlus className="h-3.5 w-3.5" />}
                  onClick={() => setReviseTarget(version)}
                >
                  Revise
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [product, selectedVersionId, onSelectVersion],
  );

  const handleRevise = async () => {
    if (!reviseTarget) return;
    const updated = await reviseVersion.mutateAsync({
      productId: product.id,
      sourceVersionId: reviseTarget.id,
      revisionNotes: revisionNotes.trim() || undefined,
    });
    setReviseTarget(null);
    setRevisionNotes("");
    const newVersion = updated.versions.find((v) => v.id === updated.currentVersionId);
    if (newVersion && onSelectVersion) {
      onSelectVersion(newVersion.id);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Approved and released versions are locked. Create a new revision to change specifications,
        BOM, or costing.
      </p>
      <DataTable
        data={product.versions}
        columns={columns}
        getRowId={(row) => row.id}
        pageSize={10}
        forceTable
        density="compact"
      />

      <ConfirmationDialog
        open={Boolean(reviseTarget)}
        onClose={() => {
          setReviseTarget(null);
          setRevisionNotes("");
        }}
        onConfirm={() => void handleRevise()}
        title={`Create revision from ${reviseTarget?.label ?? ""}`}
        description="This creates a new draft version. The source version remains locked."
        confirmLabel="Create Revision"
        loading={reviseVersion.isPending}
      >
        <Input
          label="Revision notes"
          value={revisionNotes}
          onChange={(event) => setRevisionNotes(event.target.value)}
          placeholder="Describe what changed and why"
        />
      </ConfirmationDialog>
    </div>
  );
}
