import { ListPageShell } from "@/features/shared/components/ListPageShell";

export { ManufacturingJobsPage } from "@/features/manufacturing/pages/ManufacturingJobsPage";
export { ManufacturingJobFormPage } from "@/features/manufacturing/pages/ManufacturingJobFormPage";
export { ManufacturingJobDetailPage } from "@/features/manufacturing/pages/ManufacturingJobDetailPage";
export { QualityInspectionPage } from "@/features/manufacturing/pages/QualityInspectionPage";
export { MaterialRequirementsPage } from "@/features/manufacturing/pages/MaterialRequirementsPage";

export function WorkOrdersPage() {
  return (
    <ListPageShell
      title="Work Orders"
      description="Manage shop floor work orders."
    />
  );
}

export { ReadyToShipPage } from "@/features/manufacturing/pages/ReadyToShipPage";
