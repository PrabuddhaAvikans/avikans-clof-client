import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Copy, Lock, Pencil } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button, StatusBadge, Tabs, TabList, Tab, TabPanel } from "@/components/ui";
import { DuplicateProductModal } from "@/features/products/components/DuplicateProductModal";
import { ProductVersionsPanel } from "@/features/products/components/ProductVersionsPanel";
import { ProductBomPanel } from "@/features/products/components/ProductBomPanel";
import { ProductVersionStatusBadge } from "@/features/products/components/ProductVersionStatusBadge";
import { EntityStatusBadge } from "@/features/shared/components/EntityStatusBadge";
import { useProduct } from "@/features/products/hooks/useProducts";
import { getCurrentVersion, getVersionById, isVersionLocked } from "@/lib/productVersion";
import { formatCurrency, formatDate } from "@/lib/format";
import { ProductTypeLabels, computeTotalCost } from "@/types/product";
import type { ProductVersion } from "@/types/product";

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

export function ProductDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "general";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  const { data: product, isLoading, isError, refetch } = useProduct(id);

  const selectedVersion = useMemo(() => {
    if (!product) return null;
    const versionId = searchParams.get("version") ?? product.currentVersionId;
    return getVersionById(product, versionId) ?? getCurrentVersion(product);
  }, [product, searchParams]);

  const primaryImage =
    selectedVersion?.images.find((img) => img.isPrimary) ?? selectedVersion?.images[0];

  const handleSelectVersion = (versionId: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("version", versionId);
    params.set("tab", "specifications");
    navigate(`${ROUTES.products.detail(id)}?${params.toString()}`);
    setActiveTab("specifications");
  };

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
              <Button
                variant="outline"
                leftIcon={<Copy className="h-4 w-4" />}
                onClick={() => setDuplicateOpen(true)}
              >
                Duplicate
              </Button>
              {selectedVersion && !isVersionLocked(selectedVersion) && (
                <Link to={ROUTES.products.edit(product.id)}>
                  <Button leftIcon={<Pencil className="h-4 w-4" />}>Edit Draft Version</Button>
                </Link>
              )}
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
        {product && selectedVersion && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <EntityStatusBadge status={product.status} />
              <ProductVersionStatusBadge status={selectedVersion.status} dot />
              <StatusBadge variant="neutral">{ProductTypeLabels[product.productType]}</StatusBadge>
              <StatusBadge variant="neutral">{product.categoryName}</StatusBadge>
              {isVersionLocked(selectedVersion) && (
                <StatusBadge variant="warning">
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    {selectedVersion.label} Locked
                  </span>
                </StatusBadge>
              )}
            </div>

            <Tabs value={activeTab} onChange={setActiveTab}>
              <TabList>
                <Tab value="general">General</Tab>
                <Tab value="specifications">Specifications</Tab>
                <Tab value="versions">Versions</Tab>
                <Tab value="bom">BOM</Tab>
                <Tab value="operations">Manufacturing Ops</Tab>
                <Tab value="costing">Costing & Profitability</Tab>
              </TabList>

              <TabPanel value="general" className="pt-4">
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs lg:col-span-1">
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
                  <div className="space-y-4 lg:col-span-2">
                    <DetailSection title="Product Header">
                      <DetailField label="Product Code" value={product.sku} />
                      <DetailField label="Product Name" value={product.name} />
                      <DetailField label="Product Type" value={ProductTypeLabels[product.productType]} />
                      <DetailField label="Category" value={product.categoryName} />
                      <DetailField label="Brand" value={product.brandName} />
                      <DetailField label="Customer" value={product.customerName ?? "Default"} />
                      <DetailField label="Project" value={product.projectName ?? "-"} />
                      <DetailField label="Description" value={product.description} />
                    </DetailSection>
                    <DetailSection title={`Current View: ${selectedVersion.label}`}>
                      <DetailField
                        label="Selling Price"
                        value={formatCurrency(selectedVersion.basePrice, product.currency)}
                      />
                      <DetailField
                        label="Estimated Cost"
                        value={formatCurrency(selectedVersion.costPrice, product.currency)}
                      />
                      <DetailField label="Lead Time" value={`${selectedVersion.leadTimeDays} days`} />
                      <DetailField
                        label="Min Order Qty"
                        value={selectedVersion.minOrderQuantity}
                      />
                      <DetailField label="Updated" value={formatDate(selectedVersion.updatedAt)} />
                      {selectedVersion.releasedAt && (
                        <DetailField
                          label="Released"
                          value={formatDate(selectedVersion.releasedAt)}
                        />
                      )}
                    </DetailSection>
                  </div>
                </div>
              </TabPanel>

              <TabPanel value="specifications" className="pt-4">
                <DetailSection title={`Specifications - ${selectedVersion.label}`}>
                  <DetailField
                    label="Dimensions"
                    value={selectedVersion.specifications.dimensions ?? "-"}
                  />
                  <DetailField
                    label="Weight"
                    value={
                      selectedVersion.specifications.weightKg != null
                        ? `${selectedVersion.specifications.weightKg} kg`
                        : "-"
                    }
                  />
                  <DetailField label="Shape" value={selectedVersion.specifications.shape ?? "-"} />
                  <DetailField label="Design" value={selectedVersion.specifications.design ?? "-"} />
                  <DetailField label="Finish" value={selectedVersion.specifications.finish ?? "-"} />
                  <DetailField label="Colour" value={selectedVersion.specifications.colour ?? "-"} />
                  <DetailField
                    label="Mounting Type"
                    value={selectedVersion.specifications.mountingType ?? "-"}
                  />
                  <DetailField
                    label="Voltage"
                    value={selectedVersion.specifications.voltage ?? selectedVersion.specifications.inputVoltage ?? "-"}
                  />
                  <DetailField
                    label="Wattage"
                    value={
                      selectedVersion.specifications.wattage != null
                        ? `${selectedVersion.specifications.wattage} W`
                        : "-"
                    }
                  />
                  <DetailField
                    label="LED Type"
                    value={selectedVersion.specifications.ledType ?? "-"}
                  />
                  <DetailField
                    label="Colour Temperature"
                    value={selectedVersion.specifications.colorTemperature ?? "-"}
                  />
                  <DetailField label="Driver" value={selectedVersion.specifications.driver ?? "-"} />
                  <DetailField label="IP Rating" value={selectedVersion.specifications.ipRating ?? "-"} />
                  <DetailField label="Dimming" value={selectedVersion.specifications.dimming ?? "-"} />
                </DetailSection>

                {selectedVersion.attributes.length > 0 && (
                  <section className="mt-4 rounded-lg border border-border bg-card p-5 shadow-xs">
                    <h3 className="mb-4 text-sm font-semibold text-foreground">Technical Attributes</h3>
                    <dl className="grid gap-3 sm:grid-cols-2">
                      {selectedVersion.attributes.map((attr) => (
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
              </TabPanel>

              <TabPanel value="versions" className="pt-4">
                <ProductVersionsPanel
                  product={product}
                  selectedVersionId={selectedVersion.id}
                  onSelectVersion={handleSelectVersion}
                />
              </TabPanel>

              <TabPanel value="bom" className="pt-4">
                <ProductBomPanel product={product} version={selectedVersion} />
              </TabPanel>

              <TabPanel value="operations" className="pt-4">
                <OperationsDetailPanel version={selectedVersion} />
              </TabPanel>

              <TabPanel value="costing" className="pt-4">
                <CostingProfitabilityPanel version={selectedVersion} currency={product.currency} />
              </TabPanel>
            </Tabs>
          </div>
        )}
      </PageContent>

      <DuplicateProductModal
        open={duplicateOpen}
        product={product ?? null}
        onClose={() => setDuplicateOpen(false)}
        onCreated={(created) => {
          navigate(ROUTES.products.edit(created.id));
        }}
      />
    </PageContainer>
  );
}

function formatOpTime(hours: number | undefined): string {
  if (hours == null || hours === 0) return "-";
  if (hours < 1) return `${Math.round(hours * 60)} mins`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function OperationsDetailPanel({ version }: { version: ProductVersion }) {
  const ops = version.operations;
  const totalHours = ops.reduce((s, o) => s + (o.isEnabled !== false ? o.estimatedHours : 0), 0);
  const totalLabour = ops.reduce((s, o) => s + (o.isEnabled !== false && o.labourCostRate ? o.labourCostRate : 0), 0);
  const totalMachine = ops.reduce((s, o) => s + (o.isEnabled !== false && o.machineCost ? o.machineCost : 0), 0);

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
      <h3 className="mb-4 text-sm font-semibold text-foreground">
        Manufacturing Operations - {version.label}
      </h3>
      {ops.length === 0 ? (
        <p className="text-sm text-muted-foreground">No operations defined.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4">Seq</th>
                  <th className="pb-2 pr-4">Operation</th>
                  <th className="pb-2 pr-4">Workstation</th>
                  <th className="pb-2 pr-4">Depends on</th>
                  <th className="pb-2 pr-4 text-right">Est. Time</th>
                  <th className="pb-2 pr-4 text-right">Labour</th>
                  <th className="pb-2 pr-4">Machine</th>
                  <th className="pb-2 pr-4 text-right">Machine Cost</th>
                  <th className="pb-2 pr-4 text-center">Req</th>
                  <th className="pb-2 pr-4 text-center">Enabled</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((op) => (
                  <tr
                    key={op.id}
                    className={`border-b border-border last:border-0 ${op.isEnabled === false ? "opacity-40" : ""}`}
                  >
                    <td className="py-2.5 pr-4 font-mono text-xs">{op.sequence}</td>
                    <td className="py-2.5 pr-4">
                      <div className="font-medium">{op.name}</div>
                      {op.description && (
                        <div className="text-xs text-muted-foreground">{op.description}</div>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">{op.workstation || "-"}</td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                      {(op.prerequisiteOperationIds ?? [])
                        .map((id) => ops.find((item) => item.id === id)?.name)
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </td>
                    <td className="py-2.5 pr-4 text-right">{formatOpTime(op.estimatedHours)}</td>
                    <td className="py-2.5 pr-4 text-right">
                      {op.labourCostRate != null ? op.labourCostRate.toLocaleString() : "-"}
                    </td>
                    <td className="py-2.5 pr-4">{op.machineName || "-"}</td>
                    <td className="py-2.5 pr-4 text-right">
                      {op.machineCost != null ? op.machineCost.toLocaleString() : "-"}
                    </td>
                    <td className="py-2.5 pr-4 text-center">{op.isRequired !== false ? "✓" : "-"}</td>
                    <td className="py-2.5 pr-4 text-center">{op.isEnabled !== false ? "✓" : "-"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border">
                <tr>
                  <td colSpan={4} className="py-2.5 pr-4 font-semibold">
                    Total ({ops.filter((o) => o.isEnabled !== false).length} operations)
                  </td>
                  <td className="py-2.5 pr-4 text-right font-semibold">{formatOpTime(totalHours)}</td>
                  <td className="py-2.5 pr-4 text-right font-semibold">{totalLabour.toLocaleString()}</td>
                  <td className="py-2.5 pr-4" />
                  <td className="py-2.5 pr-4 text-right font-semibold">{totalMachine.toLocaleString()}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          {ops.some((o) => o.notes) && (
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Notes</h4>
              {ops.filter((o) => o.notes).map((op) => (
                <div key={op.id} className="rounded-md bg-muted/30 px-3 py-2 text-sm">
                  <span className="font-medium">{op.name}:</span>{" "}
                  <span className="text-muted-foreground">{op.notes}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function CostingProfitabilityPanel({
  version,
  currency,
}: {
  version: ProductVersion;
  currency: string;
}) {
  const cb = version.costBreakdown;
  const totalCost = computeTotalCost(cb);
  const sellingPrice = version.basePrice;
  const profit = sellingPrice - totalCost;
  const margin = sellingPrice > 0 ? ((sellingPrice - totalCost) / sellingPrice) * 100 : 0;
  const markup = totalCost > 0 ? ((sellingPrice - totalCost) / totalCost) * 100 : 0;

  const rows = [
    { label: "Materials", value: cb.materialCost },
    { label: "Labour", value: cb.labourCost },
    { label: "Coating / Finishing", value: cb.coatingFinishingCost },
    { label: "Machine", value: cb.machineCost },
    { label: "Overhead", value: cb.overheadCost },
    { label: "Other Expenses", value: cb.otherCost },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Cost</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(totalCost, currency)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Selling Price</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(sellingPrice, currency)}</p>
        </div>
        <div className={`rounded-lg border p-4 shadow-xs ${profit >= 0 ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Gross Profit</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${profit >= 0 ? "text-success" : "text-destructive"}`}>
            {formatCurrency(profit, currency)}
          </p>
        </div>
        <div className={`rounded-lg border p-4 shadow-xs ${margin >= 0 ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"}`}>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Margin / Markup</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${margin >= 0 ? "text-success" : "text-destructive"}`}>
            {margin.toFixed(1)}% / {markup.toFixed(1)}%
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
        <h3 className="mb-4 text-sm font-semibold text-foreground">
          Cost Breakdown - {version.label}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4 text-right">Amount</th>
                <th className="pb-2 pr-4 text-right">% of Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4">{row.label}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {formatCurrency(row.value, currency)}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {totalCost > 0 ? ((row.value / totalCost) * 100).toFixed(1) : "0.0"}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border">
              <tr>
                <td className="py-2.5 pr-4 font-semibold">Total Estimated Cost</td>
                <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                  {formatCurrency(totalCost, currency)}
                </td>
                <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
        {cb.notes && (
          <p className="mt-3 text-sm text-muted-foreground">{cb.notes}</p>
        )}
      </section>
    </div>
  );
}
