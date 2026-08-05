import { useMemo } from "react";
import { Link } from "react-router-dom";
import { type ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, PackageSearch } from "lucide-react";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContent } from "@/components/feedback/PageStates";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/tables/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SummaryCard } from "@/components/ui/SummaryCard";
import { useManufacturingJobs } from "@/features/manufacturing/hooks/useManufacturing";
import { formatNumber } from "@/lib/format";

interface AggregatedMaterial {
  inventoryItemId: string;
  inventoryItemSku: string;
  inventoryItemName: string;
  unit: string;
  totalRequired: number;
  totalReserved: number;
  totalIssued: number;
  jobCount: number;
  shortage: number;
}

export function MaterialRequirementsPage() {
  const { data, isLoading, error, refetch } = useManufacturingJobs({
    page: 1,
    pageSize: 100,
  });

  const activeJobs = useMemo(
    () =>
      (data?.items ?? []).filter(
        (job) => job.status !== "completed" && job.status !== "cancelled",
      ),
    [data?.items],
  );

  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedMaterial>();
    for (const job of activeJobs) {
      for (const mr of job.materialRequirements) {
        const existing = map.get(mr.inventoryItemId);
        if (existing) {
          existing.totalRequired += mr.requiredQuantity;
          existing.totalReserved += mr.reservedQuantity;
          existing.totalIssued += mr.issuedQuantity;
          existing.jobCount += 1;
          existing.shortage = Math.max(
            0,
            existing.totalRequired - existing.totalReserved - existing.totalIssued,
          );
        } else {
          map.set(mr.inventoryItemId, {
            inventoryItemId: mr.inventoryItemId,
            inventoryItemSku: mr.inventoryItemSku,
            inventoryItemName: mr.inventoryItemName,
            unit: mr.unit,
            totalRequired: mr.requiredQuantity,
            totalReserved: mr.reservedQuantity,
            totalIssued: mr.issuedQuantity,
            jobCount: 1,
            shortage: Math.max(
              0,
              mr.requiredQuantity - mr.reservedQuantity - mr.issuedQuantity,
            ),
          });
        }
      }
    }
    return [...map.values()].sort((a, b) => b.shortage - a.shortage);
  }, [activeJobs]);

  const shortageCount = aggregated.filter((m) => m.shortage > 0).length;
  const totalMaterials = aggregated.length;

  const columns = useMemo<ColumnDef<AggregatedMaterial>[]>(
    () => [
      {
        id: "sku",
        accessorKey: "inventoryItemSku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.inventoryItemSku}</span>
        ),
      },
      {
        id: "name",
        accessorKey: "inventoryItemName",
        header: "Material",
      },
      {
        id: "required",
        header: "Total Required",
        cell: ({ row }) =>
          `${formatNumber(row.original.totalRequired)} ${row.original.unit}`,
      },
      {
        id: "reserved",
        header: "Reserved",
        cell: ({ row }) =>
          `${formatNumber(row.original.totalReserved)} ${row.original.unit}`,
      },
      {
        id: "issued",
        header: "Issued",
        cell: ({ row }) =>
          `${formatNumber(row.original.totalIssued)} ${row.original.unit}`,
      },
      {
        id: "jobs",
        accessorKey: "jobCount",
        header: "Jobs",
      },
      {
        id: "shortage",
        header: "Shortage",
        cell: ({ row }) =>
          row.original.shortage > 0 ? (
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <StatusBadge variant="warning" size="sm">
                {formatNumber(row.original.shortage)} {row.original.unit}
              </StatusBadge>
            </div>
          ) : (
            <StatusBadge variant="success" size="sm">
              OK
            </StatusBadge>
          ),
      },
    ],
    [],
  );

  return (
    <PageContainer maxWidth="wide">
      <PageHeader
        title="Material Requirements"
        description="Aggregated material needs across active manufacturing jobs."
        breadcrumbs={[
          { label: "Manufacturing", href: ROUTES.manufacturing.jobs },
          { label: "Material Requirements" },
        ]}
        actions={
          <Link to={ROUTES.manufacturing.jobs}>
            <StatusBadge variant="neutral">View Jobs</StatusBadge>
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Active Jobs"
          value={activeJobs.length}
          icon={<PackageSearch className="h-5 w-5" />}
        />
        <SummaryCard title="Unique Materials" value={totalMaterials} />
        <SummaryCard
          title="Shortages"
          value={shortageCount}
          description={shortageCount > 0 ? "Materials need attention" : "All materials covered"}
        />
      </div>

      <PageContent
        isLoading={isLoading}
        error={error ? "Failed to load material requirements" : null}
        onRetry={() => void refetch()}
        isEmpty={!isLoading && aggregated.length === 0}
        emptyTitle="No material requirements"
        loadingVariant="table"
      >
        <DataTable data={aggregated} columns={columns} getRowId={(row) => row.inventoryItemId} />
      </PageContent>
    </PageContainer>
  );
}
