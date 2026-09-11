import type {
  CoatingStatusValue,
  CostingRequestStatusValue,
  CostingRiskFlagValue,
} from "@/types/status";

export type CostingAttachmentType = "pdf" | "xlsx" | "zip" | "other";

export type ApprovalLevelStatus = "pending" | "approved" | "rejected" | "waiting";

export type EstimationSourceType = "standard" | "customized";

export interface CostingLineItem {
  id: string;
  description: string;
  category: string;
  baseCost: number;
  percentOfCost: number;
  salesOrderLineItemId?: string;
  sourceType?: EstimationSourceType;
}

export interface EstimationMaterial {
  id: string;
  inventoryItemId: string;
  inventoryItemName: string;
  sku: string;
  quantity: number;
  unit: string;
  wastePercent: number;
  requiredQuantity: number;
  unitCost: number;
  totalCost: number;
  isRequired: boolean;
  alternativeItemId?: string;
  alternativeItemName?: string;
  notes?: string;
  salesOrderLineItemId?: string;
  sourceType?: EstimationSourceType;
  sourceProductName?: string;
  productVersionLabel?: string;
}

export interface CoatingLineItem {
  id: string;
  productId: string;
  productName: string;
  finish: string;
  process: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  salesOrderLineItemId?: string;
  sourceType?: EstimationSourceType;
  productVersionLabel?: string;
  productSku?: string;
}

export interface EstimationProductLine {
  id: string;
  salesOrderLineItemId: string;
  productId: string;
  productSku: string;
  productName: string;
  productVersionId?: string;
  productVersionLabel?: string;
  quantity: number;
  sourceType: EstimationSourceType;
  unitPrice: number;
  estimatedCost: number;
  materialCost: number;
  labourCost: number;
  machineCost: number;
  coatingCost: number;
  overheadCost: number;
  customizationId?: string;
  customizationStatus?: string;
}

export interface CostingAttachment {
  id: string;
  name: string;
  size: number;
  type: CostingAttachmentType;
  url?: string;
}

export interface ApprovalLevel {
  id: string;
  role: string;
  assigneeName: string;
  status: ApprovalLevelStatus;
}

export interface ApprovalHistoryEntry {
  id: string;
  action: string;
  userName: string;
  timestamp: string;
  comment?: string;
}

export interface CostingRequester {
  name: string;
  title: string;
  email: string;
  avatarInitials: string;
}

export interface CostingRequest {
  id: string;
  requestNumber: string;
  customerName: string;
  projectName: string;
  requestType: string;
  requestedDate: string;
  totalEstimate: number;
  proposedPrice: number;
  marginPercent: number;
  targetMargin: number;
  riskFlag: CostingRiskFlagValue;
  slaRemaining: string;
  status: CostingRequestStatusValue;
  coatingStatus: CoatingStatusValue;
  currency: string;
  paymentTerms: string;
  lineItems: CostingLineItem[];
  coatingItems: CoatingLineItem[];
  estimationMaterials: EstimationMaterial[];
  estimationProductLines: EstimationProductLine[];
  attachments: CostingAttachment[];
  notes: string;
  requester: CostingRequester;
  approvalLevels: ApprovalLevel[];
  history: ApprovalHistoryEntry[];
  salesOrderId?: string;
  salesOrderNumber?: string;
  quotationId?: string;
  quotationNumber?: string;
}

export type CostingRequestFilters = {
  status?: CostingRequestStatusValue;
  coatingStatus?: CoatingStatusValue;
  riskFlag?: CostingRiskFlagValue;
  salesOrderId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
