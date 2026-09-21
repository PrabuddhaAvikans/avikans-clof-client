import type { ReactNode } from "react";
import { useFormikContext } from "formik";
import {
  ChevronDown,
  Copy,
  Eye,
  ImageIcon,
  Layers,
  MoreHorizontal,
} from "lucide-react";
import { Button, StatusBadge } from "@/components/ui";
import type { ProductFormSchemaValues } from "@/features/products/schemas/productSchema";
import { cn } from "@/lib/utils";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  custom_lighting: "Custom Lighting",
  finished_good: "Finished Good",
  component: "Component",
  raw_material: "Raw Material",
  service: "Service",
  standard_fixture: "Standard Fixture",
  component_kit: "Component Kit",
};

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border py-1.5 last:border-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] truncate text-right text-[12px] font-medium text-foreground" title={value || "-"}>
        {value || "-"}
      </dd>
    </div>
  );
}

export function ProductFormPreview({
  categoryLabel,
  brandLabel,
  previewImageUrl,
}: {
  categoryLabel: string;
  brandLabel: string;
  previewImageUrl?: string;
}) {
  const { values } = useFormikContext<ProductFormSchemaValues>();
  const statusLabel = values.status === "active" ? "Active" : "Draft";

  return (
    <aside className="space-y-3">
      <section className="overflow-hidden rounded-md border border-border bg-card">
        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-border bg-muted">
          {previewImageUrl ? (
            <img
              src={previewImageUrl}
              alt={values.name || "Product preview"}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-10 w-10 text-muted-foreground" aria-hidden />
          )}
        </div>
        <div className="space-y-3 p-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Product Preview
            </p>
            <div className="mt-1 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold tabular-nums text-foreground" title={values.sku || "Product code"}>
                  {values.sku || "Product code"}
                </p>
                <p className="truncate text-sm font-semibold text-foreground" title={values.name || "Product name"}>
                  {values.name || "Product name"}
                </p>
              </div>
              <StatusBadge
                variant={values.status === "active" ? "success" : "warning"}
                size="sm"
              >
                {statusLabel}
              </StatusBadge>
            </div>
          </div>

          <dl>
            <PreviewRow
              label="Type"
              value={PRODUCT_TYPE_LABELS[values.productType] ?? values.productType}
            />
            <PreviewRow label="Category" value={categoryLabel} />
            <PreviewRow label="Brand" value={brandLabel} />
            <PreviewRow
              label="Wattage"
              value={values.wattage != null ? `${values.wattage} W` : ""}
            />
            <PreviewRow
              label="Lumens"
              value={values.lumenOutput != null ? `${values.lumenOutput} lm` : ""}
            />
            <PreviewRow label="CCT" value={values.colorTemperature ?? ""} />
            <PreviewRow label="IP Rating" value={values.ipRating ?? ""} />
            <PreviewRow
              label="Lead Time"
              value={values.leadTimeDays != null ? `${values.leadTimeDays} days` : ""}
            />
          </dl>

          {values.optionGroups.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Configured Options
              </p>
              <ul className="space-y-1">
                {values.optionGroups.slice(0, 4).map((group, index) => (
                  <li
                    key={`${group.name}-${index}`}
                    className="flex items-start gap-1.5 text-[11px] text-foreground"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-600" />
                    <span className="min-w-0">
                      <span className="font-medium">{group.name || "Group"}</span>
                      {group.optionsText ? (
                        <span className="text-muted-foreground"> - {group.optionsText}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-1.5 rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </p>
        <QuickAction icon={<Copy className="h-3.5 w-3.5" />} label="Clone Product" />
        <QuickAction
          icon={<Layers className="h-3.5 w-3.5" />}
          label="Create variant"
        />
        <QuickAction icon={<Eye className="h-3.5 w-3.5" />} label="Preview as Customer" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-full justify-between text-[12px]"
          rightIcon={<ChevronDown className="h-3.5 w-3.5" />}
        >
          <span className="inline-flex items-center gap-1.5">
            <MoreHorizontal className="h-3.5 w-3.5" />
            More Actions
          </span>
        </Button>
      </section>
    </aside>
  );
}

function QuickAction({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-8 w-full justify-start text-[12px]")}
      leftIcon={icon}
    >
      {label}
    </Button>
  );
}
