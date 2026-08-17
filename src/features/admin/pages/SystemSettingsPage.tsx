import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { COUNTRY_CONFIG, getCountryConfig } from "@/lib/countryConfig";
import { DEFAULT_COUNTRY } from "@/lib/countries";

const COUNTRY_SETTING_OPTIONS = Object.keys(COUNTRY_CONFIG).map((country) => ({
  value: country,
  label: country,
}));

export function SystemSettingsPage() {
  const [companyName, setCompanyName] = useState("AVIKANS SOLUTION");
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const countryConfig = getCountryConfig(country);
  const [taxRate, setTaxRate] = useState(String(countryConfig.defaultTaxRate));
  const [quotationValidityDays, setQuotationValidityDays] = useState("30");

  const handleCountryChange = (nextCountry: string) => {
    setCountry(nextCountry);
    setTaxRate(String(getCountryConfig(nextCountry).defaultTaxRate));
  };

  const handleSave = () => {
    toast.success("System settings saved");
  };

  return (
    <PageContainer>
      <PageHeader
        title="System Settings"
        description="Configure global application settings."
        breadcrumbs={[{ label: "Administration" }, { label: "Settings" }]}
      />

      <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-border bg-card p-6">
        <Input
          label="Company Name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
        <Select
          label="Operating Country"
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
          options={COUNTRY_SETTING_OPTIONS}
        />
        <Input
          label="Default Currency"
          value={countryConfig.currency}
          disabled
          hint="Derived from country configuration"
        />
        <Input
          label={`Default ${countryConfig.taxName} Rate (%)`}
          type="number"
          min={0}
          max={100}
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Tax display:{" "}
          {countryConfig.taxComponents.map((c) => c.code).join(" + ")}
        </p>
        <Input
          label="Quotation Validity (days)"
          type="number"
          min={1}
          value={quotationValidityDays}
          onChange={(e) => setQuotationValidityDays(e.target.value)}
        />
        <Button variant="primary" leftIcon={<Save className="h-4 w-4" />} onClick={handleSave}>
          Save Settings
        </Button>
      </div>
    </PageContainer>
  );
}
