import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { Button, StatusBadge, Tabs, TabList, Tab, TabPanel } from "@/components/ui";
import { InventoryPriceHistoryTable } from "@/features/inventory/components/InventoryPriceHistoryTable";
import {
  useInventoryItem,
  useInventoryPriceHistory,
} from "@/features/inventory/hooks/useInventory";
import { EntityStatusBadge } from "@/features/shared/components/EntityStatusBadge";
import { MappedStatusBadge } from "@/features/shared/components/MappedStatusBadge";
import {
  calculateMarginPercent,
  calculateProfit,
} from "@/lib/inventoryPricing";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import {
  InventoryItemTypeLabels,
  PricingMethodLabels,
} from "@/types/inventory";
import { StockStatus } from "@/types/status";

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

export function InventoryDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "general";
  const [activeTab, setActiveTab] = useState(initialTab);

  const { data: item, isLoading, error, refetch } = useInventoryItem(id);
  const { data: priceHistory, isLoading: historyLoading } = useInventoryPriceHistory(id);

  const marginSummary = useMemo(() => {
    if (!item) return null;
    const profit = calculateProfit(item.costPrice, item.sellingPrice);
    const marginPercent = calculateMarginPercent(item.costPrice, item.sellingPrice);
    return { profit, marginPercent };
  }, [item]);

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title={item?.name ?? "Inventory Item"}
        description={item?.sku}
        breadcrumbs={[
          { label: "Inventory", href: ROUTES.inventory.list },
          { label: item?.name ?? "Details" },
        ]}
        actions={
          item && (
            <>
              <Button
                variant="outline"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => navigate(ROUTES.inventory.list)}
              >
                Back
              </Button>
              <Link to={ROUTES.inventory.edit(item.id)}>
                <Button leftIcon={<Pencil className="h-4 w-4" />}>Edit Item</Button>
              </Link>
            </>
          )
        }
      />

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load inventory item." : null}
        onRetry={() => void refetch()}
        loadingVariant="card"
      >
        {item && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <EntityStatusBadge status={item.status} />
              <MappedStatusBadge statusMap={StockStatus} value={item.stockStatus} dot />
              <StatusBadge variant="neutral">{InventoryItemTypeLabels[item.itemType]}</StatusBadge>
              <StatusBadge variant="neutral">{item.category}</StatusBadge>
            </div>

            <Tabs value={activeTab} onChange={setActiveTab}>
              <TabList>
                <Tab value="general">General</Tab>
                <Tab value="inventory">Inventory</Tab>
                <Tab value="cost">Cost</Tab>
                <Tab value="pricing">Pricing</Tab>
                <Tab value="history">Price History</Tab>
              </TabList>

              <TabPanel value="general" className="pt-4">
                <DetailSection title="Item Details">
                  <DetailField label="Item Code (SKU)" value={item.sku} />
                  <DetailField label="Item Name" value={item.name} />
                  <DetailField label="Item Type" value={InventoryItemTypeLabels[item.itemType]} />
                  <DetailField label="Unit of Measure" value={item.unit} />
                  <DetailField label="Category" value={item.category} />
                  <DetailField label="Brand" value={item.brand ?? "-"} />
                  <DetailField label="Supplier" value={item.supplier ?? "-"} />
                  <DetailField label="Tax Code" value={item.taxCode ?? "-"} />
                  <DetailField
                    label="Description"
                    value={item.description ?? "-"}
                  />
                </DetailSection>
              </TabPanel>

              <TabPanel value="inventory" className="pt-4">
                <div className="space-y-4">
                  <DetailSection title="Stock Levels">
                    <DetailField label="On Hand" value={formatNumber(item.quantityOnHand)} />
                    <DetailField label="Reserved" value={formatNumber(item.quantityReserved)} />
                    <DetailField label="Available" value={formatNumber(item.quantityAvailable)} />
                    <DetailField label="Minimum Stock" value={formatNumber(item.minStock)} />
                    <DetailField label="Maximum Stock" value={formatNumber(item.maxStock)} />
                    <DetailField label="Reorder Level" value={formatNumber(item.reorderLevel)} />
                    <DetailField
                      label="Reorder Quantity"
                      value={formatNumber(item.reorderQuantity)}
                    />
                  </DetailSection>
                  <DetailSection title="Warehouse">
                    <DetailField label="Warehouse" value={item.warehouse} />
                    <DetailField
                      label="Last Restocked"
                      value={item.lastRestockedAt ? formatDate(item.lastRestockedAt) : "-"}
                    />
                  </DetailSection>
                </div>
              </TabPanel>

              <TabPanel value="cost" className="pt-4">
                <DetailSection title="Cost Prices">
                  <DetailField
                    label="Buying Price"
                    value={
                      item.buyingPrice != null
                        ? formatCurrency(item.buyingPrice, "LKR")
                        : "Not set"
                    }
                  />
                  <DetailField
                    label="Cost Price (BOM / Manufacturing)"
                    value={formatCurrency(item.costPrice, "LKR")}
                  />
                </DetailSection>
                <p className="mt-3 text-xs text-muted-foreground">
                  Cost price is used for BOM and manufacturing costing. It is kept separate from
                  the inventory selling price.
                </p>
              </TabPanel>

              <TabPanel value="pricing" className="pt-4">
                <DetailSection title="Selling Price & Margin">
                  <DetailField
                    label="Pricing Method"
                    value={PricingMethodLabels[item.pricingMethod]}
                  />
                  {item.pricingMethod === "percentage_markup" && (
                    <DetailField label="Markup %" value={`${item.markupPercent}%`} />
                  )}
                  {item.pricingMethod === "fixed_markup" && (
                    <DetailField
                      label="Fixed Markup"
                      value={formatCurrency(item.markupFixedAmount, "LKR")}
                    />
                  )}
                  <DetailField
                    label="Selling Price"
                    value={formatCurrency(item.sellingPrice, "LKR")}
                  />
                  <DetailField label="Effective Date" value={formatDate(item.pricingEffectiveDate)} />
                  {marginSummary && (
                    <>
                      <DetailField
                        label="Profit"
                        value={formatCurrency(marginSummary.profit, "LKR")}
                      />
                      <DetailField
                        label="Margin"
                        value={`${marginSummary.marginPercent.toFixed(1)}%`}
                      />
                    </>
                  )}
                </DetailSection>
              </TabPanel>

              <TabPanel value="history" className="pt-4">
                <InventoryPriceHistoryTable
                  entries={priceHistory ?? []}
                  isLoading={historyLoading}
                />
              </TabPanel>
            </Tabs>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
}
