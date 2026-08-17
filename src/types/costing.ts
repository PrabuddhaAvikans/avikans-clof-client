import type {
  CostingRequestStatusValue,
  CostingRiskFlagValue,
} from "@/types/status";

export type CostingAttachmentType = "pdf" | "xlsx" | "zip" | "other";

export type ApprovalLevelStatus = "pending" | "approved" | "rejected" | "waiting";

export interface CostingLineItem {
  id: string;
  description: string;
  category: string;
  baseCost: number;
  percentOfCost: number;
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
  currency: string;
  paymentTerms: string;
  lineItems: CostingLineItem[];
  attachments: CostingAttachment[];
  notes: string;
  requester: CostingRequester;
  approvalLevels: ApprovalLevel[];
  history: ApprovalHistoryEntry[];
}

export type CostingRequestFilters = {
  status?: CostingRequestStatusValue;
  riskFlag?: CostingRiskFlagValue;
  search?: string;
  page?: number;
  pageSize?: number;
};
