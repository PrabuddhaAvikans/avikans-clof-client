import { useEffect, useMemo, useState } from "react";
import { useFormikContext } from "formik";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, Play } from "lucide-react";
import { toast } from "@/components/feedback/toast";
import { ROUTES } from "@/app/config/routes";
import { PageHeader } from "@/components/feedback/PageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { FormikForm, DynamicForm } from "@/components/forms";
import { Button } from "@/components/ui/Button";
import { ConfirmationDialog } from "@/components/ui/ConfirmationDialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createManufacturingJobFormSections } from "@/features/manufacturing/forms/manufacturingJobFormFields";
import {
  manufacturingJobFormSchema,
  type ManufacturingJobFormValues,
} from "@/features/manufacturing/schemas/manufacturingJobSchema";
import {
  useCreateManufacturingJob,
  useReserveMaterials,
  useStartManufacturingJob,
} from "@/features/manufacturing/hooks/useManufacturing";
import { useSalesOrders } from "@/features/sales/hooks/useSalesOrders";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useUsers } from "@/features/admin/hooks/useUsers";
import { formatDate } from "@/lib/format";
import { formatDurationHours } from "@/lib/manufacturingTasks";
import type { MaterialRequirement } from "@/types/manufacturing";
import { Priority, type PriorityValue } from "@/types/status";

const PRIORITY_OPTIONS = Object.keys(Priority).map((value) => ({
  value,
  label: Priority[value as PriorityValue].label,
}));

const defaultValues: ManufacturingJobFormValues = {
  salesOrderId: "",
  productId: "",
  quantity: 1,
  priority: "medium",
  plannedStartDate: "",
  plannedEndDate: "",
  assignedTo: "",
  notes: "",
};

function MaterialPreviewSync({
  onPreviewChange,
  onTasksChange,
}: {
  onPreviewChange: (preview: MaterialRequirement[]) => void;
  onTasksChange: (tasks: { sequence: number; name: string; isRequired: boolean; estimatedHours: number; dependsOn: string }[]) => void;
}) {
  const { values } = useFormikContext<ManufacturingJobFormValues>();
  const { data: products } = useProducts({ page: 1, pageSize: 50 });

  const selectedProduct = products?.items.find((p) => p.id === values.productId);

  useEffect(() => {
    if (!selectedProduct) {
      onPreviewChange([]);
      onTasksChange([]);
      return;
    }
    onPreviewChange(
      selectedProduct.bom.map((bom, index) => ({
        id: `preview-${index}`,
        inventoryItemId: bom.inventoryItemId,
        inventoryItemSku: bom.sku,
        inventoryItemName: bom.inventoryItemName,
        requiredQuantity: (bom.requiredQuantity ?? bom.quantity) * values.quantity,
        reservedQuantity: 0,
        issuedQuantity: 0,
        unit: bom.unit,
        status: "pending" as const,
      })),
    );
    const ops = selectedProduct.operations.filter((op) => op.isEnabled !== false);
    onTasksChange(
      ops.map((op) => ({
        sequence: op.sequence,
        name: op.name,
        isRequired: op.isRequired !== false,
        estimatedHours: op.estimatedHours * values.quantity,
        dependsOn: (op.prerequisiteOperationIds ?? [])
          .map((id) => ops.find((item) => item.id === id)?.name)
          .filter(Boolean)
          .join(", "),
      })),
    );
  }, [selectedProduct, values.quantity, onPreviewChange, onTasksChange]);

  return null;
}

function ManufacturingJobFormFields({ disabled }: { disabled: boolean }) {
  const { data: salesOrders } = useSalesOrders({ page: 1, pageSize: 50 });
  const { data: products } = useProducts({ page: 1, pageSize: 50 });
  const { data: users } = useUsers({ page: 1, pageSize: 50 });

  const sections = useMemo(
    () =>
      createManufacturingJobFormSections({
        disabled,
        salesOrderOptions: (salesOrders?.items ?? []).map((o) => ({
          value: o.id,
          label: `${o.orderNumber} - ${o.customerName}`,
        })),
        productOptions: (products?.items ?? []).map((p) => ({
          value: p.id,
          label: `${p.sku} - ${p.name}`,
        })),
        assigneeOptions: (users?.items ?? []).map((u) => ({
          value: u.id,
          label: u.displayName,
        })),
        priorityOptions: PRIORITY_OPTIONS,
      }),
    [disabled, salesOrders?.items, products?.items, users?.items],
  );

  return <DynamicForm sections={sections} columns={1} />;
}

export function ManufacturingJobFormPage() {
  const navigate = useNavigate();
  const createJob = useCreateManufacturingJob();
  const reserveMaterials = useReserveMaterials();
  const startJob = useStartManufacturingJob();

  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [materialPreview, setMaterialPreview] = useState<MaterialRequirement[]>([]);
  const [taskPreview, setTaskPreview] = useState<
    { sequence: number; name: string; isRequired: boolean; estimatedHours: number; dependsOn: string }[]
  >([]);
  const [overrideStart, setOverrideStart] = useState(false);
  const [startDialogOpen, setStartDialogOpen] = useState(false);

  const handleCreate = async (values: ManufacturingJobFormValues) => {
    try {
      const job = await createJob.mutateAsync({
        salesOrderId: values.salesOrderId,
        productId: values.productId,
        quantity: values.quantity,
        priority: values.priority,
        plannedStartDate: new Date(values.plannedStartDate).toISOString(),
        plannedEndDate: new Date(values.plannedEndDate).toISOString(),
        assignedTo: values.assignedTo || undefined,
        notes: values.notes || undefined,
      });
      toast.success(`Job ${job.jobNumber} created`);
      setCreatedJobId(job.id);
      setMaterialPreview(job.materialRequirements);
    } catch {
      toast.error("Failed to create job");
    }
  };

  const handleReserve = async () => {
    if (!createdJobId) {
      toast.error("Create the job first");
      return;
    }
    try {
      const job = await reserveMaterials.mutateAsync(createdJobId);
      toast.success("Materials reserved successfully");
      setMaterialPreview(job.materialRequirements);
    } catch {
      toast.error("Failed to reserve materials");
    }
  };

  const handleStart = async () => {
    if (!createdJobId) return;
    const materialsReady = materialPreview.every(
      (mr) => mr.reservedQuantity >= mr.requiredQuantity || mr.status === "issued",
    );
    if (!materialsReady && !overrideStart) {
      setStartDialogOpen(true);
      return;
    }
    try {
      await startJob.mutateAsync(createdJobId);
      toast.success("Job started successfully");
      navigate(ROUTES.manufacturing.jobDetail(createdJobId));
    } catch {
      toast.error("Failed to start job");
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Create Production Job"
        description="Create a production job. Manufacturing tasks are generated from the approved product version."
        breadcrumbs={[
          { label: "Manufacturing", href: ROUTES.manufacturing.jobs },
          { label: "Jobs", href: ROUTES.manufacturing.jobs },
          { label: "Create" },
        ]}
        actions={
          <Link to={ROUTES.manufacturing.jobs}>
            <Button variant="outline" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Jobs
            </Button>
          </Link>
        }
      />

      <FormikForm<ManufacturingJobFormValues>
        initialValues={defaultValues}
        validationSchema={manufacturingJobFormSchema}
        onSubmit={handleCreate}
      >
        {(formik) => (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 rounded-lg border border-border bg-card p-6 lg:col-span-1">
              <MaterialPreviewSync onPreviewChange={setMaterialPreview} onTasksChange={setTaskPreview} />
              <ManufacturingJobFormFields disabled={Boolean(createdJobId)} />
              {!createdJobId && (
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={formik.isSubmitting || createJob.isPending}
                >
                  Create Job
                </Button>
              )}
            </div>

            <div className="space-y-4 lg:col-span-2">
              <TaskPreviewPanel tasks={taskPreview} />
              <MaterialRequirementsPanel
                materialPreview={materialPreview}
                createdJobId={createdJobId}
                plannedStartDate={formik.values.plannedStartDate}
                plannedEndDate={formik.values.plannedEndDate}
              />

              {createdJobId && (
                <div className="flex flex-wrap gap-3 rounded-lg border border-border bg-muted/30 p-4">
                  <Button
                    variant="outline"
                    leftIcon={<Package className="h-4 w-4" />}
                    loading={reserveMaterials.isPending}
                    onClick={() => void handleReserve()}
                  >
                    Reserve Materials
                  </Button>
                  <Button
                    variant="primary"
                    leftIcon={<Play className="h-4 w-4" />}
                    loading={startJob.isPending}
                    onClick={() => void handleStart()}
                  >
                    Start Job
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </FormikForm>

      <ConfirmationDialog
        open={startDialogOpen}
        onClose={() => {
          setStartDialogOpen(false);
          setOverrideStart(false);
        }}
        onConfirm={() => {
          setOverrideStart(true);
          setStartDialogOpen(false);
          void handleStart();
        }}
        title="Start Without Materials?"
        description="Materials are not fully reserved. Confirm override to start the job anyway."
        confirmLabel="Override & Start"
        variant="danger"
      />
    </PageContainer>
  );
}

function TaskPreviewPanel({
  tasks,
}: {
  tasks: { sequence: number; name: string; isRequired: boolean; estimatedHours: number; dependsOn: string }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="mb-4 text-sm font-semibold text-foreground">Manufacturing Tasks</h2>
      {tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Select a product to preview tasks from its approved product version operations.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4">Seq</th>
                <th className="pb-2 pr-4">Task</th>
                <th className="pb-2 pr-4">Required</th>
                <th className="pb-2 pr-4">Depends on</th>
                <th className="pb-2 pr-4 text-right">Est. Time</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={`${task.sequence}-${task.name}`} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4 font-mono text-xs">{task.sequence}</td>
                  <td className="py-2.5 pr-4">{task.name}</td>
                  <td className="py-2.5 pr-4">{task.isRequired ? "Yes" : "Optional"}</td>
                  <td className="py-2.5 pr-4 text-muted-foreground">{task.dependsOn || "-"}</td>
                  <td className="py-2.5 pr-4 text-right">{formatDurationHours(task.estimatedHours)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MaterialRequirementsPanel({
  materialPreview,
  createdJobId,
  plannedStartDate,
  plannedEndDate,
}: {
  materialPreview: MaterialRequirement[];
  createdJobId: string | null;
  plannedStartDate: string;
  plannedEndDate: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Material Requirements</h2>
        </div>
        {createdJobId && (
          <StatusBadge variant="info" size="sm">
            Job Created
          </StatusBadge>
        )}
      </div>

      {materialPreview.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Select a product to preview material requirements from its BOM.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-4">SKU</th>
                <th className="pb-2 pr-4">Material</th>
                <th className="pb-2 pr-4 text-right">Required</th>
                <th className="pb-2 pr-4 text-right">Reserved</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {materialPreview.map((mr) => (
                <tr key={mr.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4 font-mono text-xs">{mr.inventoryItemSku}</td>
                  <td className="py-2.5 pr-4">{mr.inventoryItemName}</td>
                  <td className="py-2.5 pr-4 text-right">
                    {mr.requiredQuantity} {mr.unit}
                  </td>
                  <td className="py-2.5 pr-4 text-right">
                    {mr.reservedQuantity} {mr.unit}
                  </td>
                  <td className="py-2.5">
                    <StatusBadge
                      variant={
                        mr.status === "issued" || mr.status === "reserved"
                          ? "success"
                          : mr.reservedQuantity < mr.requiredQuantity
                            ? "warning"
                            : "neutral"
                      }
                      size="sm"
                    >
                      {mr.status}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {plannedStartDate && plannedEndDate && (
        <p className="mt-4 text-xs text-muted-foreground">
          Planned: {formatDate(plannedStartDate)} - {formatDate(plannedEndDate)}
        </p>
      )}
    </div>
  );
}
