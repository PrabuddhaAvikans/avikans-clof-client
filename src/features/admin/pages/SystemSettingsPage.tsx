import { useMemo, useState, type ReactNode } from "react";
import { Building2, Calculator, Globe, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/Switch";
import { Textarea } from "@/components/ui/Textarea";
import { CostingRatesForm } from "@/features/admin/components/CostingRatesForm";
import { SystemLogoUploader } from "@/features/admin/components/SystemLogoUploader";
import { usePermissions } from "@/hooks/usePermissions";
import { COUNTRY_CONFIG, getCountryConfig } from "@/lib/countryConfig";
import { loadCostingRates, type CostingRates } from "@/lib/costingRates";
import {
  workspaceGrid,
  workspaceGridCol,
  workspaceListPanelBody,
  workspaceListPanelShell,
  workspacePanelBody,
  workspacePanelShell,
} from "@/lib/panelLayout";
import {
  DEFAULT_SYSTEM_SETTINGS,
  formatDocumentNumber,
  loadSystemSettings,
  saveSystemSettings,
  type SystemSettings,
} from "@/lib/systemSettings";
import { cn } from "@/lib/utils";

const COUNTRY_SETTING_OPTIONS = Object.keys(COUNTRY_CONFIG).map((country) => ({
  value: country,
  label: country,
}));

const SECTIONS = [
  {
    id: "company",
    label: "Company",
    description: "Name, logo, subtitle, and contact",
    icon: Building2,
  },
  {
    id: "regional",
    label: "Regional & tax",
    description: "Country, currency, and VAT",
    icon: Globe,
  },
  {
    id: "costing",
    label: "Costing rates",
    description: "Labour, overtime, and overhead",
    icon: Calculator,
  },
  // {
  //   id: "sales",
  //   label: "Sales defaults",
  //   description: "Quotations and payment terms",
  //   icon: FileText,
  // },
  // {
  //   id: "documents",
  //   label: "Documents",
  //   description: "Number prefixes",
  //   icon: Hash,
  // },
] as const;

type SettingsSection = (typeof SECTIONS)[number]["id"];

function settingsEqual(left: SystemSettings, right: SystemSettings): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function SystemSettingsPage() {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission("settings:edit");

  const [saved, setSaved] = useState<SystemSettings>(loadSystemSettings);
  const [draft, setDraft] = useState<SystemSettings>(saved);
  const [section, setSection] = useState<SettingsSection>("company");
  const [, setCostingRates] = useState<CostingRates>(loadCostingRates);

  const countryConfig = getCountryConfig(draft.country);
  const dirty = !settingsEqual(draft, saved);

  const update = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const handleCountryChange = (nextCountry: string) => {
    setDraft((current) => ({
      ...current,
      country: nextCountry,
      taxRate: getCountryConfig(nextCountry).defaultTaxRate,
    }));
  };

  const handleSave = () => {
    if (!draft.companyName.trim()) {
      toast.error("Company name is required");
      setSection("company");
      return;
    }
    try {
      saveSystemSettings(draft);
      setSaved(draft);
      toast.success("System settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    }
  };

  const handleReset = () => {
    const defaults = { ...DEFAULT_SYSTEM_SETTINGS };
    setDraft(defaults);
    setSection("company");
  };

  const documentPreview = useMemo(
    () => ({
      quotation: formatDocumentNumber(draft.quotationPrefix || "QT", 146),
      salesOrder: formatDocumentNumber(draft.salesOrderPrefix || "SO", 99),
      job: formatDocumentNumber(draft.jobPrefix || "PJ", 1008, { year: false }),
      delivery: formatDocumentNumber(draft.deliveryPrefix || "DL", 501),
    }),
    [draft.quotationPrefix, draft.salesOrderPrefix, draft.jobPrefix, draft.deliveryPrefix],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="System Settings"
        description="Company defaults used across quotations, tax, costing, and document numbers."
        breadcrumbs={[{ label: "Configuration", href: ROUTES.configuration.hub }, { label: "System Settings" }]}
        actions={
          canEdit ? (
            <>
              <Button
                variant="outline"
                leftIcon={<RotateCcw className="h-4 w-4" />}
                onClick={handleReset}
              >
                Reset defaults
              </Button>
              <Button
                variant="primary"
                leftIcon={<Save className="h-4 w-4" />}
                disabled={!dirty}
                onClick={handleSave}
              >
                Save Settings
              </Button>
            </>
          ) : undefined
        }
      />

      <div className={workspaceGrid}>
          <div className={cn(workspaceGridCol, "lg:col-span-3")}>
            <div className={workspaceListPanelShell}>
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">Settings</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {dirty ? "Unsaved changes" : "All changes saved"}
                </p>
              </div>
              <div className={workspaceListPanelBody}>
                <ul className="divide-y divide-border">
                  {SECTIONS.map((item) => {
                    const selected = item.id === section;
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSection(item.id)}
                          className={cn(
                            "flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                            selected && "bg-primary/5 hover:bg-primary/5",
                          )}
                        >
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-foreground">
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>

          <div className={cn(workspaceGridCol, "lg:col-span-9")}>
            <div className={workspacePanelShell}>
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold text-foreground">
                  {SECTIONS.find((item) => item.id === section)?.label}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {SECTIONS.find((item) => item.id === section)?.description}
                </p>
              </div>
              <div className={workspacePanelBody}>
                {section === "company" && (
                  <SectionCard
                    title="Company profile"
                    description="Shown on quotations, emails, and printed documents."
                  >
                    <SystemLogoUploader
                      value={draft.logoUrl}
                      disabled={!canEdit}
                      onChange={(logoUrl) => update("logoUrl", logoUrl)}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Company name"
                        value={draft.companyName}
                        disabled={!canEdit}
                        onChange={(event) => update("companyName", event.target.value)}
                      />
                      <Input
                        label="Tagline"
                        value={draft.tagline}
                        disabled={!canEdit}
                        hint="Shown on quotations and printed documents"
                        onChange={(event) => update("tagline", event.target.value)}
                      />
                      <div className="sm:col-span-2">
                        <Input
                          label="App subtitle"
                          value={draft.appSubtitle}
                          disabled={!canEdit}
                          hint="Shown under the logo in the sidebar and login screen"
                          onChange={(event) => update("appSubtitle", event.target.value)}
                        />
                      </div>
                      <Input
                        label="Email"
                        type="email"
                        value={draft.email}
                        disabled={!canEdit}
                        onChange={(event) => update("email", event.target.value)}
                      />
                      <Input
                        label="Phone"
                        value={draft.phone}
                        disabled={!canEdit}
                        onChange={(event) => update("phone", event.target.value)}
                      />
                      <Input
                        label="Website"
                        value={draft.website}
                        disabled={!canEdit}
                        onChange={(event) => update("website", event.target.value)}
                      />
                      <Input
                        label={`${countryConfig.taxName} registration`}
                        value={draft.taxRegistration}
                        disabled={!canEdit}
                        onChange={(event) => update("taxRegistration", event.target.value)}
                      />
                      <div className="sm:col-span-2">
                        <Textarea
                          label="Address"
                          rows={3}
                          value={draft.address}
                          disabled={!canEdit}
                          onChange={(event) => update("address", event.target.value)}
                        />
                      </div>
                    </div>
                  </SectionCard>
                )}

                {section === "regional" && (
                  <SectionCard
                    title="Operating region"
                    description="Country drives currency and default tax display on sales documents."
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        label="Operating country"
                        value={draft.country}
                        disabled={!canEdit}
                        onChange={(event) => handleCountryChange(event.target.value)}
                        options={COUNTRY_SETTING_OPTIONS}
                      />
                      <Input
                        label="Default currency"
                        value={countryConfig.currency}
                        disabled
                        hint="Derived from country configuration"
                      />
                      <Input
                        label={`Default ${countryConfig.taxName} rate (%)`}
                        type="number"
                        min={0}
                        max={100}
                        value={draft.taxRate}
                        disabled={!canEdit}
                        onChange={(event) =>
                          update("taxRate", event.target.value === "" ? 0 : Number(event.target.value))
                        }
                      />
                      <Input
                        label="Tax display"
                        value={countryConfig.taxComponents.map((item) => item.code).join(" + ")}
                        disabled
                      />
                    </div>
                  </SectionCard>
                )}

                {section === "sales" && (
                  <SectionCard
                    title="Sales defaults"
                    description="Applied when creating quotations and converting to orders."
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Quotation validity (days)"
                        type="number"
                        min={1}
                        value={draft.quotationValidityDays}
                        disabled={!canEdit}
                        onChange={(event) =>
                          update(
                            "quotationValidityDays",
                            event.target.value === "" ? 1 : Number(event.target.value),
                          )
                        }
                      />
                      <Input
                        label="Payment terms (days)"
                        type="number"
                        min={0}
                        value={draft.paymentTermsDays}
                        disabled={!canEdit}
                        onChange={(event) =>
                          update(
                            "paymentTermsDays",
                            event.target.value === "" ? 0 : Number(event.target.value),
                          )
                        }
                      />
                      <div className="sm:col-span-2">
                        <Textarea
                          label="Default payment terms"
                          rows={3}
                          value={draft.paymentTerms}
                          disabled={!canEdit}
                          onChange={(event) => update("paymentTerms", event.target.value)}
                        />
                      </div>
                      <Switch
                        label="Prices include tax"
                        description="Show quotation line prices as tax-inclusive"
                        checked={draft.pricesIncludeTax}
                        disabled={!canEdit}
                        onChange={(event) => update("pricesIncludeTax", event.target.checked)}
                      />
                      <Switch
                        label="Auto-expire quotations"
                        description="Mark quotations expired after the validity period"
                        checked={draft.autoExpireQuotations}
                        disabled={!canEdit}
                        onChange={(event) => update("autoExpireQuotations", event.target.checked)}
                      />
                    </div>
                  </SectionCard>
                )}

                {section === "costing" && (
                  <SectionCard
                    title="Standard costing rates"
                    description="Labour and overtime rates used when manufacturing jobs record actual hours. Hours above a task estimate are Normal OT unless you enter Normal OT and Double OT separately."
                  >
                    <CostingRatesForm readOnly={!canEdit} onSaved={setCostingRates} />
                  </SectionCard>
                )}

                {section === "documents" && (
                  <SectionCard
                    title="Document numbers"
                    description="Prefixes used for new quotations, orders, jobs, and deliveries."
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        label="Quotation prefix"
                        value={draft.quotationPrefix}
                        disabled={!canEdit}
                        hint={`Next: ${documentPreview.quotation}`}
                        onChange={(event) => update("quotationPrefix", event.target.value.toUpperCase())}
                      />
                      <Input
                        label="Sales order prefix"
                        value={draft.salesOrderPrefix}
                        disabled={!canEdit}
                        hint={`Next: ${documentPreview.salesOrder}`}
                        onChange={(event) => update("salesOrderPrefix", event.target.value.toUpperCase())}
                      />
                      <Input
                        label="Production job prefix"
                        value={draft.jobPrefix}
                        disabled={!canEdit}
                        hint={`Next: ${documentPreview.job}`}
                        onChange={(event) => update("jobPrefix", event.target.value.toUpperCase())}
                      />
                      <Input
                        label="Delivery prefix"
                        value={draft.deliveryPrefix}
                        disabled={!canEdit}
                        hint={`Next: ${documentPreview.delivery}`}
                        onChange={(event) => update("deliveryPrefix", event.target.value.toUpperCase())}
                      />
                    </div>
                  </SectionCard>
                )}
              </div>
            </div>
          </div>
        </div>
    </PageContainer>
  );
}
