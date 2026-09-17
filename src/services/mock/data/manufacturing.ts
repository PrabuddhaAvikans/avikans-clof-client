import type {
  ManufacturingJob,
  ManufacturingTask,
  ManufacturingTaskHistoryEntry,
  ManufacturingTaskStatus,
} from "@/types/manufacturing";
import {
  createHistoryEntry,
  isQcOperation,
  isTestingOperation,
  refreshJobDerivedFields,
} from "@/lib/manufacturingTasks";

const ACTOR = { userId: "usr-004", userName: "Nuwan Wickramasinghe" };

type TaskSeed = {
  id: string;
  name: string;
  sequence: number;
  description?: string;
  workstation?: string;
  machineName?: string;
  estimatedHours: number;
  actualHours?: number;
  overtimeHours?: number;
  labourCostRate?: number;
  machineCost?: number;
  status: ManufacturingTaskStatus;
  assignedTo?: string;
  assignedToName?: string;
  operatorId?: string;
  operatorName?: string;
  startedAt?: string;
  completedAt?: string;
  plannedQuantity: number;
  completedQuantity?: number;
  rejectedQuantity?: number;
  reworkQuantity?: number;
  isRequired?: boolean;
  productOperationId?: string;
  prerequisiteTaskIds?: string[];
  notes?: string;
};

function toTask(jobId: string, seed: TaskSeed, index: number): ManufacturingTask {
  const completedQuantity =
    seed.completedQuantity ??
    (seed.status === "completed" ? seed.plannedQuantity : 0);
  return {
    id: seed.id,
    taskNumber: `TASK-${String(index + 1).padStart(3, "0")}`,
    productionJobId: jobId,
    productOperationId: seed.productOperationId,
    sequence: seed.sequence,
    name: seed.name,
    description: seed.description,
    isRequired: seed.isRequired ?? true,
    isEnabled: true,
    isQcTask: isQcOperation(seed),
    isTestingTask: isTestingOperation(seed),
    isRework: false,
    estimatedHours: seed.estimatedHours,
    actualHours: seed.actualHours,
    overtimeHours: seed.overtimeHours,
    labourCostRate: seed.labourCostRate,
    machineName: seed.machineName,
    machineCost: seed.machineCost,
    assignedTo: seed.assignedTo,
    assignedToName: seed.assignedToName,
    operatorId: seed.operatorId ?? seed.assignedTo,
    operatorName: seed.operatorName ?? seed.assignedToName,
    plannedQuantity: seed.plannedQuantity,
    completedQuantity,
    rejectedQuantity: seed.rejectedQuantity ?? 0,
    reworkQuantity: seed.reworkQuantity ?? 0,
    wasteQuantity: 0,
    startedQuantity: seed.status === "in_progress" || seed.status === "completed" ? seed.plannedQuantity : 0,
    status: seed.status,
    startedAt: seed.startedAt,
    completedAt: seed.completedAt,
    notes: seed.notes,
    prerequisiteTaskIds: seed.prerequisiteTaskIds ?? [],
    history: defaultHistory(seed),
    materialsUsed: [],
    workstation: seed.workstation,
  };
}

function defaultHistory(seed: TaskSeed): ManufacturingTaskHistoryEntry[] {
  const createdAt = seed.startedAt ?? seed.completedAt ?? "2025-07-16T10:00:00Z";
  const entries = [
    createHistoryEntry(seed.id, ACTOR, "created", undefined, "pending", "Generated from product version", createdAt),
  ];
  if (seed.status === "ready") {
    entries.push(createHistoryEntry(seed.id, ACTOR, "ready", "pending", "ready", undefined, createdAt));
  }
  if (seed.status === "in_progress" || seed.status === "completed") {
    entries.push(createHistoryEntry(seed.id, ACTOR, "ready", "pending", "ready", undefined, seed.startedAt ?? createdAt));
    entries.push(
      createHistoryEntry(
        seed.id,
        { userId: seed.assignedTo ?? ACTOR.userId, userName: seed.assignedToName ?? ACTOR.userName },
        "started",
        "ready",
        "in_progress",
        undefined,
        seed.startedAt ?? createdAt,
      ),
    );
  }
  if (seed.status === "completed" && seed.completedAt) {
    entries.push(
      createHistoryEntry(
        seed.id,
        { userId: seed.assignedTo ?? ACTOR.userId, userName: seed.assignedToName ?? ACTOR.userName },
        "completed",
        "in_progress",
        "completed",
        undefined,
        seed.completedAt,
      ),
    );
  }
  return entries;
}

function sequentialPrereqs(tasks: ManufacturingTask[]): ManufacturingTask[] {
  return tasks.map((task, index) => {
    if (task.prerequisiteTaskIds.length > 0 || index === 0) return task;
    return { ...task, prerequisiteTaskIds: [tasks[index - 1].id] };
  });
}

type JobSeed = Omit<
  ManufacturingJob,
  | "tasks"
  | "reworks"
  | "progressPercent"
  | "estimatedCost"
  | "actualCost"
  | "productVersionId"
  | "productVersionLabel"
> & {
  productVersionId?: string;
  productVersionLabel?: string;
  taskSeeds: TaskSeed[];
};

function hydrateJob(seed: JobSeed): ManufacturingJob {
  const tasks = sequentialPrereqs(
    seed.taskSeeds.map((task, index) => toTask(seed.id, task, index)),
  );
  return refreshJobDerivedFields({
    ...seed,
    productVersionId: seed.productVersionId ?? `${seed.productId}-ver-1`,
    productVersionLabel: seed.productVersionLabel ?? "V1",
    tasks,
    reworks: [],
    progressPercent: 0,
    estimatedCost: 0,
    actualCost: 0,
  });
}

const auroraTasks = (qty: number): TaskSeed[] => [
  {
    id: "tsk-pj1001-01",
    name: "Cutting",
    sequence: 10,
    description: "Cut aluminium tubes and sheet to size",
    workstation: "Fab Bay 1",
    machineName: "CNC Laser Cutter",
    estimatedHours: 0.5 * qty,
    actualHours: 0.47 * qty,
    labourCostRate: 500,
    machineCost: 200 * qty,
    status: "completed",
    assignedTo: "usr-005",
    assignedToName: "Chaminda Jayasuriya",
    startedAt: "2025-07-20T08:00:00Z",
    completedAt: "2025-07-20T11:30:00Z",
    plannedQuantity: qty,
    completedQuantity: qty,
    productOperationId: "prd-001-op-10",
    prerequisiteTaskIds: [],
  },
  {
    id: "tsk-pj1001-02",
    name: "Bending",
    sequence: 20,
    description: "Form pendant body curvature",
    workstation: "Fab Bay 1",
    machineName: "Press Brake",
    estimatedHours: 0.33 * qty,
    actualHours: 0.42 * qty,
    overtimeHours: 0.09 * qty,
    labourCostRate: 500,
    machineCost: 150 * qty,
    status: "completed",
    assignedTo: "usr-005",
    assignedToName: "Chaminda Jayasuriya",
    startedAt: "2025-07-20T12:00:00Z",
    completedAt: "2025-07-20T16:00:00Z",
    plannedQuantity: qty,
    completedQuantity: qty,
    productOperationId: "prd-001-op-20",
    prerequisiteTaskIds: ["tsk-pj1001-01"],
  },
  {
    id: "tsk-pj1001-03",
    name: "Welding",
    sequence: 30,
    description: "TIG weld body joints",
    workstation: "Welding Bay",
    machineName: "TIG Welder",
    estimatedHours: 0.75 * qty,
    labourCostRate: 650,
    machineCost: 100 * qty,
    status: "in_progress",
    assignedTo: "usr-005",
    assignedToName: "Chaminda Jayasuriya",
    startedAt: "2025-07-21T08:00:00Z",
    plannedQuantity: qty,
    completedQuantity: 6,
    productOperationId: "prd-001-op-30",
    prerequisiteTaskIds: ["tsk-pj1001-02"],
  },
  {
    id: "tsk-pj1001-04",
    name: "Grinding",
    sequence: 40,
    description: "Smooth weld seams and surface prep",
    workstation: "Finishing Bay",
    estimatedHours: 0.33 * qty,
    labourCostRate: 450,
    status: "pending",
    plannedQuantity: qty,
    productOperationId: "prd-001-op-40",
    prerequisiteTaskIds: ["tsk-pj1001-03"],
  },
  {
    id: "tsk-pj1001-05",
    name: "Powder Coating",
    sequence: 50,
    description: "Apply RAL 9005 jet black powder coat",
    workstation: "Coating Line A",
    machineName: "Powder Booth",
    estimatedHours: 2 * qty,
    labourCostRate: 400,
    machineCost: 300 * qty,
    status: "pending",
    plannedQuantity: qty,
    productOperationId: "prd-001-op-50",
    prerequisiteTaskIds: ["tsk-pj1001-04"],
  },
  {
    id: "tsk-pj1001-06",
    name: "Wiring",
    sequence: 60,
    description: "Install LED module, driver and wiring harness",
    workstation: "Assembly Line 2",
    estimatedHours: 0.5 * qty,
    labourCostRate: 550,
    status: "pending",
    plannedQuantity: qty,
    productOperationId: "prd-001-op-60",
    prerequisiteTaskIds: ["tsk-pj1001-05"],
  },
  {
    id: "tsk-pj1001-07",
    name: "Glass Installation",
    sequence: 70,
    description: "Mount opal glass diffuser with silicone gasket",
    workstation: "Assembly Line 2",
    estimatedHours: 0.33 * qty,
    labourCostRate: 500,
    status: "pending",
    plannedQuantity: qty,
    productOperationId: "prd-001-op-70",
    prerequisiteTaskIds: ["tsk-pj1001-05"],
  },
  {
    id: "tsk-pj1001-08",
    name: "Mounting Bracket Installation",
    sequence: 80,
    description: "Attach ceiling canopy and suspension hardware",
    workstation: "Assembly Line 2",
    estimatedHours: 0.25 * qty,
    labourCostRate: 450,
    status: "pending",
    plannedQuantity: qty,
    productOperationId: "prd-001-op-80",
    prerequisiteTaskIds: ["tsk-pj1001-05"],
  },
  {
    id: "tsk-pj1001-09",
    name: "Final Assembly",
    sequence: 90,
    description: "Complete assembly, cable management, label",
    workstation: "Assembly Line 2",
    estimatedHours: 0.5 * qty,
    labourCostRate: 500,
    status: "pending",
    plannedQuantity: qty,
    productOperationId: "prd-001-op-90",
    prerequisiteTaskIds: ["tsk-pj1001-06", "tsk-pj1001-07", "tsk-pj1001-08"],
  },
  {
    id: "tsk-pj1001-10",
    name: "Testing",
    sequence: 100,
    description: "Electrical safety test, burn-in, lumen verification",
    workstation: "Test Lab",
    machineName: "Integrating Sphere",
    estimatedHours: 0.25 * qty,
    labourCostRate: 600,
    machineCost: 50 * qty,
    status: "pending",
    plannedQuantity: qty,
    productOperationId: "prd-001-op-100",
    prerequisiteTaskIds: ["tsk-pj1001-09"],
  },
  {
    id: "tsk-pj1001-11",
    name: "QC",
    sequence: 110,
    description: "Final visual and functional quality check",
    workstation: "QC Station 1",
    estimatedHours: 0.33 * qty,
    labourCostRate: 500,
    status: "pending",
    plannedQuantity: qty,
    productOperationId: "prd-001-op-110",
    prerequisiteTaskIds: ["tsk-pj1001-10"],
  },
];

const rawJobs: JobSeed[] = [
  {
    id: "mj-001",
    jobNumber: "PJ-1001",
    salesOrderId: "so-001",
    salesOrderNumber: "SO-2025-0089",
    customerId: "cus-002",
    customerName: "Haritha Architects",
    productId: "prd-001",
    productSku: "AVK-PND-001",
    productName: "Aurora LED Pendant",
    productVersionId: "prd-001-ver-1",
    productVersionLabel: "V1",
    quantity: 10,
    status: "in_progress",
    priority: "medium",
    taskSeeds: auroraTasks(10),
    materialRequirements: [
      {
        id: "mr-001",
        inventoryItemId: "inv-007",
        inventoryItemSku: "RAW-GLS-SHADE-180",
        inventoryItemName: "Blown Glass Shade 180mm",
        requiredQuantity: 10,
        reservedQuantity: 10,
        issuedQuantity: 10,
        unit: "pcs",
        status: "issued",
      },
      {
        id: "mr-002",
        inventoryItemId: "inv-002",
        inventoryItemSku: "RAW-DRV-24V-60W",
        inventoryItemName: "LED Driver 24V 60W Dimmable",
        requiredQuantity: 10,
        reservedQuantity: 10,
        issuedQuantity: 0,
        unit: "pcs",
        status: "reserved",
      },
    ],
    plannedStartDate: "2025-07-20T08:00:00Z",
    plannedEndDate: "2025-07-28T17:00:00Z",
    actualStartDate: "2025-07-20T08:00:00Z",
    assignedTo: "usr-004",
    assignedToName: "Nuwan Wickramasinghe",
    createdBy: "usr-004",
    createdByName: "Nuwan Wickramasinghe",
    createdAt: "2025-07-16T10:00:00Z",
    updatedAt: "2025-07-21T14:00:00Z",
  },
  {
    id: "mj-002",
    jobNumber: "PJ-1002",
    salesOrderId: "so-002",
    salesOrderNumber: "SO-2025-0075",
    customerId: "cus-006",
    customerName: "Mirissa Coastal Resort",
    productId: "prd-005",
    productSku: "CGO-OUT-005",
    productName: "Coastal Glow Outdoor Lantern",
    quantity: 12,
    status: "completed",
    priority: "medium",
    taskSeeds: [
      { id: "op-005", name: "Metal Fabrication", sequence: 10, workstation: "Fab Bay 2", estimatedHours: 6, actualHours: 5.5, status: "completed", completedAt: "2025-06-20T17:00:00Z", plannedQuantity: 12 },
      { id: "op-006", name: "Powder Coating", sequence: 20, workstation: "Coating Line A", estimatedHours: 3, actualHours: 3, status: "completed", completedAt: "2025-06-22T12:00:00Z", plannedQuantity: 12 },
      { id: "op-007", name: "Assembly & Wiring", sequence: 30, workstation: "Assembly Line 1", estimatedHours: 4, actualHours: 5.5, overtimeHours: 1.5, labourCostRate: 550, status: "completed", completedAt: "2025-06-25T16:00:00Z", plannedQuantity: 12 },
      { id: "op-008", name: "QC", sequence: 40, workstation: "QC Station 1", estimatedHours: 1, actualHours: 1, status: "completed", completedAt: "2025-06-26T10:00:00Z", plannedQuantity: 12 },
    ],
    materialRequirements: [
      {
        id: "mr-003",
        inventoryItemId: "inv-001",
        inventoryItemSku: "RAW-PC-RAL9005",
        inventoryItemName: "Powder Coat RAL 9005 (Jet Black)",
        requiredQuantity: 6,
        reservedQuantity: 6,
        issuedQuantity: 6,
        unit: "kg",
        status: "issued",
      },
    ],
    qualityInspection: {
      id: "qi-001",
      inspectionNumber: "QI-2025-0342",
      inspectorId: "usr-006",
      inspectorName: "Sanduni Rathnayake",
      status: "passed",
      checklistItems: [
        { id: "ci-001", name: "Visual inspection", passed: true },
        { id: "ci-002", name: "IP rating test", passed: true },
        { id: "ci-003", name: "Electrical safety", passed: true },
      ],
      inspectedAt: "2025-06-26T10:00:00Z",
    },
    plannedStartDate: "2025-06-15T08:00:00Z",
    plannedEndDate: "2025-06-28T17:00:00Z",
    actualStartDate: "2025-06-15T08:00:00Z",
    actualEndDate: "2025-06-26T10:00:00Z",
    assignedTo: "usr-004",
    assignedToName: "Nuwan Wickramasinghe",
    createdBy: "usr-004",
    createdByName: "Nuwan Wickramasinghe",
    createdAt: "2025-06-12T09:00:00Z",
    updatedAt: "2025-06-26T10:00:00Z",
  },
  {
    id: "mj-003",
    jobNumber: "PJ-1003",
    salesOrderId: "so-002",
    salesOrderNumber: "SO-2025-0075",
    customerId: "cus-006",
    customerName: "Mirissa Coastal Resort",
    productId: "prd-005",
    productSku: "CGO-OUT-005",
    productName: "Coastal Glow Outdoor Lantern",
    quantity: 8,
    status: "materials_pending",
    priority: "medium",
    taskSeeds: [
      { id: "op-009", name: "Metal Fabrication", sequence: 10, workstation: "Fab Bay 2", estimatedHours: 4, status: "pending", plannedQuantity: 8 },
    ],
    materialRequirements: [
      {
        id: "mr-004",
        inventoryItemId: "inv-001",
        inventoryItemSku: "RAW-PC-RAL9005",
        inventoryItemName: "Powder Coat RAL 9005 (Jet Black)",
        requiredQuantity: 4,
        reservedQuantity: 0,
        issuedQuantity: 0,
        unit: "kg",
        status: "pending",
      },
    ],
    plannedStartDate: "2025-07-25T08:00:00Z",
    plannedEndDate: "2025-08-05T17:00:00Z",
    assignedTo: "usr-004",
    assignedToName: "Nuwan Wickramasinghe",
    createdBy: "usr-004",
    createdByName: "Nuwan Wickramasinghe",
    createdAt: "2025-07-01T09:00:00Z",
    updatedAt: "2025-07-20T11:00:00Z",
  },
  {
    id: "mj-004",
    jobNumber: "PJ-1004",
    salesOrderId: "so-003",
    salesOrderNumber: "SO-2025-0062",
    customerId: "cus-008",
    customerName: "Anjali Premaratne",
    productId: "prd-006",
    productSku: "AMW-CHD-006",
    productName: "Artisan Custom Chandelier",
    quantity: 1,
    status: "in_progress",
    priority: "high",
    taskSeeds: [
      {
        id: "op-010",
        name: "Brass Forging",
        sequence: 10,
        workstation: "Artisan Workshop",
        estimatedHours: 40,
        actualHours: 28,
        status: "in_progress",
        assignedTo: "usr-005",
        assignedToName: "Chaminda Jayasuriya",
        startedAt: "2025-05-15T08:00:00Z",
        plannedQuantity: 1,
        completedQuantity: 0,
      },
      { id: "op-011", name: "Crystal Mounting", sequence: 20, workstation: "Artisan Workshop", estimatedHours: 16, status: "pending", plannedQuantity: 1 },
      { id: "op-012", name: "Final Assembly", sequence: 30, workstation: "Assembly Line 3", estimatedHours: 8, status: "pending", plannedQuantity: 1 },
      { id: "op-012b", name: "QC", sequence: 40, workstation: "QC Station 1", estimatedHours: 2, status: "pending", plannedQuantity: 1 },
    ],
    materialRequirements: [
      {
        id: "mr-005",
        inventoryItemId: "inv-010",
        inventoryItemSku: "RAW-CBL-CHAIN-1M",
        inventoryItemName: "Decorative Chain 1m (Brass)",
        requiredQuantity: 3,
        reservedQuantity: 0,
        issuedQuantity: 0,
        unit: "pcs",
        status: "pending",
      },
    ],
    plannedStartDate: "2025-05-10T08:00:00Z",
    plannedEndDate: "2025-08-30T17:00:00Z",
    actualStartDate: "2025-05-15T08:00:00Z",
    assignedTo: "usr-004",
    assignedToName: "Nuwan Wickramasinghe",
    notes: "Custom crystal drops sourced from Italy - ETA Aug 1.",
    createdBy: "usr-001",
    createdByName: "Prabuddha Jayawardhana",
    createdAt: "2025-05-06T10:00:00Z",
    updatedAt: "2025-07-25T09:00:00Z",
  },
  {
    id: "mj-005",
    jobNumber: "PJ-1005",
    salesOrderId: "so-005",
    salesOrderNumber: "SO-2025-0050",
    customerId: "cus-001",
    customerName: "Colombo Grand Hotel",
    productId: "prd-003",
    productSku: "LMC-CLP-600",
    productName: "LumenCraft Ceiling Panel 600×600",
    quantity: 24,
    status: "completed",
    priority: "high",
    taskSeeds: [
      { id: "op-013", name: "Panel Assembly", sequence: 10, workstation: "Assembly Line 1", estimatedHours: 12, actualHours: 11, status: "completed", completedAt: "2025-04-20T17:00:00Z", plannedQuantity: 24 },
      { id: "op-014", name: "QC", sequence: 20, workstation: "QC Station 2", estimatedHours: 2, actualHours: 2, status: "completed", completedAt: "2025-04-22T12:00:00Z", plannedQuantity: 24 },
    ],
    materialRequirements: [
      {
        id: "mr-006",
        inventoryItemId: "inv-004",
        inventoryItemSku: "RAW-DIFF-OPAL-300",
        inventoryItemName: "Opal Acrylic Diffuser 300mm",
        requiredQuantity: 96,
        reservedQuantity: 96,
        issuedQuantity: 96,
        unit: "pcs",
        status: "issued",
      },
    ],
    qualityInspection: {
      id: "qi-002",
      inspectionNumber: "QI-2025-0289",
      inspectorId: "usr-006",
      inspectorName: "Sanduni Rathnayake",
      status: "passed",
      checklistItems: [
        { id: "ci-004", name: "Lumen output test", passed: true },
        { id: "ci-005", name: "Color consistency", passed: true },
      ],
      inspectedAt: "2025-04-22T12:00:00Z",
    },
    plannedStartDate: "2025-04-05T08:00:00Z",
    plannedEndDate: "2025-04-25T17:00:00Z",
    actualStartDate: "2025-04-05T08:00:00Z",
    actualEndDate: "2025-04-22T12:00:00Z",
    assignedTo: "usr-004",
    assignedToName: "Nuwan Wickramasinghe",
    createdBy: "usr-004",
    createdByName: "Nuwan Wickramasinghe",
    createdAt: "2025-04-02T09:00:00Z",
    updatedAt: "2025-04-22T12:00:00Z",
  },
  {
    id: "mj-006",
    jobNumber: "PJ-1006",
    salesOrderId: "so-001",
    salesOrderNumber: "SO-2025-0089",
    customerId: "cus-002",
    customerName: "Haritha Architects",
    productId: "prd-002",
    productSku: "AVK-WSC-002",
    productName: "Horizon Wall Sconce",
    quantity: 4,
    status: "planned",
    priority: "low",
    taskSeeds: [
      { id: "op-015", name: "Metal Fabrication", sequence: 10, workstation: "Fab Bay 1", estimatedHours: 2, status: "pending", plannedQuantity: 4 },
      { id: "op-015b", name: "QC", sequence: 20, workstation: "QC Station 1", estimatedHours: 0.5, status: "pending", plannedQuantity: 4 },
    ],
    materialRequirements: [
      {
        id: "mr-007",
        inventoryItemId: "inv-003",
        inventoryItemSku: "RAW-ALU-EXTR-40",
        inventoryItemName: "Aluminum Extrusion Profile 40mm",
        requiredQuantity: 4,
        reservedQuantity: 4,
        issuedQuantity: 0,
        unit: "pcs",
        status: "reserved",
      },
    ],
    plannedStartDate: "2025-08-01T08:00:00Z",
    plannedEndDate: "2025-08-05T17:00:00Z",
    assignedTo: "usr-005",
    assignedToName: "Chaminda Jayasuriya",
    createdBy: "usr-004",
    createdByName: "Nuwan Wickramasinghe",
    createdAt: "2025-07-22T10:00:00Z",
    updatedAt: "2025-07-22T10:00:00Z",
  },
  {
    id: "mj-007",
    jobNumber: "PJ-1007",
    salesOrderId: "so-004",
    salesOrderNumber: "SO-2025-0095",
    customerId: "cus-003",
    customerName: "Ranmini Interiors Pvt Ltd",
    productId: "prd-004",
    productSku: "AVK-TRK-004",
    productName: "FlexTrack Spot Light",
    quantity: 16,
    status: "ready_to_start",
    priority: "medium",
    taskSeeds: [
      { id: "op-016", name: "Assembly", sequence: 10, workstation: "Assembly Line 2", estimatedHours: 4, status: "ready", plannedQuantity: 16 },
      { id: "op-016b", name: "QC", sequence: 20, workstation: "QC Station 1", estimatedHours: 1, status: "pending", plannedQuantity: 16 },
    ],
    materialRequirements: [
      {
        id: "mr-008",
        inventoryItemId: "inv-003",
        inventoryItemSku: "RAW-ALU-EXTR-40",
        inventoryItemName: "Aluminum Extrusion Profile 40mm",
        requiredQuantity: 8,
        reservedQuantity: 8,
        issuedQuantity: 8,
        unit: "pcs",
        status: "issued",
      },
    ],
    plannedStartDate: "2025-08-01T08:00:00Z",
    plannedEndDate: "2025-08-04T17:00:00Z",
    assignedTo: "usr-005",
    assignedToName: "Chaminda Jayasuriya",
    createdBy: "usr-004",
    createdByName: "Nuwan Wickramasinghe",
    createdAt: "2025-07-29T09:00:00Z",
    updatedAt: "2025-07-29T09:00:00Z",
  },
];

export const initialManufacturingJobs: ManufacturingJob[] = rawJobs.map(hydrateJob);
