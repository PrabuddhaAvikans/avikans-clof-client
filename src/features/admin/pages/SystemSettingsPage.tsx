import { useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export function SystemSettingsPage() {
  const [companyName, setCompanyName] = useState("AVIKANS SOLUTION");
  const [currency, setCurrency] = useState("LKR");
  const [taxRate, setTaxRate] = useState("15");
  const [quotationValidityDays, setQuotationValidityDays] = useState("30");

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
          label="Default Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          options={[
            { value: "LKR", label: "LKR — Sri Lankan Rupee" },
          ]}
        />
        <Input
          label="Default Tax Rate (%)"
          type="number"
          min={0}
          max={100}
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
        />
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
