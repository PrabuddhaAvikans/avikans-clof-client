import type {
  ManufacturingJobStatusValue,
  PriorityValue,
} from "@/types/status";

export interface Operation {
  id: string;
  name: string;
  sequence: number;
  workstation: string;
  estimatedHours: number;
  actualHours?: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
  assignedTo?: string;
  assignedToName?: string;
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface MaterialRequirement {
  id: string;
  inventoryItemId: string;
  inventoryItemSku: string;
  inventoryItemName: string;
  requiredQuantity: number;
  reservedQuantity: number;
  issuedQuantity: number;
  unit: string;
  status: "pending" | "reserved" | "partial" | "issued";
}

export interface QualityInspection {
  id: string;
  inspectionNumber: string;
  inspectorId: string;
  inspectorName: string;
  status: "pending" | "in_progress" | "passed" | "failed" | "rework";
  checklistItems: {
    id: string;
    name: string;
    passed: boolean | null;
    notes?: string;
  }[];
  inspectedAt?: string;
  notes?: string;
}

export interface ManufacturingJob {
  id: string;
  jobNumber: string;
  salesOrderId: string;
  salesOrderNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productSku: string;
  productName: string;
  quantity: number;
  status: ManufacturingJobStatusValue;
  priority: PriorityValue;
  operations: Operation[];
  materialRequirements: MaterialRequirement[];
  qualityInspection?: QualityInspection;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}
