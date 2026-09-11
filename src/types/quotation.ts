import type { Address, Attachment } from "@/types/common";
import type {
  BomItem,
  CostBreakdown,
  ProductOperation,
  ProductSpecifications,
} from "@/types/product";
import type {
  PaymentStatusValue,
  PriorityValue,
  QuotationCustomizationStatusValue,
  QuotationStatusValue,
} from "@/types/status";

export type QuotationContactType =
  | "call"
  | "email"
  | "whatsapp"
  | "meeting"
  | "comment"
  | "follow_up";

export interface QuotationContactEntry {
  id: string;
  type: QuotationContactType;
  summary: string;
  detail?: string;
  contactedBy: string;
  contactedByName: string;
  contactedAt: string;
  outcome?: string;
}

export interface QuotationCustomizationBaseSnapshot {
  productId: string;
  productSku: string;
  productName: string;
  productVersionId: string;
  productVersionLabel: string;
  productVersionNumber: number;
  specifications: ProductSpecifications;
  bom: BomItem[];
  operations: ProductOperation[];
  costBreakdown: CostBreakdown;
  costPrice: number;
  basePrice: number;
}

export interface QuotationCustomizationEstimation {
  costBreakdown: CostBreakdown;
  costPrice: number;
  sellingPrice: number;
  expectedProfit: number;
  marginPercent: number;
  materialRequirementChanged: boolean;
  labourChanged: boolean;
  estimatedAt?: string;
}

export interface QuotationCustomizationApproval {
  required: boolean;
  status: QuotationCustomizationStatusValue;
  requestedAt?: string;
  requestedBy?: string;
  requestedByName?: string;
  decidedAt?: string;
  decidedBy?: string;
  decidedByName?: string;
  notes?: string;
}

export interface QuotationProductCustomization {
  id: string;
  status: QuotationCustomizationStatusValue;
  base: QuotationCustomizationBaseSnapshot;
  customizedSpecifications: ProductSpecifications;
  customizedBom: BomItem[];
  customizedOperations: ProductOperation[];
  estimation: QuotationCustomizationEstimation;
  approval: QuotationCustomizationApproval;
  notes?: string;
  isLocked: boolean;
  promotedProductVersionId?: string;
  history: QuotationCustomizationHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface QuotationCustomizationHistoryEntry {
  id: string;
  at: string;
  by: string;
  byName: string;
  action: string;
  detail?: string;
}

export interface QuotationRevision {
  id: string;
  versionNumber: number;
  label: string;
  isCurrent: boolean;
  isDraft: boolean;
  totalAmount: number;
  currency: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
}

export interface QuotationLineItem {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  description?: string;
  productVersionId?: string;
  productVersionLabel?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
  isCustomized?: boolean;
  customization?: QuotationProductCustomization;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: QuotationStatusValue;
  priority: PriorityValue;
  lineItems: QuotationLineItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  validUntil: string;
  paymentStatus: PaymentStatusValue;
  billingAddress: Address;
  shippingAddress?: Address;
  notes?: string;
  termsAndConditions?: string;
  attachments: Attachment[];
  salesOrderId?: string;
  contactHistory: QuotationContactEntry[];
  revisions: QuotationRevision[];
  createdBy: string;
  createdByName: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}
